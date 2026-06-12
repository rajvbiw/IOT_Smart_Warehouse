import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Device, Zone, Alert } from '../models';
import { redisService } from '../services/redis.service';
import { influxService } from '../services/influx.service';
import { Op } from 'sequelize';

export class SensorController {
  /**
   * Fetches latest readings from Redis cache for all devices in a warehouse.
   */
  public static async getLive(req: AuthenticatedRequest, res: Response) {
    const { warehouse_id } = req.query;
    if (!warehouse_id) {
      return res.status(400).json({ error: 'warehouse_id query parameter is required' });
    }

    const wId = parseInt(warehouse_id as string, 10);
    if (req.user && req.user.role !== 'superadmin' && req.user.warehouse_id !== wId) {
      return res.status(403).json({ error: 'Access denied to this warehouse' });
    }

    try {
      const devices = await Device.findAll({
        where: { warehouse_id: wId },
      });

      const liveReadings = [];
      for (const dev of devices) {
        const cached = await redisService.getLatestReading(dev.device_uid);
        if (cached) {
          liveReadings.push(cached);
        } else {
          // Return default object if not in Redis
          liveReadings.push({
            device_uid: dev.device_uid,
            metric: dev.type,
            value: null,
            battery_level: dev.battery_level,
            signal_strength: dev.signal_strength,
            timestamp: dev.last_seen_at || new Date(),
            warehouse_id: dev.warehouse_id,
            zone_id: dev.zone_id,
          });
        }
      }

      return res.status(200).json(liveReadings);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch live sensor readings' });
    }
  }

  /**
   * Query historical telemetry values from InfluxDB.
   */
  public static async getHistory(req: AuthenticatedRequest, res: Response) {
    const { device_uid, metric, start, end, interval } = req.query;

    if (!device_uid) {
      return res.status(400).json({ error: 'device_uid is required' });
    }

    try {
      const startRange = start || '-24h';
      const endRange = end || 'now()';
      const windowInt = interval || '5m';

      const fluxQuery = `
        from(bucket: "${influxService.getBucket()}")
          |> range(start: ${startRange}, stop: ${endRange})
          |> filter(fn: (r) => r["device_uid"] == "${device_uid}")
          |> filter(fn: (r) => r["_measurement"] == "sensor_readings")
          ${metric ? `|> filter(fn: (r) => r["device_type"] == "${metric}")` : ''}
          |> filter(fn: (r) => r["_field"] == "value")
          |> aggregateWindow(every: ${windowInt}, fn: mean, createEmpty: false)
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
      console.error('History query failed:', err);
      return res.status(500).json({ error: 'Failed to fetch timeseries data' });
    }
  }

  /**
   * Returns average metric values grouped by Zone to construct heatmaps.
   */
  public static async getHeatmap(req: AuthenticatedRequest, res: Response) {
    const { warehouse_id, metric } = req.query;

    if (!warehouse_id || !metric) {
      return res.status(400).json({ error: 'warehouse_id and metric are required' });
    }

    const wId = parseInt(warehouse_id as string, 10);

    try {
      const zones = await Zone.findAll({ where: { warehouse_id: wId } });
      const devices = await Device.findAll({ where: { warehouse_id: wId, type: metric as string } });

      const heatmapData = [];

      for (const zone of zones) {
        const zoneDevices = devices.filter((d) => d.zone_id === zone.id);
        let sum = 0;
        let count = 0;

        for (const dev of zoneDevices) {
          const cached = await redisService.getLatestReading(dev.device_uid);
          if (cached && cached.value !== null) {
            sum += cached.value;
            count++;
          }
        }

        heatmapData.push({
          zone_id: zone.id,
          zone_name: zone.name,
          value: count > 0 ? parseFloat((sum / count).toFixed(2)) : null,
          min_threshold: metric === 'temperature' ? zone.min_temp : zone.min_humidity,
          max_threshold: metric === 'temperature' ? zone.max_temp : zone.max_humidity,
        });
      }

      return res.status(200).json(heatmapData);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to generate heatmap' });
    }
  }

  /**
   * Analytics: returns avg/min/max per zone per metric type.
   */
  public static async getAnalytics(req: AuthenticatedRequest, res: Response) {
    const { warehouse_id, start, end } = req.query;

    if (!warehouse_id) {
      return res.status(400).json({ error: 'warehouse_id is required' });
    }

    const wId = parseInt(warehouse_id as string, 10);
    const startRange = start || '-7d';
    const endRange = end || 'now()';

    const fluxQuery = `
      from(bucket: "${influxService.getBucket()}")
        |> range(start: ${startRange}, stop: ${endRange})
        |> filter(fn: (r) => r["warehouse_id"] == "${wId}")
        |> filter(fn: (r) => r["_measurement"] == "sensor_readings")
        |> filter(fn: (r) => r["_field"] == "value")
        |> group(columns: ["zone_id", "device_type"])
    `;

    try {
      const rows = await influxService.query(fluxQuery);
      const zones = await Zone.findAll({ where: { warehouse_id: wId } });

      // Group and calculate min, max, avg in memory
      const groups: { [key: string]: number[] } = {};

      rows.forEach((row) => {
        const key = `${row.zone_id}_${row.device_type}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(row._value);
      });

