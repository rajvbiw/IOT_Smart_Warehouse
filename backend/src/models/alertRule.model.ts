import { DataTypes, Model, Sequelize } from 'sequelize';

export class AlertRule extends Model {
  public id!: number;
  public warehouse_id!: number;
  public device_id!: number | null;
  public device_type!: string; // e.g. 'temperature', 'humidity'
  public metric!: string; // e.g. 'value', 'battery_level'
  public condition!: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  public threshold!: number;
  public severity!: 'info' | 'warning' | 'critical';
  public notification_channels!: any; // JSON array, e.g. ['email', 'webhook', 'sms']
  public is_active!: boolean;
  public cooldown_minutes!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

export function initAlertRule(sequelize: Sequelize): typeof AlertRule {
  AlertRule.init(
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
        allowNull: true,
      },
      device_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      metric: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'value',
      },
      condition: {
        type: DataTypes.ENUM('gt', 'lt', 'eq', 'gte', 'lte'),
        allowNull: false,
      },
      threshold: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      severity: {
        type: DataTypes.ENUM('info', 'warning', 'critical'),
        allowNull: false,
        defaultValue: 'warning',
      },
      notification_channels: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      cooldown_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
      },
    },
    {
      sequelize,
      tableName: 'alert_rules',
      underscored: true,
      timestamps: true,
    }
  );
  return AlertRule;
}
