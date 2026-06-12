require('dotenv').config();
const { InfluxDB, Point } = require('@influxdata/influxdb-client');

const url = process.env.INFLUX_URL || 'http://localhost:8086';
const token = process.env.INFLUX_TOKEN || 'admin-token-12345';
const org = process.env.INFLUX_ORG || 'warehouse-org';
const bucket = process.env.INFLUX_BUCKET || 'warehouse_sensors';

const influxDB = new InfluxDB({ url, token });
const writeApi = influxDB.getWriteApi(org, bucket, 'ns');

// Devices definition
const devices = [
  // Mumbai
  { device_uid: 'mum-temp-01', type: 'temperature', warehouse_id: 1, zone_id: 1, zone_name: 'Dry Storage Area A' },
  { device_uid: 'mum-hum-01', type: 'humidity', warehouse_id: 1, zone_id: 1, zone_name: 'Dry Storage Area A' },
  { device_uid: 'mum-stock-01', type: 'stock_level', warehouse_id: 1, zone_id: 1, zone_name: 'Dry Storage Area A' },
  
  { device_uid: 'mum-temp-02', type: 'temperature', warehouse_id: 1, zone_id: 2, zone_name: 'Dry Storage Area B' },
  { device_uid: 'mum-hum-02', type: 'humidity', warehouse_id: 1, zone_id: 2, zone_name: 'Dry Storage Area B' },
  { device_uid: 'mum-stock-02', type: 'stock_level', warehouse_id: 1, zone_id: 2, zone_name: 'Dry Storage Area B' },

  { device_uid: 'mum-mot-01', type: 'motion', warehouse_id: 1, zone_id: 3, zone_name: 'Loading Bay West' },
  { device_uid: 'mum-door-01', type: 'door', warehouse_id: 1, zone_id: 3, zone_name: 'Loading Bay West' },
  { device_uid: 'mum-fire-01', type: 'fire', warehouse_id: 1, zone_id: 3, zone_name: 'Loading Bay West' },

  { device_uid: 'mum-temp-haz', type: 'temperature', warehouse_id: 1, zone_id: 4, zone_name: 'Hazmat Cell' },
  { device_uid: 'mum-hum-haz', type: 'humidity', warehouse_id: 1, zone_id: 4, zone_name: 'Hazmat Cell' },
  { device_uid: 'mum-fire-haz', type: 'fire', warehouse_id: 1, zone_id: 4, zone_name: 'Hazmat Cell' },

  // Pune
  { device_uid: 'pun-temp-01', type: 'temperature', warehouse_id: 2, zone_id: 5, zone_name: 'Cold Storage Room 1' },
  { device_uid: 'pun-hum-01', type: 'humidity', warehouse_id: 2, zone_id: 5, zone_name: 'Cold Storage Room 1' },
  { device_uid: 'pun-door-01', type: 'door', warehouse_id: 2, zone_id: 5, zone_name: 'Cold Storage Room 1' },

  { device_uid: 'pun-temp-02', type: 'temperature', warehouse_id: 2, zone_id: 6, zone_name: 'Cold Storage Room 2' },
  { device_uid: 'pun-hum-02', type: 'humidity', warehouse_id: 2, zone_id: 6, zone_name: 'Cold Storage Room 2' },
  { device_uid: 'pun-stock-02', type: 'stock_level', warehouse_id: 2, zone_id: 6, zone_name: 'Cold Storage Room 2' },

  { device_uid: 'pun-mot-01', type: 'motion', warehouse_id: 2, zone_id: 7, zone_name: 'Loading Bay East' },
  { device_uid: 'pun-door-dock', type: 'door', warehouse_id: 2, zone_id: 7, zone_name: 'Loading Bay East' },
  { device_uid: 'pun-fire-dock', type: 'fire', warehouse_id: 2, zone_id: 7, zone_name: 'Loading Bay East' },

  { device_uid: 'pun-temp-vac', type: 'temperature', warehouse_id: 2, zone_id: 8, zone_name: 'Pharma Vaccine Cell' },
  { device_uid: 'pun-hum-vac', type: 'humidity', warehouse_id: 2, zone_id: 8, zone_name: 'Pharma Vaccine Cell' },
  { device_uid: 'pun-door-vac', type: 'door', warehouse_id: 2, zone_id: 8, zone_name: 'Pharma Vaccine Cell' }
];

