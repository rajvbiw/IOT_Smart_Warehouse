import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Warehouse, Zone, Device, Alert, Asset } from '../models';
import { redisService } from '../services/redis.service';

export class WarehouseController {
  public static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const scope: any = {};
      if (req.user && req.user.role !== 'superadmin' && req.user.warehouse_id) {
        scope.id = req.user.warehouse_id;
      }
      const warehouses = await Warehouse.findAll({ where: scope });
      return res.status(200).json(warehouses);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve warehouses' });
    }
  }

  public static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const warehouse = await Warehouse.create(req.body);
      return res.status(201).json(warehouse);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to create warehouse' });
    }
  }

  public static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const warehouse = await Warehouse.findByPk(req.params.id);
      if (!warehouse) {
        return res.status(404).json({ error: 'Warehouse not found' });
      }
      return res.status(200).json(warehouse);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve warehouse' });
    }
  }

  public static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const warehouse = await Warehouse.findByPk(req.params.id);
      if (!warehouse) {
        return res.status(404).json({ error: 'Warehouse not found' });
      }
      await warehouse.update(req.body);
      return res.status(200).json(warehouse);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update warehouse' });
    }
  }

  public static async getZones(req: AuthenticatedRequest, res: Response) {
    const warehouseId = parseInt(req.params.id, 10);
    try {
      const zones = await Zone.findAll({
        where: { warehouse_id: warehouseId },
      });
      return res.status(200).json(zones);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve zones' });
    }
  }

  /**
   * Aggregate statistics for a specific warehouse:
   * Online/offline devices, open alerts by severity,
   * average temperature, average humidity, low stock count, total asset value.
   */
  public static async getStats(req: AuthenticatedRequest, res: Response) {
    const warehouseId = parseInt(req.params.id, 10);

    try {
      // 1. Fetch devices and partition online/offline
      const devices = await Device.findAll({ where: { warehouse_id: warehouseId } });
      const online_devices = devices.filter((d) => d.status === 'online').length;
      const offline_devices = devices.filter((d) => d.status === 'offline').length;

      // 2. Fetch open alerts count grouped by severity
      const openAlerts = await Alert.findAll({
        where: { warehouse_id: warehouseId, status: 'open' },
      });
      const open_alerts = {
        critical: openAlerts.filter((a) => a.severity === 'critical').length,
        warning: openAlerts.filter((a) => a.severity === 'warning').length,
        info: openAlerts.filter((a) => a.severity === 'info').length,
      };

      // 3. Compute real-time averages from Redis cache for temperature/humidity
      let tempSum = 0;
      let tempCount = 0;
      let humSum = 0;
      let humCount = 0;

      for (const dev of devices) {
        const cached = await redisService.getLatestReading(dev.device_uid);
        if (cached && cached.value !== undefined) {
          if (dev.type === 'temperature') {
            tempSum += cached.value;
            tempCount++;
          } else if (dev.type === 'humidity') {
            humSum += cached.value;
            humCount++;
          }
        }
      }

      const avg_temp = tempCount > 0 ? parseFloat((tempSum / tempCount).toFixed(1)) : 22.5; // fallback
      const avg_humidity = humCount > 0 ? parseFloat((humSum / humCount).toFixed(1)) : 50.0; // fallback

      // 4. Stock calculations
      const assets = await Asset.findAll({ where: { warehouse_id: warehouseId } });
      let low_stock_count = 0;
      let total_asset_value = 0;

      assets.forEach((asset) => {
        const qty = Number(asset.quantity);
        const minLvl = Number(asset.min_stock_level);
        const price = Number(asset.unit_price);

        if (qty < minLvl) {
          low_stock_count++;
        }
        total_asset_value += qty * price;
      });

      return res.status(200).json({
        online_devices,
        offline_devices,
        open_alerts,
        avg_temp,
        avg_humidity,
        low_stock_count,
        total_asset_value: parseFloat(total_asset_value.toFixed(2)),
      });
    } catch (err) {
      console.error(`Error aggregating warehouse stats for ID ${warehouseId}:`, err);
      return res.status(500).json({ error: 'Failed to compile warehouse statistics' });
    }
  }
}
export default WarehouseController;
