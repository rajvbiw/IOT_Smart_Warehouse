import { DataTypes, Model, Sequelize } from 'sequelize';

export class Asset extends Model {
  public id!: number;
  public warehouse_id!: number;
  public zone_id!: number;
  public name!: string;
  public sku!: string;
  public category!: string;
  public quantity!: number;
  public unit!: string;
  public min_stock_level!: number;
  public max_stock_level!: number;
  public unit_price!: number;
  public last_updated_at!: Date | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public zone?: any;
}

export function initAsset(sequelize: Sequelize): typeof Asset {
  Asset.init(
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
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      sku: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      category: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      unit: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pcs',
      },
      min_stock_level: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 10.0,
      },
      max_stock_level: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 1000.0,
      },
      unit_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      last_updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'assets',
      underscored: true,
      timestamps: true,
    }
  );
  return Asset;
}
