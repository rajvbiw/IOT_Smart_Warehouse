import mqtt from 'mqtt';

const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';

interface SimulatedDevice {
  device_uid: string;
  metric: string; // temperature, humidity, stock_level, motion, door, fire
  warehouse_id: number;
  zone_id: number;
  minVal: number;
  maxVal: number;
}

// 24 devices matching MySQL seed data
const simulatedDevices: SimulatedDevice[] = [
  // Mumbai General Warehouse (w_id: 1)
  { device_uid: 'mum-temp-01', metric: 'temperature', warehouse_id: 1, zone_id: 1, minVal: 18.0, maxVal: 25.0 },
  { device_uid: 'mum-hum-01', metric: 'humidity', warehouse_id: 1, zone_id: 1, minVal: 40.0, maxVal: 60.0 },
  { device_uid: 'mum-stock-01', metric: 'stock_level', warehouse_id: 1, zone_id: 1, minVal: 20.0, maxVal: 100.0 },
  
  { device_uid: 'mum-temp-02', metric: 'temperature', warehouse_id: 1, zone_id: 2, minVal: 18.0, maxVal: 25.0 },
  { device_uid: 'mum-hum-02', metric: 'humidity', warehouse_id: 1, zone_id: 2, minVal: 40.0, maxVal: 60.0 },
  { device_uid: 'mum-stock-02', metric: 'stock_level', warehouse_id: 1, zone_id: 2, minVal: 20.0, maxVal: 100.0 },

  { device_uid: 'mum-mot-01', metric: 'motion', warehouse_id: 1, zone_id: 3, minVal: 0, maxVal: 1 },
  { device_uid: 'mum-door-01', metric: 'door', warehouse_id: 1, zone_id: 3, minVal: 0, maxVal: 1 },
  { device_uid: 'mum-fire-01', metric: 'fire', warehouse_id: 1, zone_id: 3, minVal: 0, maxVal: 0 },

  { device_uid: 'mum-temp-haz', metric: 'temperature', warehouse_id: 1, zone_id: 4, minVal: 12.0, maxVal: 22.0 },
  { device_uid: 'mum-hum-haz', metric: 'humidity', warehouse_id: 1, zone_id: 4, minVal: 30.0, maxVal: 50.0 },
  { device_uid: 'mum-fire-haz', metric: 'fire', warehouse_id: 1, zone_id: 4, minVal: 0, maxVal: 0 },

  // Pune Cold Storage Warehouse (w_id: 2)
  { device_uid: 'pun-temp-01', metric: 'temperature', warehouse_id: 2, zone_id: 5, minVal: -8.0, maxVal: 2.0 },
  { device_uid: 'pun-hum-01', metric: 'humidity', warehouse_id: 2, zone_id: 5, minVal: 50.0, maxVal: 70.0 },
  { device_uid: 'pun-door-01', metric: 'door', warehouse_id: 2, zone_id: 5, minVal: 0, maxVal: 1 },

  { device_uid: 'pun-temp-02', metric: 'temperature', warehouse_id: 2, zone_id: 6, minVal: -8.0, maxVal: 2.0 },
  { device_uid: 'pun-hum-02', metric: 'humidity', warehouse_id: 2, zone_id: 6, minVal: 50.0, maxVal: 70.0 },
  { device_uid: 'pun-stock-02', metric: 'stock_level', warehouse_id: 2, zone_id: 6, minVal: 30.0, maxVal: 100.0 },

  { device_uid: 'pun-mot-01', metric: 'motion', warehouse_id: 2, zone_id: 7, minVal: 0, maxVal: 1 },
  { device_uid: 'pun-door-dock', metric: 'door', warehouse_id: 2, zone_id: 7, minVal: 0, maxVal: 1 },
  { device_uid: 'pun-fire-dock', metric: 'fire', warehouse_id: 2, zone_id: 7, minVal: 0, maxVal: 0 },

  { device_uid: 'pun-temp-vac', metric: 'temperature', warehouse_id: 2, zone_id: 8, minVal: 2.0, maxVal: 8.0 },
  { device_uid: 'pun-hum-vac', metric: 'humidity', warehouse_id: 2, zone_id: 8, minVal: 40.0, maxVal: 60.0 },
  { device_uid: 'pun-door-vac', metric: 'door', warehouse_id: 2, zone_id: 8, minVal: 0, maxVal: 1 },
];

