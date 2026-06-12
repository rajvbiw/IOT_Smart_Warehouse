import { DataTypes, Model, Sequelize } from 'sequelize';

export class Zone extends Model {
  public id!: number;
  public warehouse_id!: number;
  public name!: string;
  public zone_type!: 'storage' | 'loading' | 'refrigeration' | 'hazmat';
  public floor_level!: number;
  public coordinates_json!: any;
  public min_temp!: number;
  public max_temp!: number;
  public min_humidity!: number;
  public max_humidity!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

export function initZone(sequelize: Sequelize): typeof Zone {
  Zone.init(
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
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      zone_type: {
        type: DataTypes.ENUM('storage', 'loading', 'refrigeration', 'hazmat'),
        allowNull: false,
      },
      floor_level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      coordinates_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      min_temp: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 15.0,
      },
      max_temp: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 28.0,
      },
      min_humidity: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 30.0,
      },
      max_humidity: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 60.0,
      },
    },
    {
      sequelize,
      tableName: 'zones',
      underscored: true,
      timestamps: true,
    }
  );
  return Zone;
}
