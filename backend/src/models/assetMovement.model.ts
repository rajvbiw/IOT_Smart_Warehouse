import { DataTypes, Model, Sequelize } from 'sequelize';

export class AssetMovement extends Model {
  public id!: number;
  public asset_id!: number;
  public from_zone_id!: number | null;
  public to_zone_id!: number | null;
  public quantity!: number;
  public movement_type!: 'inbound' | 'outbound' | 'transfer' | 'adjustment';
  public operator_id!: number;
  public reference_no!: string;
  public notes!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public asset?: any;
  public operator?: any;
  public fromZone?: any;
  public toZone?: any;
}

export function initAssetMovement(sequelize: Sequelize): typeof AssetMovement {
  AssetMovement.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      asset_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      from_zone_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      to_zone_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      movement_type: {
        type: DataTypes.ENUM('inbound', 'outbound', 'transfer', 'adjustment'),
        allowNull: false,
      },
      operator_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      reference_no: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'asset_movements',
      underscored: true,
      timestamps: true,
    }
  );
  return AssetMovement;
}