      const analytics = [];

      for (const key in groups) {
        const [zoneIdStr, metricType] = key.split('_');
        const zoneId = parseInt(zoneIdStr, 10);
        const zone = zones.find((z) => z.id === zoneId);
        const values = groups[key];

        const min = Math.min(...values);
        const max = Math.max(...values);
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;

        analytics.push({
          zone_id: zoneId,
          zone_name: zone ? zone.name : 'Unknown Zone',
          metric: metricType,
          min: parseFloat(min.toFixed(2)),
          max: parseFloat(max.toFixed(2)),
          avg: parseFloat(avg.toFixed(2)),
          count: values.length,
        });
      }

      return res.status(200).json(analytics);
    } catch (err) {
      console.error('Analytics query failed:', err);
      return res.status(500).json({ error: 'Failed to process sensor analytics' });
    }
  }

  /**
   * Export historical readings to a CSV attachment.
   */
  public static async exportCsv(req: AuthenticatedRequest, res: Response) {
    const { warehouse_id, start, end } = req.query;

    if (!warehouse_id) {
      return res.status(400).json({ error: 'warehouse_id is required' });
    }

    const wId = parseInt(warehouse_id as string, 10);
    const startRange = start || '-24h';
    const endRange = end || 'now()';

    const fluxQuery = `
      from(bucket: "${influxService.getBucket()}")
        |> range(start: ${startRange}, stop: ${endRange})
        |> filter(fn: (r) => r["warehouse_id"] == "${wId}")
        |> filter(fn: (r) => r["_measurement"] == "sensor_readings")
        |> filter(fn: (r) => r["_field"] == "value")
        |> yield(name: "export")
    `;

    try {
      const rows = await influxService.query(fluxQuery);
      
      // Build CSV headers
      let csvContent = 'Timestamp,Device UID,Metric,Value,Battery %,Signal RSSI (dBm),Zone ID,Zone Name\n';

      rows.forEach((r) => {
        csvContent += `"${r._time}","${r.device_uid}","${r.device_type}",${r._value},${r.battery_level || ''},${r.signal_strength || ''},"${r.zone_id || ''}","${r.zone_name || ''}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=warehouse_${wId}_telemetry.csv`);
      return res.status(200).send(csvContent);
    } catch (err) {
      console.error('CSV export failed:', err);
      return res.status(500).json({ error: 'Failed to generate CSV export file' });
    }
  }

  /**
   * Anomalies list: critical alerts triggered in the last X hours.
   */
  public static async getAnomalies(req: AuthenticatedRequest, res: Response) {
    const { warehouse_id, hours } = req.query;

    if (!warehouse_id) {
      return res.status(400).json({ error: 'warehouse_id is required' });
    }

    const wId = parseInt(warehouse_id as string, 10);
    const windowHours = parseInt((hours || '24') as string, 10);
    const cutOffDate = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    try {
      const anomalies = await Alert.findAll({
        where: {
          warehouse_id: wId,
          severity: { [Op.or]: ['warning', 'critical'] },
          created_at: { [Op.gte]: cutOffDate },
        },
        include: [{ model: Device, as: 'device' }],
        order: [['created_at', 'DESC']],
      });

      return res.status(200).json(anomalies);
    } catch (err) {
      console.error('Fetch anomalies error:', err);
      return res.status(500).json({ error: 'Failed to fetch sensor anomalies' });
    }
  }
}
export default SensorController;
