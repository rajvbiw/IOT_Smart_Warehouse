import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Device, MaintenanceLog, User } from '../models';
import { redisService } from '../services/redis.service';
import { influxService } from '../services/influx.service';
import { Op } from 'sequelize';

export class DeviceController {
  public static async list(req: AuthenticatedRequest, res: Response) {
    const { warehouse_id, zone_id, status, type } = req.query;

    const filter: any = {};
    if (warehouse_id) filter.warehouse_id = parseInt(warehouse_id as string, 10);
    if (zone_id) filter.zone_id = parseInt(zone_id as string, 10);
    if (status) filter.status = status as string;
    if (type) filter.type = type as string;

    // Apply scoping limits
    if (req.user && req.user.role !== 'superadmin' && req.user.warehouse_id) {
      filter.warehouse_id = req.user.warehouse_id;
    }

    try {
      const devices = await Device.findAll({ where: filter });
      return res.status(200).json(devices);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve devices' });
    }
  }

  public static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const device = await Device.findByPk(req.params.id);
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }
      return res.status(200).json(device);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve device' });
    }
  }

  public static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const device = await Device.create(req.body);
      return res.status(201).json(device);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to create device' });
    }
  }

  public static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const device = await Device.findByPk(req.params.id);
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }
      await device.update(req.body);
      return res.status(200).json(device);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update device' });
    }
  }

  public static async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const device = await Device.findByPk(req.params.id);
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }
      await device.destroy();
      return res.status(200).json({ message: 'Device deleted successfully' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete device' });
    }
  }

  /**
   * Retrieves cached latest readings from Redis.
   */
  public static async getLatest(req: AuthenticatedRequest, res: Response) {
    try {
      const device = await Device.findByPk(req.params.id);
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }

      const latest = await redisService.getLatestReading(device.device_uid);
      if (!latest) {
        return res.status(200).json({
          device_uid: device.device_uid,
          status: device.status,
          message: 'No recent readings in cache',
          last_seen_at: device.last_seen_at,
        });
      }

      return res.status(200).json(latest);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch latest cache reading' });
    }
  }

  /**
   * Query historical telemetry values for this device from InfluxDB.
   */
  public static async getReadings(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    let { start, end, interval } = req.query;

    try {
      const device = await Device.findByPk(id);
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }

      // Sensible defaults
      start = start || '-24h';
      end = end || 'now()';
      interval = interval || '1h';

      // Check if start is an ISO Date, if so format it properly for Flux (e.g. 2026-06-12T10:00:00Z)
      const formattedStart = start.toString().startsWith('-') ? start.toString() : `${start}`;
      const formattedEnd = end.toString() === 'now()' ? 'now()' : `${end}`;

      const fluxQuery = `
        from(bucket: "${influxService.getBucket()}")
          |> range(start: ${formattedStart}, stop: ${formattedEnd})
          |> filter(fn: (r) => r["device_uid"] == "${device.device_uid}")
          |> filter(fn: (r) => r["_measurement"] == "sensor_readings")
          |> filter(fn: (r) => r["_field"] == "value")
          |> aggregateWindow(every: ${interval}, fn: mean, createEmpty: false)
          |> yield(name: "mean")
      `;

      const rows = await influxService.query(fluxQuery);
      
      const readings = rows.map((r) => ({
        time: r._time,
        value: r._value,
        device_uid: r.device_uid,
        metric: r.device_type,
      }));

      return res.status(200).json(readings);
    } catch (err) {
      console.error('Influx query error in getReadings:', err);
      return res.status(500).json({ error: 'Failed to query historical data from InfluxDB' });
    }
  }

  /**
   * Log maintenance calibration and update status.
   */
  public static async logMaintenance(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { maintenance_type, description, cost, next_maintenance_date, status_change } = req.body;

    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const device = await Device.findByPk(id);
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }

      // Log entry
      const log = await MaintenanceLog.create({
        device_id: device.id,
        performed_by: req.user.id,
        maintenance_type,
        description,
        cost: parseFloat(cost || '0'),
        next_maintenance_date: next_maintenance_date || null,
      });

      // Optionally change status
      if (status_change && ['online', 'offline', 'maintenance'].includes(status_change)) {
        await device.update({ status: status_change });
      }

      return res.status(201).json({
        message: 'Maintenance logged successfully',
        log,
      });
    } catch (err) {
      console.error('Maintenance error:', err);
      return res.status(500).json({ error: 'Failed to record maintenance event' });
    }
  }

  /**
   * Find offline devices not seen in the last 5 minutes.
   */
  public static async getOffline(req: AuthenticatedRequest, res: Response) {
    const { warehouse_id } = req.query;

    const filter: any = {
      [Op.or]: [
        { last_seen_at: { [Op.lt]: new Date(Date.now() - 5 * 60 * 1000) } },
        { last_seen_at: null },
      ],
    };

    if (warehouse_id) {
      filter.warehouse_id = parseInt(warehouse_id as string, 10);
    }

    if (req.user && req.user.role !== 'superadmin' && req.user.warehouse_id) {
      filter.warehouse_id = req.user.warehouse_id;
    }

    try {
      const offlineDevices = await Device.findAll({
        where: filter,
      });
      return res.status(200).json(offlineDevices);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch offline devices' });
    }
  }
}
export default DeviceController;