export class TelemetrySimulator {
  private client: mqtt.MqttClient | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private offlineDevices: Map<string, number> = new Map(); // UID -> offline until timestamp

  public start(): void {
    console.log(`Starting telemetry simulator, connecting to MQTT Broker: ${brokerUrl}`);
    this.client = mqtt.connect(brokerUrl, {
      reconnectPeriod: 5000,
    });

    this.client.on('connect', () => {
      console.log('Telemetry simulator connected to MQTT broker.');
      this.runLoop();
    });

    this.client.on('error', (err) => {
      console.error('Simulator MQTT connection error:', err);
    });
  }

  private runLoop(): void {
    // Generate stock levels for local depletion
    const currentStock: { [uid: string]: number } = {};
    simulatedDevices.forEach((d) => {
      if (d.metric === 'stock_level') {
        currentStock[d.device_uid] = 80.0;
      }
    });

    this.intervalId = setInterval(() => {
      const now = Date.now();

      simulatedDevices.forEach((dev) => {
        // Check if device is in simulated offline state
        const offlineUntil = this.offlineDevices.get(dev.device_uid);
        if (offlineUntil && now < offlineUntil) {
          // Device is offline, skip publishing telemetry
          return;
        } else if (offlineUntil && now >= offlineUntil) {
          // Cooldown finished, device online
          this.offlineDevices.delete(dev.device_uid);
          console.log(`Simulator device back online: ${dev.device_uid}`);
        }

        // 2% chance device goes offline for 2 minutes (120000 ms)
        if (Math.random() < 0.02) {
          console.log(`Simulator device going offline: ${dev.device_uid} (stops for 2 min)`);
          this.offlineDevices.set(dev.device_uid, now + 120000);
          return;
        }

        // Compute simulated value
        let val = 0.0;
        const rand = Math.random();

        switch (dev.metric) {
          case 'temperature':
            // 5% chance temperature spike > 30°C
            if (rand < 0.05) {
              val = 32.5 + Math.random() * 3.5;
            } else {
              val = dev.minVal + Math.random() * (dev.maxVal - dev.minVal);
            }
            break;

          case 'humidity':
            // 3% chance humidity spike > 75%
            if (rand < 0.03) {
              val = 77.0 + Math.random() * 10.0;
            } else {
              val = dev.minVal + Math.random() * (dev.maxVal - dev.minVal);
            }
            break;

          case 'stock_level':
            let stock = currentStock[dev.device_uid];
            stock -= Math.random() * 0.5; // depletion
            if (stock < 15.0) {
              stock = 100.0; // restock event
            }
            currentStock[dev.device_uid] = stock;
            val = stock;
            break;

          case 'motion':
          case 'door':
            val = Math.random() < 0.3 ? 1.0 : 0.0;
            break;

          case 'fire':
            val = Math.random() < 0.005 ? 1.0 : 0.0; // fire alarm simulation
            break;
        }

        const battery_level = 99.0 - (Math.random() * 5.0);
        const signal_strength = -50 - Math.floor(Math.random() * 30);

        const payload = {
          device_uid: dev.device_uid,
          metric: dev.metric,
          value: parseFloat(val.toFixed(2)),
          battery_level: parseFloat(battery_level.toFixed(1)),
          signal_strength,
          timestamp: new Date().toISOString(),
          warehouse_id: dev.warehouse_id,
          zone_id: dev.zone_id,
        };

        const topic = `warehouse/${dev.warehouse_id}/device/${dev.device_uid}/telemetry`;
        
        if (this.client?.connected) {
          this.client.publish(topic, JSON.stringify(payload), { qos: 0 }, (err) => {
            if (err) {
              console.error(`Simulator failed to publish to ${topic}:`, err);
            }
          });
        }
      });
    }, 30000); // Publish every 30 seconds
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.client) {
      this.client.end();
      this.client = null;
    }
  }
}

export const telemetrySimulator = new TelemetrySimulator();
export default telemetrySimulator;
