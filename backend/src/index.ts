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

// Readiness Check: Checks MySQL, Redis and InfluxDB connections
app.get('/ready', async (req, res) => {
  try {
    // 1. MySQL check
    await sequelize.authenticate();

    // 2. Redis check
    await redisService.getClient().ping();

    // 3. InfluxDB check
    const query = `buckets()`;
    await influxService.query(query);

    return res.status(200).json({
      status: 'ready',
      database: 'connected',
      cache: 'connected',
      timeseries: 'connected',
    });
  } catch (err: any) {
    console.error('Readiness probe failed:', err);
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

      // Emit real-time status change socket event
      socketService.emitToWarehouse(dev.warehouse_id, 'device_status_change', {
        device_uid: dev.device_uid,
        status: 'offline',
        last_seen_at: dev.last_seen_at,
      });
    }

    // Compile dynamic real-time metrics overview counts
    const warehouses = [1, 2];
    for (const wId of warehouses) {
      const devices = await Device.findAll({ where: { warehouse_id: wId } });
      const online_count = devices.filter((d) => d.status === 'online').length;
      const offline_count = devices.filter((d) => d.status === 'offline').length;

      socketService.emitToWarehouse(wId, 'heartbeat', {
        online_count,
        offline_count,
        timestamp: new Date(),
      });
    }

  } catch (err) {
    console.error('Heartbeat check cron job failed:', err);
  }
});

// Bootstrapping the entire application
async function bootstrap() {
  try {
    // 1. Sync MySQL tables
    await sequelize.sync();
    console.log('MySQL Database synchronized.');

    // 2. Start MQTT Subscriber Processor
    mqttProcessor.connect();

    // 3. Start Telemetry Simulator if enabled (defaults to true for dev mode)
    if (process.env.SIMULATE_DEVICES !== 'false') {
      telemetrySimulator.start();
    }

    // 4. Start HTTP Express Server
    httpServer.listen(PORT, () => {
      console.log(`Smart Warehouse REST & WebSocket Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to bootstrap warehouse server:', err);
    process.exit(1);
  }
}

bootstrap();
