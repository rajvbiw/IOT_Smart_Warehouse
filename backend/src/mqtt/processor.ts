import mqtt from 'mqtt';
import { influxService } from '../services/influx.service';
import { redisService } from '../services/redis.service';
import { alertService } from '../services/alert.service';
import { socketService } from '../services/socket.service';
import { Device } from '../models';
import { Point } from '@influxdata/influxdb-client';

const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';

class MQTTProcessor {
  private client: mqtt.MqttClient | null = null;

  public connect(): void {
    console.log(`Connecting to MQTT Broker at: ${brokerUrl}`);
    this.client = mqtt.connect(brokerUrl, {
      reconnectPeriod: 5000,
      connectTimeout: 30 * 1000,
    });

    this.client.on('connect', () => {
      console.log('Connected to MQTT broker.');
      this.subscribe();
    });

    this.client.on('message', async (topic, message) => {
      await this.handleMessage(topic, message.toString());
    });

    this.client.on('error', (err) => {
      console.error('MQTT error:', err);
    });

    this.client.on('close', () => {
      console.log('MQTT connection closed.');
    });
  }

  private subscribe(): void {
    const topicPattern = 'warehouse/+/device/+/telemetry';
    this.client?.subscribe(topicPattern, (err) => {
      if (err) {
        console.error(`Failed to subscribe to ${topicPattern}:`, err);
      } else {
        console.log(`Subscribed to topic pattern: ${topicPattern}`);
      }
    });
  }

  private async handleMessage(topic: string, rawPayload: string): Promise<void> {
    try {
      const payload = JSON.parse(rawPayload);
      
      // Validation check
      const {
        device_uid,
        metric,
        value,
        battery_level,
        signal_strength,
        warehouse_id,
        zone_id,
      } = payload;

      if (!device_uid || !metric || value === undefined || !warehouse_id) {
        console.warn('Skipping invalid MQTT payload:', rawPayload);
        return;
      }

      const parsedWarehouseId = parseInt(warehouse_id, 10);
      const parsedZoneId = parseInt(zone_id, 10);
      const numericValue = parseFloat(value);
      const numericBattery = parseFloat(battery_level || '100');
      const numericSignal = parseInt(signal_strength || '-50', 10);
      const timestamp = payload.timestamp ? new Date(payload.timestamp) : new Date();

      // 1. Write to InfluxDB (sensor_readings measurement)
      const writeApi = influxService.getWriteApi();
      const point = new Point('sensor_readings')
        .tag('device_uid', device_uid)
        .tag('device_type', metric) // metric types map to device type in schema
        .tag('warehouse_id', parsedWarehouseId.toString())
        .tag('zone_id', parsedZoneId.toString())
        .floatField('value', numericValue)
        .floatField('battery_level', numericBattery)
        .intField('signal_strength', numericSignal)
        .timestamp(timestamp);
      
      writeApi.writePoint(point);
      // Flux writes are async; flush will run periodically, or we can force flush on ingestion
      // We don't block the MQTT loop on waitApi.flush() for performance.

      // 2. Update Redis Cache
      const redisPayload = {
        device_uid,
        metric,
        value: numericValue,
        battery_level: numericBattery,
        signal_strength: numericSignal,
        timestamp,
        warehouse_id: parsedWarehouseId,
        zone_id: parsedZoneId,
      };
      await redisService.setLatestReading(device_uid, redisPayload, 120);

      // 3. Update Device details in MySQL database
      await Device.update(
        {
          battery_level: numericBattery,
          signal_strength: numericSignal,
          status: 'online',
          last_seen_at: timestamp,
        },
        {
          where: { device_uid },
        }
      );

      // 4. Evaluate alert rules
      await alertService.checkTelemetry({
        device_uid,
        metric,
        value: numericValue,
        timestamp,
        warehouse_id: parsedWarehouseId,
        zone_id: parsedZoneId,
      });

      // 5. Emit Socket.io event sensor_update to the warehouse room
      socketService.emitToWarehouse(parsedWarehouseId, 'sensor_update', {
        device_uid,
        metric,
        value: numericValue,
        timestamp,
        zone_id: parsedZoneId,
      });

    } catch (err) {
      console.error(`Failed to process MQTT message from topic ${topic}:`, err);
    }
  }

  public disconnect(): void {
    if (this.client) {
      this.client.end();
      this.client = null;
    }
  }
}

export const mqttProcessor = new MQTTProcessor();
export default mqttProcessor;
