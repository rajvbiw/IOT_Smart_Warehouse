import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Asset, AssetMovement, Zone, User, sequelize } from '../models';
import { Op } from 'sequelize';

export class AssetController {
  /**
   * List assets with filtering.
   */
  public static async list(req: AuthenticatedRequest, res: Response) {
    const { warehouse_id, zone_id, category, search } = req.query;

    const filter: any = {};
    if (warehouse_id) filter.warehouse_id = parseInt(warehouse_id as string, 10);
    if (zone_id) filter.zone_id = parseInt(zone_id as string, 10);
    if (category) filter.category = category as string;

    if (search) {
      filter[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } },
      ];
    }

    if (req.user && req.user.role !== 'superadmin' && req.user.warehouse_id) {
      filter.warehouse_id = req.user.warehouse_id;
    }

    try {
      const assets = await Asset.findAll({
        where: filter,
        include: [{ model: Zone, as: 'zone' }],
      });
      return res.status(200).json(assets);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve assets' });
    }
  }

  public static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const asset = await Asset.findByPk(req.params.id, {
        include: [{ model: Zone, as: 'zone' }],
      });
      if (!asset) {
        return res.status(404).json({ error: 'Asset not found' });
      }
      return res.status(200).json(asset);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve asset' });
    }
  }

  public static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const asset = await Asset.create(req.body);
      return res.status(201).json(asset);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to create asset' });
    }
  }

  public static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const asset = await Asset.findByPk(req.params.id);
      if (!asset) {
        return res.status(404).json({ error: 'Asset not found' });
      }
      await asset.update(req.body);
      return res.status(200).json(asset);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update asset' });
    }
  }

  /**
   * Records stock movement inside a Sequelize transaction.
   */
  public static async recordMovement(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { movement_type, quantity, from_zone_id, to_zone_id, reference_no, notes } = req.body;

    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive number' });
    }

    const transaction = await sequelize.transaction();

    try {
      const asset = await Asset.findByPk(id, { transaction });
      if (!asset) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Asset not found' });
      }

      let newQty = Number(asset.quantity);

      switch (movement_type) {
        case 'inbound':
          newQty += qty;
          break;

        case 'outbound':
          newQty -= qty;
          if (newQty < 0) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Insufficient stock quantity for outbound movement' });
          }
          break;

        case 'transfer':
          // In this simplified unique SKU schema, a transfer shifts the asset's zone location
          if (!to_zone_id) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Destination zone (to_zone_id) is required for transfer' });
          }
          asset.zone_id = parseInt(to_zone_id, 10);
          break;

        case 'adjustment':
          newQty = qty; // resets to this value
          break;

        default:
          await transaction.rollback();
          return res.status(400).json({ error: 'Invalid movement type' });
      }

      // Update asset quantity and timestamp
      asset.quantity = newQty;
      asset.last_updated_at = new Date();
      await asset.save({ transaction });

      // Log the movement
      const log = await AssetMovement.create(
        {
          asset_id: asset.id,
          from_zone_id: from_zone_id ? parseInt(from_zone_id, 10) : null,
          to_zone_id: to_zone_id ? parseInt(to_zone_id, 10) : null,
          quantity: qty,
          movement_type,
          operator_id: req.user.id,
          reference_no: reference_no || `MOV-${Date.now()}`,
          notes,
        },
        { transaction }
      );

      await transaction.commit();
      return res.status(201).json({ message: 'Stock movement recorded successfully', log, asset });
    } catch (err) {
      await transaction.rollback();
      console.error('Record stock movement transaction failed:', err);
      return res.status(500).json({ error: 'Failed to record stock movement' });
    }
  }

  /**
   * Retrieve items running below their min stock limits.
   */
  public static async getLowStock(req: AuthenticatedRequest, res: Response) {
    const { warehouse_id } = req.query;

    const filter: any = {
      quantity: {
        [Op.lt]: sequelize.col('min_stock_level'),
      },
    };

    if (warehouse_id) {
      filter.warehouse_id = parseInt(warehouse_id as string, 10);
    }

    if (req.user && req.user.role !== 'superadmin' && req.user.warehouse_id) {
      filter.warehouse_id = req.user.warehouse_id;
    }

    try {
      const lowStockAssets = await Asset.findAll({
        where: filter,
        include: [{ model: Zone, as: 'zone' }],
      });
      return res.status(200).json(lowStockAssets);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch low stock list' });
    }
  }

  /**
   * Fetch movement logs.
   */
  public static async getMovements(req: AuthenticatedRequest, res: Response) {
    const { warehouse_id, asset_id, start, end } = req.query;

    const filter: any = {};
    const assetFilter: any = {};

    if (warehouse_id) assetFilter.warehouse_id = parseInt(warehouse_id as string, 10);
    if (asset_id) filter.asset_id = parseInt(asset_id as string, 10);

    if (start || end) {
      filter.created_at = {};
      if (start) filter.created_at[Op.gte] = new Date(start as string);
      if (end) filter.created_at[Op.lte] = new Date(end as string);
    }

    if (req.user && req.user.role !== 'superadmin' && req.user.warehouse_id) {
      assetFilter.warehouse_id = req.user.warehouse_id;
    }

    try {
      const movements = await AssetMovement.findAll({
        where: filter,
        include: [
          {
            model: Asset,
            as: 'asset',
            where: assetFilter,
            attributes: ['id', 'name', 'sku', 'warehouse_id'],
          },
          { model: Zone, as: 'fromZone', attributes: ['id', 'name'] },
          { model: Zone, as: 'toZone', attributes: ['id', 'name'] },
          { model: User, as: 'operator', attributes: ['id', 'name', 'email'] },
        ],
        order: [['created_at', 'DESC']],
      });
      return res.status(200).json(movements);
    } catch (err) {
      console.error('Get movements error:', err);
      return res.status(500).json({ error: 'Failed to fetch stock movements logs' });
    }
  }

  /**
   * Valuation details: sum of values by Category and Zone.
   */
  public static async getValuation(req: AuthenticatedRequest, res: Response) {
    const { warehouse_id } = req.query;

    const filter: any = {};
    if (warehouse_id) filter.warehouse_id = parseInt(warehouse_id as string, 10);

    if (req.user && req.user.role !== 'superadmin' && req.user.warehouse_id) {
      filter.warehouse_id = req.user.warehouse_id;
    }

    try {
      const assets = await Asset.findAll({
        where: filter,
        include: [{ model: Zone, as: 'zone', attributes: ['id', 'name'] }],
      });

      const valuationByZone: { [zoneName: string]: number } = {};
      const valuationByCategory: { [category: string]: number } = {};
      let totalValuation = 0;

      assets.forEach((asset) => {
        const value = Number(asset.quantity) * Number(asset.unit_price);
        totalValuation += value;

        // Group by zone
        const zoneName = asset.zone ? asset.zone.name : 'Unassigned';
        valuationByZone[zoneName] = (valuationByZone[zoneName] || 0) + value;

        // Group by category
        valuationByCategory[asset.category] = (valuationByCategory[asset.category] || 0) + value;
      });

      // Format for charts
      const zoneData = Object.keys(valuationByZone).map((zone) => ({
        name: zone,
        value: parseFloat(valuationByZone[zone].toFixed(2)),
      }));

      const categoryData = Object.keys(valuationByCategory).map((cat) => ({
        name: cat,
        value: parseFloat(valuationByCategory[cat].toFixed(2)),
      }));

      return res.status(200).json({
        total: parseFloat(totalValuation.toFixed(2)),
        byZone: zoneData,
        byCategory: categoryData,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to process asset valuation stats' });
    }
  }
}
export default AssetController;
