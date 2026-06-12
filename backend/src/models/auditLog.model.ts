import { DataTypes, Model, Sequelize } from 'sequelize';

export class AuditLog extends Model {
  public id!: number;
  public user_id!: number;
  public action!: string; // e.g. 'LOGIN', 'CREATE_DEVICE', 'ACKNOWLEDGE_ALERT'
  public table_name!: string;
  public record_id!: number | null;
  public old_values!: any;
  public new_values!: any;
  public ip_address!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

export function initAuditLog(sequelize: Sequelize): typeof AuditLog {
  AuditLog.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      table_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      record_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      old_values: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      new_values: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      ip_address: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'audit_logs',
      underscored: true,
      timestamps: true,
    }
  );
  return AuditLog;
}
