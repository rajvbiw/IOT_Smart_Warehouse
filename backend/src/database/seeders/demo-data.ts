import { sequelize, Warehouse, Zone, Device, AlertRule, Asset, User, AssetMovement } from '../../models';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('Starting MySQL database seeding...');
  await sequelize.sync({ force: true });
  console.log('Database synced (tables dropped and recreated).');

  // 1. Seed Warehouses
  const w1 = await Warehouse.create({
    id: 1,
    name: 'General Warehouse Mumbai',
    location: 'Mumbai, Maharashtra',
    address: 'Plot 45, JNPT Logistics Park, Navi Mumbai',
    type: 'general',
    total_area_sqft: 75000,
    timezone: 'Asia/Kolkata',
  });

  const w2 = await Warehouse.create({
    id: 2,
    name: 'Cold Storage Pune',
    location: 'Pune, Maharashtra',
    address: 'Gat No 232, Chakan Industrial Area Phase 2, Pune',
    type: 'cold_storage',
    total_area_sqft: 40000,
    timezone: 'Asia/Kolkata',
  });

  console.log('Warehouses seeded.');

  // 2. Seed Zones
  // Mumbai Zones
  const z1 = await Zone.create({
    id: 1,
    warehouse_id: w1.id,
    name: 'Dry Storage Area A',
    zone_type: 'storage',
    floor_level: 1,
    coordinates_json: { x: 5, y: 5, w: 40, h: 45 },
    min_temp: 15.0,
    max_temp: 30.0,
    min_humidity: 20.0,
    max_humidity: 65.0,
  });

  const z2 = await Zone.create({
    id: 2,
    warehouse_id: w1.id,
    name: 'Dry Storage Area B',
    zone_type: 'storage',
    floor_level: 1,
    coordinates_json: { x: 50, y: 5, w: 45, h: 45 },
    min_temp: 15.0,
    max_temp: 30.0,
    min_humidity: 20.0,
    max_humidity: 65.0,
  });

  const z3 = await Zone.create({
    id: 3,
    warehouse_id: w1.id,
    name: 'Loading Bay West',
    zone_type: 'loading',
    floor_level: 1,
    coordinates_json: { x: 5, y: 55, w: 90, h: 15 },
    min_temp: 10.0,
    max_temp: 35.0,
    min_humidity: 10.0,
    max_humidity: 85.0,
  });

  const z4 = await Zone.create({
    id: 4,
    warehouse_id: w1.id,
    name: 'Hazmat Cell',
    zone_type: 'hazmat',
    floor_level: 1,
    coordinates_json: { x: 5, y: 75, w: 40, h: 20 },
    min_temp: 10.0,
    max_temp: 25.0,
    min_humidity: 0.0,
    max_humidity: 50.0,
  });

  // Pune Zones
  const z5 = await Zone.create({
    id: 5,
    warehouse_id: w2.id,
    name: 'Cold Storage Room 1',
    zone_type: 'refrigeration',
    floor_level: 1,
    coordinates_json: { x: 5, y: 5, w: 45, h: 45 },
    min_temp: -10.0,
    max_temp: 4.0,
    min_humidity: 40.0,
    max_humidity: 70.0,
  });

  const z6 = await Zone.create({
    id: 6,
    warehouse_id: w2.id,
    name: 'Cold Storage Room 2',
    zone_type: 'refrigeration',
    floor_level: 1,
    coordinates_json: { x: 55, y: 5, w: 40, h: 45 },
    min_temp: -10.0,
    max_temp: 4.0,
    min_humidity: 40.0,
    max_humidity: 70.0,
  });

  const z7 = await Zone.create({
    id: 7,
    warehouse_id: w2.id,
    name: 'Loading Bay East',
    zone_type: 'loading',
    floor_level: 1,
    coordinates_json: { x: 5, y: 55, w: 90, h: 15 },
    min_temp: 0.0,
    max_temp: 20.0,
    min_humidity: 30.0,
    max_humidity: 80.0,
  });

  const z8 = await Zone.create({
    id: 8,
    warehouse_id: w2.id,
    name: 'Pharma Vaccine Cell',
    zone_type: 'refrigeration',
    floor_level: 1,
    coordinates_json: { x: 5, y: 75, w: 45, h: 20 },
    min_temp: 2.0,
    max_temp: 8.0,
    min_humidity: 35.0,
    max_humidity: 60.0,
  });

  console.log('Zones seeded.');

  // 3. Seed Users
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('admin123', salt);
  const managerPasswordHash = await bcrypt.hash('manager123', salt);
  const operatorPasswordHash = await bcrypt.hash('operator123', salt);

  // Superadmin
  await User.create({
    id: 1,
    name: 'Super Admin',
    email: 'superadmin@warehouse-iot.com',
    password_hash: adminPasswordHash,
    role: 'superadmin',
    warehouse_id: null,
    is_active: true,
  });

  // Mumbai Users
  await User.create({
    id: 2,
    name: 'Mumbai Manager',
    email: 'mumbai.mgr@warehouse-iot.com',
    password_hash: managerPasswordHash,
    role: 'warehouse_manager',
    warehouse_id: w1.id,
    is_active: true,
  });

  await User.create({
    id: 3,
    name: 'Mumbai Operator 1',
    email: 'mumbai.op1@warehouse-iot.com',
    password_hash: operatorPasswordHash,
    role: 'operator',
    warehouse_id: w1.id,
    is_active: true,
  });

  await User.create({
    id: 4,
    name: 'Mumbai Operator 2',
    email: 'mumbai.op2@warehouse-iot.com',
    password_hash: operatorPasswordHash,
    role: 'operator',
    warehouse_id: w1.id,
    is_active: true,
  });

  // Pune Users
  await User.create({
    id: 5,
    name: 'Pune Manager',
    email: 'pune.mgr@warehouse-iot.com',
    password_hash: managerPasswordHash,
    role: 'warehouse_manager',
    warehouse_id: w2.id,
    is_active: true,
  });

  await User.create({
    id: 6,
    name: 'Pune Operator 1',
    email: 'pune.op1@warehouse-iot.com',
    password_hash: operatorPasswordHash,
    role: 'operator',
    warehouse_id: w2.id,
    is_active: true,
  });

  await User.create({
    id: 7,
    name: 'Pune Operator 2',
    email: 'pune.op2@warehouse-iot.com',
    password_hash: operatorPasswordHash,
    role: 'operator',
    warehouse_id: w2.id,
    is_active: true,
  });

  console.log('Users seeded.');

  // 4. Seed Devices (12 per warehouse = 24 devices total)
  // Mumbai Devices (Warehouse 1)
  const devicesData = [
    // Mumbai (Zone 1)
    { id: 1, warehouse_id: 1, zone_id: 1, device_uid: 'mum-temp-01', name: 'Temp Sensor Storage A', type: 'temperature', manufacturer: 'Honeywell', model: 'T100-W', firmware_version: 'v1.4.2', aws_iot_thing_name: 'warehouse-device-1' },
    { id: 2, warehouse_id: 1, zone_id: 1, device_uid: 'mum-hum-01', name: 'Humidity Sensor Storage A', type: 'humidity', manufacturer: 'Honeywell', model: 'H200-W', firmware_version: 'v2.0.1', aws_iot_thing_name: 'warehouse-device-2' },
    { id: 3, warehouse_id: 1, zone_id: 1, device_uid: 'mum-stock-01', name: 'Stock Rack Scale A1', type: 'stock_level', manufacturer: 'Mettler Toledo', model: 'S500', firmware_version: 'v1.1.0', aws_iot_thing_name: 'warehouse-device-3' },
    
    // Mumbai (Zone 2)
    { id: 4, warehouse_id: 1, zone_id: 2, device_uid: 'mum-temp-02', name: 'Temp Sensor Storage B', type: 'temperature', manufacturer: 'Honeywell', model: 'T100-W', firmware_version: 'v1.4.2', aws_iot_thing_name: 'warehouse-device-4' },
    { id: 5, warehouse_id: 1, zone_id: 2, device_uid: 'mum-hum-02', name: 'Humidity Sensor Storage B', type: 'humidity', manufacturer: 'Honeywell', model: 'H200-W', firmware_version: 'v2.0.1', aws_iot_thing_name: 'warehouse-device-5' },
    { id: 6, warehouse_id: 1, zone_id: 2, device_uid: 'mum-stock-02', name: 'Stock Rack Scale B1', type: 'stock_level', manufacturer: 'Mettler Toledo', model: 'S500', firmware_version: 'v1.1.0', aws_iot_thing_name: 'warehouse-device-6' },

    // Mumbai (Zone 3)
    { id: 7, warehouse_id: 1, zone_id: 3, device_uid: 'mum-mot-01', name: 'Motion Scanner Loading West', type: 'motion', manufacturer: 'Bosch', model: 'M-50', firmware_version: 'v3.1.2', aws_iot_thing_name: 'warehouse-device-7' },
    { id: 8, warehouse_id: 1, zone_id: 3, device_uid: 'mum-door-01', name: 'Dock Door Sensor A', type: 'door', manufacturer: 'Sensative', model: 'Strip-10', firmware_version: 'v1.0.4', aws_iot_thing_name: 'warehouse-device-8' },
    { id: 9, warehouse_id: 1, zone_id: 3, device_uid: 'mum-fire-01', name: 'Smoke Detector Dock Area', type: 'fire', manufacturer: 'Kidde', model: 'F300-X', firmware_version: 'v1.5.0', aws_iot_thing_name: 'warehouse-device-9' },

    // Mumbai (Zone 4)
    { id: 10, warehouse_id: 1, zone_id: 4, device_uid: 'mum-temp-haz', name: 'Hazmat Cell Temp Monitor', type: 'temperature', manufacturer: 'Honeywell', model: 'T200-Ex', firmware_version: 'v2.1.0', aws_iot_thing_name: 'warehouse-device-10' },
    { id: 11, warehouse_id: 1, zone_id: 4, device_uid: 'mum-hum-haz', name: 'Hazmat Cell Humidity Sensor', type: 'humidity', manufacturer: 'Honeywell', model: 'H300-Ex', firmware_version: 'v2.1.0', aws_iot_thing_name: 'warehouse-device-11' },
    { id: 12, warehouse_id: 1, zone_id: 4, device_uid: 'mum-fire-haz', name: 'Fire Sensor Hazmat', type: 'fire', manufacturer: 'Kidde', model: 'F300-X', firmware_version: 'v1.5.0', aws_iot_thing_name: 'warehouse-device-12' },

    // Pune (Warehouse 2)
    // Pune (Zone 5)
    { id: 13, warehouse_id: 2, zone_id: 5, device_uid: 'pun-temp-01', name: 'Temp Sensor Cold Room 1', type: 'temperature', manufacturer: 'Testo', model: 'T-Cold-X', firmware_version: 'v3.2.1', aws_iot_thing_name: 'warehouse-device-13' },
    { id: 14, warehouse_id: 2, zone_id: 5, device_uid: 'pun-hum-01', name: 'Humidity Cold Room 1', type: 'humidity', manufacturer: 'Testo', model: 'H-Cold-X', firmware_version: 'v3.0.0', aws_iot_thing_name: 'warehouse-device-14' },
    { id: 15, warehouse_id: 2, zone_id: 5, device_uid: 'pun-door-01', name: 'Cold Room 1 Main Door', type: 'door', manufacturer: 'Sensative', model: 'Strip-10', firmware_version: 'v1.0.4', aws_iot_thing_name: 'warehouse-device-15' },

    // Pune (Zone 6)
    { id: 16, warehouse_id: 2, zone_id: 6, device_uid: 'pun-temp-02', name: 'Temp Sensor Cold Room 2', type: 'temperature', manufacturer: 'Testo', model: 'T-Cold-X', firmware_version: 'v3.2.1', aws_iot_thing_name: 'warehouse-device-16' },
    { id: 17, warehouse_id: 2, zone_id: 6, device_uid: 'pun-hum-02', name: 'Humidity Cold Room 2', type: 'humidity', manufacturer: 'Testo', model: 'H-Cold-X', firmware_version: 'v3.0.0', aws_iot_thing_name: 'warehouse-device-17' },
    { id: 18, warehouse_id: 2, zone_id: 6, device_uid: 'pun-stock-02', name: 'Cold Room Stock Scale 2', type: 'stock_level', manufacturer: 'Mettler Toledo', model: 'S500', firmware_version: 'v1.1.0', aws_iot_thing_name: 'warehouse-device-18' },

    // Pune (Zone 7)
    { id: 19, warehouse_id: 2, zone_id: 7, device_uid: 'pun-mot-01', name: 'Motion Scanner Loading East', type: 'motion', manufacturer: 'Bosch', model: 'M-50', firmware_version: 'v3.1.2', aws_iot_thing_name: 'warehouse-device-19' },
    { id: 20, warehouse_id: 2, zone_id: 7, device_uid: 'pun-door-dock', name: 'Dock Door East Sensor', type: 'door', manufacturer: 'Sensative', model: 'Strip-10', firmware_version: 'v1.0.4', aws_iot_thing_name: 'warehouse-device-20' },
    { id: 21, warehouse_id: 2, zone_id: 7, device_uid: 'pun-fire-dock', name: 'Smoke Detector Dock Pune', type: 'fire', manufacturer: 'Kidde', model: 'F300-X', firmware_version: 'v1.5.0', aws_iot_thing_name: 'warehouse-device-21' },

    // Pune (Zone 8)
    { id: 22, warehouse_id: 2, zone_id: 8, device_uid: 'pun-temp-vac', name: 'Vaccine Fridge Temp Monitor', type: 'temperature', manufacturer: 'PharmaGuard', model: 'V-Temp-Pro', firmware_version: 'v1.0.0', aws_iot_thing_name: 'warehouse-device-22' },
    { id: 23, warehouse_id: 2, zone_id: 8, device_uid: 'pun-hum-vac', name: 'Vaccine Fridge Hum Sensor', type: 'humidity', manufacturer: 'PharmaGuard', model: 'V-Hum-Pro', firmware_version: 'v1.0.0', aws_iot_thing_name: 'warehouse-device-23' },
    { id: 24, warehouse_id: 2, zone_id: 8, device_uid: 'pun-door-vac', name: 'Vaccine Locker Lock', type: 'door', manufacturer: 'Sensative', model: 'Strip-10', firmware_version: 'v1.0.4', aws_iot_thing_name: 'warehouse-device-24' },
  ];

  for (const dev of devicesData) {
    await Device.create({
      ...dev,
      battery_level: 100.0,
      signal_strength: -55,
      status: 'online',
      last_seen_at: new Date(),
      ip_address: `192.168.1.${100 + dev.id}`,
    });
  }

  console.log('Devices seeded.');

  // 5. Seed Alert Rules (5 per warehouse)
  // Mumbai Alert Rules
  const rulesData = [
    // Mumbai (Warehouse 1)
    { warehouse_id: 1, device_id: 1, device_type: 'temperature', metric: 'value', condition: 'gt', threshold: 30.0, severity: 'critical', notification_channels: ['email', 'webhook'], is_active: true, cooldown_minutes: 5 },
    { warehouse_id: 1, device_id: 2, device_type: 'humidity', metric: 'value', condition: 'gt', threshold: 75.0, severity: 'warning', notification_channels: ['webhook'], is_active: true, cooldown_minutes: 5 },
    { warehouse_id: 1, device_type: 'stock_level', metric: 'value', condition: 'lt', threshold: 20.0, severity: 'warning', notification_channels: ['email'], is_active: true, cooldown_minutes: 10 },
    { warehouse_id: 1, device_type: 'fire', metric: 'value', condition: 'eq', threshold: 1.0, severity: 'critical', notification_channels: ['email', 'webhook'], is_active: true, cooldown_minutes: 0 },
    { warehouse_id: 1, device_type: 'temperature', metric: 'battery_level', condition: 'lt', threshold: 15.0, severity: 'info', notification_channels: ['email'], is_active: true, cooldown_minutes: 120 },

    // Pune (Warehouse 2)
    { warehouse_id: 2, device_id: 13, device_type: 'temperature', metric: 'value', condition: 'gt', threshold: 4.0, severity: 'critical', notification_channels: ['email', 'webhook'], is_active: true, cooldown_minutes: 5 },
    { warehouse_id: 2, device_id: 22, device_type: 'temperature', metric: 'value', condition: 'gt', threshold: 8.0, severity: 'critical', notification_channels: ['email', 'webhook'], is_active: true, cooldown_minutes: 2 },
    { warehouse_id: 2, device_id: 22, device_type: 'temperature', metric: 'value', condition: 'lt', threshold: 2.0, severity: 'critical', notification_channels: ['email', 'webhook'], is_active: true, cooldown_minutes: 2 },
    { warehouse_id: 2, device_type: 'door', metric: 'value', condition: 'eq', threshold: 1.0, severity: 'warning', notification_channels: ['webhook'], is_active: true, cooldown_minutes: 15 }, // Door open alert
    { warehouse_id: 2, device_type: 'fire', metric: 'value', condition: 'eq', threshold: 1.0, severity: 'critical', notification_channels: ['email', 'webhook'], is_active: true, cooldown_minutes: 0 },
  ];

  for (const rule of rulesData) {
    await AlertRule.create(rule);
  }

  console.log('Alert Rules seeded.');

  // 6. Seed Assets (50 items total across warehouses and zones)
  const categories = ['Pharmaceuticals', 'Cold Storage Goods', 'Electronics', 'Chemicals', 'General Cargo'];
  const units = ['boxes', 'pallets', 'drums', 'units', 'cartons'];

  for (let i = 1; i <= 50; i++) {
    const warehouse_id = i % 2 === 0 ? 2 : 1;
    // Map to valid zones
    const zone_id = warehouse_id === 1 ? (i % 4) + 1 : (i % 4) + 5;
    const catIndex = i % categories.length;
    const unitIndex = i % units.length;
    const min_stock = 20.0 + (i % 10) * 5;
    const max_stock = min_stock * 8;
    const qty = min_stock + (i % 7) * 25; // Some will be close or below min stock!
    const unitPrice = 5.5 + (i % 20) * 12.5;

    const sku = `SKU-WH${warehouse_id}-Z${zone_id}-${1000 + i}`;
    const name = `Asset Product ${i}`;

    const asset = await Asset.create({
      id: i,
      warehouse_id,
      zone_id,
      sku,
      name,
      category: categories[catIndex],
      quantity: qty,
      unit: units[unitIndex],
      min_stock_level: min_stock,
      max_stock_level: max_stock,
      unit_price: unitPrice,
      last_updated_at: new Date(),
    });

    // Create a seed movement for each asset
    await AssetMovement.create({
      asset_id: asset.id,
      from_zone_id: null,
      to_zone_id: zone_id,
      quantity: qty,
      movement_type: 'inbound',
      operator_id: warehouse_id === 1 ? 3 : 6, // Mumbai Op 1 or Pune Op 1
      reference_no: `REF-INB-${10000 + i}`,
      notes: 'Initial stock setup via system genesis.',
    });
  }

  console.log('Assets & Asset Movements seeded.');
  console.log('MySQL database seeding completed successfully.');
  sequelize.close();
}

seed().catch((err) => {
  console.error('MySQL seeding failed:', err);
  sequelize.close();
});
