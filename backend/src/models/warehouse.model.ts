import { DataTypes, Model, Sequelize } from 'sequelize';

export class Warehouse extends Model {
  public id!: number;
  public name!: string;
  public location!: string;
  public address!: string;
  public type!: 'general' | 'cold_storage' | 'pharma' | 'chemical';
  public total_area_sqft!: number;
  public timezone!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

export function initWarehouse(sequelize: Sequelize): typeof Warehouse {
  Warehouse.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      location: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM('general', 'cold_storage', 'pharma', 'chemical'),
        allowNull: false,
      },
      total_area_sqft: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      timezone: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Asia/Kolkata',
      },
    },
    {
      sequelize,
      tableName: 'warehouses',
      underscored: true,
      timestamps: true,
    }
  );
  return Warehouse;
}
