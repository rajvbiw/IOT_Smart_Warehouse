import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Device, Alert, Asset, AssetMovement, Zone, User } from '../models';
import { redisService } from '../services/redis.service';
import { Op } from 'sequelize';

export class DashboardController {
  /**
   * Fetches overall real-time counts, status totals, and today's activity stats.
   */
  public static async getOverview(req: AuthenticatedRequest, res: Response) {
    const { warehouse_id } = req.query;
    if (!warehouse_id) return res.status(400).json({ error: 'warehouse_id query param is required' });

    const wId = parseInt(warehouse_id as string, 10);

    try {
      // 1. Device counts
      const devices = await Device.findAll({ where: { warehouse_id: wId } });
      const online_devices = devices.filter((d) => d.status === 'online').length;
      const offline_devices = devices.filter((d) => d.status === 'offline').length;

      // 2. Open alerts
      const openAlerts = await Alert.findAll({ where: { warehouse_id: wId, status: 'open' } });
      const open_alerts = {
        critical: openAlerts.filter((a) => a.severity === 'critical').length,
        warning: openAlerts.filter((a) => a.severity === 'warning').length,
        info: openAlerts.filter((a) => a.severity === 'info').length,
        total: openAlerts.length,
      };

      // 3. Averages from Redis
      let tempSum = 0, tempCount = 0;
      let humSum = 0, humCount = 0;
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

      const avg_temperature = tempCount > 0 ? parseFloat((tempSum / tempCount).toFixed(1)) : 22.0;
      const avg_humidity = humCount > 0 ? parseFloat((humSum / humCount).toFixed(1)) : 52.0;

      // 4. Asset details
      const assets = await Asset.findAll({ where: { warehouse_id: wId } });
      let low_stock_items = 0;
      let total_assets = 0;

      assets.forEach((asset) => {
        total_assets += Number(asset.quantity);
        if (Number(asset.quantity) < Number(asset.min_stock_level)) {
          low_stock_items++;
        }
      });

      // 5. Activity metrics
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const alerts_last_24h = await Alert.count({
        where: { warehouse_id: wId, created_at: { [Op.gte]: last24h } },
      });

      const movements_today = await AssetMovement.count({
        where: { created_at: { [Op.gte]: startOfToday } },
        include: [
          {
            model: Asset,
            as: 'asset',
            where: { warehouse_id: wId },
            attributes: [],
          },
        ],
      });

      return res.status(200).json({
        online_devices,
        offline_devices,
        open_alerts,
        avg_temperature,
        avg_humidity,
        low_stock_items,
        total_assets,
        alerts_last_24h,
        movements_today,
      });
    } catch (err) {
      console.error('Overview aggregation failed:', err);
      return res.status(500).json({ error: 'Failed to aggregate dashboard overview metrics' });
    }
  }

  /**
   * Retrieves mixed event logs (alerts + movements) sorted by timestamp.
   */
  public static async getTimeline(req: AuthenticatedRequest, res: Response) {
    const { warehouse_id, hours } = req.query;
    if (!warehouse_id) return res.status(400).json({ error: 'warehouse_id is required' });

    const wId = parseInt(warehouse_id as string, 10);
    const windowHours = parseInt((hours || '24') as string, 10);
    const timeCutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    try {
      // 1. Query Alerts
      const alerts = await Alert.findAll({
        where: { warehouse_id: wId, created_at: { [Op.gte]: timeCutoff } },
        include: [{ model: Device, as: 'device', attributes: ['name'] }],
      });

      // 2. Query Asset Movements
      const movements = await AssetMovement.findAll({
        where: { created_at: { [Op.gte]: timeCutoff } },
        include: [
          {
            model: Asset,
            as: 'asset',
            where: { warehouse_id: wId },
            attributes: ['name', 'sku'],
          },
          { model: User, as: 'operator', attributes: ['name'] },
        ],
      });

      // 3. Map both lists to a single common event object
      const events: any[] = [];

      alerts.forEach((alert) => {
        events.push({
          id: `alert_${alert.id}`,
          event_type: 'alert',
          title: `Alert: ${alert.severity.toUpperCase()}`,
          description: alert.message,
          timestamp: alert.created_at,
          severity: alert.severity,
          status: alert.status,
          ref_id: alert.id,
        });
      });

      movements.forEach((mov) => {
        events.push({
          id: `movement_${mov.id}`,
          event_type: 'movement',
          title: `Stock ${mov.movement_type.toUpperCase()}`,
          description: `Asset '${mov.asset?.name}' quantity changed by ${mov.quantity} units (Ref: ${mov.reference_no})`,
          timestamp: mov.created_at,
          operator: mov.operator?.name,
          ref_id: mov.id,
        });
      });

      // Sort timeline events in DESC order (latest first)
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return res.status(200).json(events);
    } catch (err) {
      console.error('Timeline build failed:', err);
      return res.status(500).json({ error: 'Failed to construct events timeline' });
    }
  }

  /**
   * Retrieves status and readings for all Zones in a warehouse.
   */
  public static async getZones(req: AuthenticatedRequest, res: Response) {
    const { warehouse_id } = req.query;
    if (!warehouse_id) return res.status(400).json({ error: 'warehouse_id is required' });

    const wId = parseInt(warehouse_id as string, 10);

    try {
      const zones = await Zone.findAll({ where: { warehouse_id: wId } });
      const devices = await Device.findAll({ where: { warehouse_id: wId } });
      const openAlerts = await Alert.findAll({ where: { warehouse_id: wId, status: 'open' } });

      const zoneStatusList = [];

      for (const zone of zones) {
        const zoneDevices = devices.filter((d) => d.zone_id === zone.id);
        const zoneAlerts = openAlerts.filter((a) => zoneDevices.some((d) => d.id === a.device_id));

        // Calculate average readings from Redis for this zone's devices
        let tempSum = 0, tempCount = 0;
        let humSum = 0, humCount = 0;

        for (const dev of zoneDevices) {
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

        // Determine zone overall status
        let status = 'green'; // normal
        if (zoneAlerts.some((a) => a.severity === 'critical')) {
          status = 'red'; // alert
        } else if (zoneAlerts.some((a) => a.severity === 'warning')) {
          status = 'yellow'; // warning
        }

        zoneStatusList.push({
          id: zone.id,
          name: zone.name,
          zone_type: zone.zone_type,
          device_count: zoneDevices.length,
          alert_count: zoneAlerts.length,
          status,
          latest_readings: {
            avg_temp: tempCount > 0 ? parseFloat((tempSum / tempCount).toFixed(2)) : null,
            avg_humidity: humCount > 0 ? parseFloat((humSum / humCount).toFixed(2)) : null,
          },
        });
      }

      return res.status(200).json(zoneStatusList);
    } catch (err) {
      console.error('Zone aggregator failed:', err);
      return res.status(500).json({ error: 'Failed to retrieve per-zone status overview' });
    }
  }
}
export default DashboardController;
