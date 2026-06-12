import { DataTypes, Model, Sequelize } from 'sequelize';

export class Device extends Model {
  public id!: number;
  public warehouse_id!: number;
  public zone_id!: number;
  public device_uid!: string;
  public name!: string;
  public type!: 'temperature' | 'humidity' | 'stock_level' | 'motion' | 'door' | 'fire';
  public manufacturer!: string;
  public model!: string;
  public firmware_version!: string;
  public battery_level!: number;
  public signal_strength!: number;
  public status!: 'online' | 'offline' | 'maintenance';
  public last_seen_at!: Date | null;
  public ip_address!: string;
  public aws_iot_thing_name!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

export function initDevice(sequelize: Sequelize): typeof Device {
  Device.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      warehouse_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      zone_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      device_uid: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM('temperature', 'humidity', 'stock_level', 'motion', 'door', 'fire'),
        allowNull: false,
      },
      manufacturer: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      model: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      firmware_version: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      battery_level: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 100.0,
      },
      signal_strength: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: -50, // rssi in dBm
      },
      status: {
        type: DataTypes.ENUM('online', 'offline', 'maintenance'),
        allowNull: false,
        defaultValue: 'online',
      },
      last_seen_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      ip_address: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      aws_iot_thing_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'devices',
      underscored: true,
      timestamps: true,
    }
  );
  return Device;
}
