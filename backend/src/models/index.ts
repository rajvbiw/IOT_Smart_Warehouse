import { Sequelize } from 'sequelize';
import { initWarehouse, Warehouse } from './warehouse.model';
import { initUser, User } from './user.model';
import { initZone, Zone } from './zone.model';
import { initDevice, Device } from './device.model';
import { initAlertRule, AlertRule } from './alertRule.model';
import { initAlert, Alert } from './alert.model';
import { initAsset, Asset } from './asset.model';
import { initAssetMovement, AssetMovement } from './assetMovement.model';
import { initMaintenanceLog, MaintenanceLog } from './maintenanceLog.model';
import { initReport, Report } from './report.model';
import { initAuditLog, AuditLog } from './auditLog.model';

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '3306', 10);
const dbName = process.env.DB_NAME || 'warehouse_iot';
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || 'password';

export const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: 'mysql',
  logging: false, // Set to console.log for query debugging if needed
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

// Initialize models
initWarehouse(sequelize);
initUser(sequelize);
initZone(sequelize);
initDevice(sequelize);
initAlertRule(sequelize);
initAlert(sequelize);
initAsset(sequelize);
initAssetMovement(sequelize);
initMaintenanceLog(sequelize);
initReport(sequelize);
initAuditLog(sequelize);

// Define Associations
User.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
Warehouse.hasMany(User, { foreignKey: 'warehouse_id', as: 'users' });

Zone.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
Warehouse.hasMany(Zone, { foreignKey: 'warehouse_id', as: 'zones' });

Device.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
Device.belongsTo(Zone, { foreignKey: 'zone_id', as: 'zone' });
Warehouse.hasMany(Device, { foreignKey: 'warehouse_id', as: 'devices' });
Zone.hasMany(Device, { foreignKey: 'zone_id', as: 'devices' });

AlertRule.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
AlertRule.belongsTo(Device, { foreignKey: 'device_id', as: 'device' });
Warehouse.hasMany(AlertRule, { foreignKey: 'warehouse_id', as: 'alertRules' });
Device.hasMany(AlertRule, { foreignKey: 'device_id', as: 'alertRules' });

Alert.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
Alert.belongsTo(Device, { foreignKey: 'device_id', as: 'device' });
Alert.belongsTo(AlertRule, { foreignKey: 'alert_rule_id', as: 'rule' });
Alert.belongsTo(User, { as: 'acknowledgedByUser', foreignKey: 'acknowledged_by' });
Warehouse.hasMany(Alert, { foreignKey: 'warehouse_id', as: 'alerts' });
Device.hasMany(Alert, { foreignKey: 'device_id', as: 'alerts' });

Asset.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
Asset.belongsTo(Zone, { foreignKey: 'zone_id', as: 'zone' });
Warehouse.hasMany(Asset, { foreignKey: 'warehouse_id', as: 'assets' });
Zone.hasMany(Asset, { foreignKey: 'zone_id', as: 'assets' });

AssetMovement.belongsTo(Asset, { foreignKey: 'asset_id', as: 'asset' });
AssetMovement.belongsTo(Zone, { as: 'fromZone', foreignKey: 'from_zone_id' });
AssetMovement.belongsTo(Zone, { as: 'toZone', foreignKey: 'to_zone_id' });
AssetMovement.belongsTo(User, { as: 'operator', foreignKey: 'operator_id' });
Asset.hasMany(AssetMovement, { foreignKey: 'asset_id', as: 'movements' });

MaintenanceLog.belongsTo(Device, { foreignKey: 'device_id', as: 'device' });
MaintenanceLog.belongsTo(User, { as: 'performedByUser', foreignKey: 'performed_by' });
Device.hasMany(MaintenanceLog, { foreignKey: 'device_id', as: 'maintenanceLogs' });

Report.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
Report.belongsTo(User, { as: 'generatedByUser', foreignKey: 'generated_by' });
Warehouse.hasMany(Report, { foreignKey: 'warehouse_id', as: 'reports' });

AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });

export {
  Warehouse,
  User,
  Zone,
  Device,
  AlertRule,
  Alert,
  Asset,
  AssetMovement,
  MaintenanceLog,
  Report,
  AuditLog,
};
export default {
  sequelize,
  Warehouse,
  User,
  Zone,
  Device,
  AlertRule,
  Alert,
  Asset,
  AssetMovement,
  MaintenanceLog,
  Report,
  AuditLog,
};
