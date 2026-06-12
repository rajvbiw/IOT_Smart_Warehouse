import { DataTypes, Model, Sequelize } from 'sequelize';

export class Report extends Model {
  public id!: number;
  public warehouse_id!: number;
  public report_type!: string; // e.g. 'daily_summary', 'monthly_summary', 'device_health', 'asset_report'
  public generated_by!: number;
  public parameters_json!: any;
  public s3_file_url!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

export function initReport(sequelize: Sequelize): typeof Report {
  Report.init(
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
      report_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      generated_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      parameters_json: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
      },
      s3_file_url: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: 'reports',
      underscored: true,
      timestamps: true,
    }
  );
  return Report;
}
