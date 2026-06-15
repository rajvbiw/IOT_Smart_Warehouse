import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cron from 'node-cron';
import { Op } from 'sequelize';

// Services, Database, Processor
import routes from './routes';
import { sequelize, Device } from './models';
import { socketService } from './services/socket.service';
import { redisService } from './services/redis.service';
import { influxService } from './services/influx.service';
import { mqttProcessor } from './mqtt/processor';
import { telemetrySimulator } from './mqtt/simulator';
import { apiLimiter } from './middleware/rateLimiter.middleware';

const app = express();
const httpServer = http.createServer(app);

const PORT = process.env.PORT || 5000;
const corsOrigin = process.env.SOCKET_CORS_ORIGIN || '*';

// Standard Production Middlewares
app.use(helmet());
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting to all requests
app.use('/api', apiLimiter);

// Mount main routing
app.use('/api', routes);

// Liveness Check
app.get('/health', (req, res) => {
  return res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Track readiness state
let isReady = false;

// Readiness Check: Checks MySQL, Redis and InfluxDB connections
app.get('/ready', async (req, res) => {
  if (!isReady) {
    return res.status(503).json({ status: 'not_ready', message: 'Services still initializing' });
  }
  try {
    await sequelize.authenticate();
    await redisService.getClient().ping();
    const query = `buckets()`;
    await influxService.query(query);
    return res.status(200).json({
      status: 'ready',
      database: 'connected',
      cache: 'connected',
      timeseries: 'connected',
    });
  } catch (err: any) {
    console.error('Readiness probe failed:', err.message);
    return res.status(500).json({
      status: 'error',
      message: err.message || 'Services unhealthy',
    });
  }
});

// Initialize Socket.io
socketService.init(httpServer, corsOrigin);

// Scheduled Cron Job: Heartbeat check every 30 seconds
cron.schedule('*/30 * * * * *', async () => {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  try {
    const offlineDevices = await Device.findAll({
      where: {
        status: { [Op.ne]: 'offline' },
        [Op.or]: [
          { last_seen_at: { [Op.lt]: fiveMinAgo } },
          { last_seen_at: null },
        ],
      },
    });

    for (const dev of offlineDevices) {
      await dev.update({ status: 'offline' });
      console.log(`[Heartbeat Cron] Device marked OFFLINE: ${dev.device_uid}`);
      socketService.emitToWarehouse(dev.warehouse_id, 'device_status_change', {
        device_uid: dev.device_uid,
        status: 'offline',
        last_seen_at: dev.last_seen_at,
      });
    }

    const warehouses = [1, 2];
    for (const wId of warehouses) {
      const devices = await Device.findAll({ where: { warehouse_id: wId } });
      const online_count = devices.filter((d) => d.status === 'online').length;
      const offline_count = devices.filter((d) => d.status === 'offline').length;
      socketService.emitToWarehouse(wId, 'heartbeat', { online_count, offline_count, timestamp: new Date() });
    }
  } catch (err) {
    console.error('Heartbeat check cron job failed:', err);
  }
});

// Retry helper
async function retryAsync(fn: () => Promise<void>, name: string, retries = 10, delayMs = 5000): Promise<void> {
  for (let i = 1; i <= retries; i++) {
    try {
      await fn();
      console.log(`[Bootstrap] ${name} connected successfully.`);
      return;
    } catch (err: any) {
      console.error(`[Bootstrap] ${name} attempt ${i}/${retries} failed: ${err.message}`);
      if (i < retries) await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw new Error(`[Bootstrap] ${name} failed after ${retries} retries.`);
}

// Bootstrapping the entire application
async function bootstrap() {
  // 1. Start HTTP server FIRST so liveness probe passes immediately
  await new Promise<void>((resolve) => {
    httpServer.listen(PORT, () => {
      console.log(`Smart Warehouse REST & WebSocket Server running on port ${PORT}`);
      resolve();
    });
  });

  // 2. Connect to MySQL with retries (non-blocking startup)
  try {
    await retryAsync(async () => {
      await sequelize.authenticate();
      console.log('DB_HOST =', process.env.DB_HOST);
      await sequelize.sync();
      console.log('MySQL Database synchronized.');
    }, 'MySQL', 12, 5000);
  } catch (err) {
    console.error('[Bootstrap] MySQL connection permanently failed. Check DB_HOST and credentials.');
    // Don't exit - keep server running so probe works, but mark not ready
    return;
  }

  // 3. Start MQTT Subscriber Processor
  mqttProcessor.connect();

  // 4. Start Telemetry Simulator if enabled
  if (process.env.SIMULATE_DEVICES !== 'false') {
    telemetrySimulator.start();
  }

  // 5. Mark service as ready
  isReady = true;
  console.log('[Bootstrap] All services ready!');
}

bootstrap().catch((err) => {
  console.error('Unhandled bootstrap error:', err);
  // Don't exit - keep server alive so Kubernetes can collect logs
});
