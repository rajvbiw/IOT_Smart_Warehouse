import { DataTypes, Model, Sequelize } from 'sequelize';

export class Alert extends Model {
  public id!: number;
  public warehouse_id!: number;
  public device_id!: number;
  public alert_rule_id!: number;
  public metric!: string;
  public value!: number;
  public message!: string;
  public severity!: 'info' | 'warning' | 'critical';
  public status!: 'open' | 'acknowledged' | 'resolved';
  public acknowledged_by!: number | null;
  public acknowledged_at!: Date | null;
  public acknowledged_note!: string | null;
  public resolved_at!: Date | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

export function initAlert(sequelize: Sequelize): typeof Alert {
  Alert.init(
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
      device_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      alert_rule_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      metric: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      severity: {
        type: DataTypes.ENUM('info', 'warning', 'critical'),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('open', 'acknowledged', 'resolved'),
        allowNull: false,
        defaultValue: 'open',
      },
      acknowledged_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      acknowledged_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      acknowledged_note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      resolved_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'alerts',
      underscored: true,
      timestamps: true,
    }
  );
  return Alert;
}
