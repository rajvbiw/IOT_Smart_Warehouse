import { DataTypes, Model, Sequelize } from 'sequelize';

export class MaintenanceLog extends Model {
  public id!: number;
  public device_id!: number;
  public performed_by!: number;
  public maintenance_type!: 'battery' | 'calibration' | 'repair' | 'replacement' | 'firmware';
  public description!: string;
  public cost!: number;
  public next_maintenance_date!: Date | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

export function initMaintenanceLog(sequelize: Sequelize): typeof MaintenanceLog {
  MaintenanceLog.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      device_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      performed_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      maintenance_type: {
        type: DataTypes.ENUM('battery', 'calibration', 'repair', 'replacement', 'firmware'),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      next_maintenance_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'maintenance_logs',
      underscored: true,
      timestamps: true,
    }
  );
  return MaintenanceLog;
}
