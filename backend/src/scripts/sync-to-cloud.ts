import { influxService } from '../services/influx.service';
import mqtt from 'mqtt';

const cloudBrokerUrl = process.env.AWS_IOT_ENDPOINT 
  ? `mqtts://${process.env.AWS_IOT_ENDPOINT}:8883` 
  : 'mqtt://localhost:1883'; // Fallback to local in dev

async function syncToCloud() {
  console.log('Starting Edge → Cloud Telemetry Sync Process...');

  // 1. Query local InfluxDB for readings in the last 5 minutes
  const query = `
    from(bucket: "${influxService.getBucket()}")
      |> range(start: -5m)
      |> filter(fn: (r) => r["_measurement"] == "sensor_readings")
  `;

  try {
    const rows = await influxService.query(query);
    if (rows.length === 0) {
      console.log('No local telemetry found in the last 5 minutes to sync.');
      return;
    }

    console.log(`Found ${rows.length} local telemetry points to sync.`);

    // 2. Connect to Cloud Broker (AWS IoT Core)
    const client = mqtt.connect(cloudBrokerUrl, {
      connectTimeout: 15 * 1000,
      reconnectPeriod: 0, // Don't auto-reconnect, cronjob exit
    });

    return new Promise<void>((resolve, reject) => {
      client.on('connect', () => {
        console.log('Connected to Cloud IoT Core endpoint for synchronization.');

        let publishedCount = 0;
        rows.forEach((row) => {
          const payload = {
            device_uid: row.device_uid,
            metric: row.device_type,
            value: row._value,
            battery_level: row.battery_level || 100.0,
            signal_strength: row.signal_strength || -50,
            timestamp: row._time,
            warehouse_id: parseInt(row.warehouse_id, 10),
            zone_id: parseInt(row.zone_id, 10),
          };

          const topic = `warehouse/${payload.warehouse_id}/device/${payload.device_uid}/telemetry`;
          
          client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
            if (err) {
              console.error(`Failed to sync payload to cloud on ${topic}:`, err);
            } else {
              publishedCount++;
            }

            if (publishedCount === rows.length) {
              console.log(`Sync completed. Successfully pushed ${publishedCount} points to cloud.`);
              client.end();
              resolve();
            }
          });
        });

        // Fail-safe timeout if some pub callbacks don't return
        setTimeout(() => {
          console.log(`Sync timeout. Pushed ${publishedCount}/${rows.length} points.`);
          client.end();
          resolve();
        }, 10000);
      });

      client.on('error', (err) => {
        console.error('MQTT Cloud Sync connection error:', err);
        client.end();
        reject(err);
      });
    });

  } catch (err) {
    console.error('Failed to query local InfluxDB or execute sync:', err);
    throw err;
  }
}

// Execute if run directly
if (require.main === module) {
  syncToCloud()
    .then(() => {
      console.log('Edge Sync Job completed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Edge Sync Job failed:', err);
      process.exit(1);
    });
}