async function seed() {
  console.log('Starting InfluxDB seeding...');
  const now = new Date();
  
  // To avoid writing too many points causing memory issues or slow seeding,
  // we generate 30 days of data, but we'll use a 5-minute interval for historical data,
  // and a 30-second interval for the last 24 hours. This achieves a realistic history
  // while keeping the database size high-performance and quick to seed.
  
  let batchCount = 0;
  const totalDays = 30;
  const oneDayMs = 24 * 60 * 60 * 1000;
  
  console.log(`Generating metrics for ${devices.length} devices...`);

  // Track stock levels for devices to simulate gradual depletion and restocking
  const deviceStockLevels = {};
  devices.forEach(d => {
    if (d.type === 'stock_level') {
      deviceStockLevels[d.device_uid] = 100.0;
    }
  });

  for (let day = totalDays; day >= 0; day--) {
    const dayTimestamp = new Date(now.getTime() - day * oneDayMs);
    console.log(`Seeding day -${day}: ${dayTimestamp.toDateString()}`);
    
    // We determine the time step: if it's the last day, 30s step. Otherwise, 5-minute step.
    const intervalMs = day === 0 ? 30 * 1000 : 5 * 60 * 1000;
    const dayStart = dayTimestamp.setHours(0,0,0,0);
    const dayEnd = dayTimestamp.setHours(23,59,59,999);
    
    for (let time = dayStart; time <= dayEnd; time += intervalMs) {
      const recordDate = new Date(time);
      const hour = recordDate.getHours();
      
      for (const dev of devices) {
        let val = 0.0;
        let battery = 98.5 - (day * 0.1) - (Math.random() * 2);
        if (battery < 10) battery = 10;
        let signal = -50 - Math.floor(Math.random() * 25); // -50 to -75 dBm
        
        // Value Simulation logic
        switch (dev.type) {
          case 'temperature':
            if (dev.zone_id === 5 || dev.zone_id === 6) { // Cold room (-10 to 4)
              val = -4.0 + (Math.sin(hour / 24 * Math.PI * 2) * 2) + (Math.random() * 1.5);
              // 5% chance spike
              if (Math.random() < 0.05) val += 8.0;
            } else if (dev.zone_id === 8) { // Vaccine (2 to 8)
              val = 4.5 + (Math.sin(hour / 24 * Math.PI * 2) * 1.5) + (Math.random() * 0.5);
              if (Math.random() < 0.03) val += 5.0; // Vaccine fridge warming spike
            } else if (dev.zone_id === 4) { // Hazmat (10 to 25)
              val = 18.0 + (Math.random() * 3);
            } else { // Normal storage (15 to 30)
              val = 22.0 + (Math.sin((hour - 6) / 24 * Math.PI * 2) * 4) + (Math.random() * 2);
              if (Math.random() < 0.04) val += 7.0; // AC outage spike
            }
            break;
            
          case 'humidity':
            val = 48.0 + (Math.cos(hour / 24 * Math.PI * 2) * 8) + (Math.random() * 4);
            if (Math.random() < 0.03) val += 20.0; // high humidity spike
            break;
            
          case 'stock_level':
            // Deplete stock gradually
            let stock = deviceStockLevels[dev.device_uid] || 100.0;
            stock -= Math.random() * 0.3; // gradual usage
            if (stock < 18.0) {
              stock = 100.0; // Restocked!
            }
            deviceStockLevels[dev.device_uid] = stock;
            val = stock;
            break;
            
          case 'motion':
            // Active during working hours (9 AM to 6 PM)
            if (hour >= 9 && hour <= 18) {
              val = Math.random() < 0.7 ? 1.0 : 0.0;
            } else {
              val = Math.random() < 0.08 ? 1.0 : 0.0; // rare night shift/security
            }
            break;
            
          case 'door':
            // Open door occasionally during work hours
            if (hour >= 9 && hour <= 18) {
              val = Math.random() < 0.15 ? 1.0 : 0.0;
            } else {
              val = Math.random() < 0.01 ? 1.0 : 0.0;
            }
            break;
            
          case 'fire':
            val = Math.random() < 0.0001 ? 1.0 : 0.0; // extremely rare trigger
            break;
        }

        const point = new Point('sensor_readings')
          .tag('device_uid', dev.device_uid)
          .tag('device_type', dev.type)
          .tag('warehouse_id', dev.warehouse_id.toString())
          .tag('zone_id', dev.zone_id.toString())
          .tag('zone_name', dev.zone_name)
          .floatField('value', val)
          .floatField('battery_level', battery)
          .intField('signal_strength', signal)
          .timestamp(recordDate);
        
        writeApi.writePoint(point);
        batchCount++;

        // Send a heartbeat every 300s (5min)
        if (batchCount % 10 === 0) {
          const hbPoint = new Point('device_heartbeat')
            .tag('device_uid', dev.device_uid)
            .tag('warehouse_id', dev.warehouse_id.toString())
            .stringField('status', 'online')
            .stringField('ip_address', `192.168.1.${100 + (dev.device_uid.charCodeAt(0) % 100)}`)
            .stringField('firmware_version', 'v1.4.2')
            .timestamp(recordDate);
          writeApi.writePoint(hbPoint);
        }
        
        if (batchCount % 5000 === 0) {
          await writeApi.flush();
        }
      }
    }
  }

  await writeApi.close();
  console.log(`InfluxDB seeding completed! Successfully wrote ${batchCount} data points.`);
}

seed().catch(err => {
  console.error('InfluxDB seeding failed:', err);
  process.exit(1);
});
