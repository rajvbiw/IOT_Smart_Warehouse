import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Report, Warehouse, Alert, AssetMovement, Device, User } from '../models';
import { s3Service } from '../services/s3.service';
import { Op } from 'sequelize';

export class ReportController {
  public static async list(req: AuthenticatedRequest, res: Response) {
    const { warehouse_id } = req.query;

    const filter: any = {};
    if (warehouse_id) filter.warehouse_id = parseInt(warehouse_id as string, 10);

    if (req.user && req.user.role !== 'superadmin' && req.user.warehouse_id) {
      filter.warehouse_id = req.user.warehouse_id;
    }

    try {
      const reports = await Report.findAll({
        where: filter,
        order: [['created_at', 'DESC']],
      });
      return res.status(200).json(reports);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve reports list' });
    }
  }

  /**
   * Generates a report asynchronously, uploads it to S3, and saves it in MySQL.
   */
  public static async generate(req: AuthenticatedRequest, res: Response) {
    const { warehouse_id, report_type, parameters } = req.body;

    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!warehouse_id || !report_type) {
      return res.status(400).json({ error: 'warehouse_id and report_type are required' });
    }

    const wId = parseInt(warehouse_id, 10);

    try {
      const warehouse = await Warehouse.findByPk(wId);
      if (!warehouse) {
        return res.status(404).json({ error: 'Warehouse not found' });
      }

      // 1. Create a pending report placeholder in database
      const report = await Report.create({
        warehouse_id: wId,
        report_type,
        generated_by: req.user.id,
        parameters_json: parameters || {},
        s3_file_url: 'pending',
      });

      // 2. Spawn generation in background to avoid blocking request (async)
      const userId = req.user.id;
      setTimeout(async () => {
        try {
          let csvData = '';
          const reportDate = parameters?.date ? new Date(parameters.date) : new Date();

          if (report_type === 'Daily Summary' || report_type === 'daily_summary') {
            // Compile daily summary CSV
            const startOfDay = new Date(reportDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(reportDate.setHours(23, 59, 59, 999));

            const alertCount = await Alert.count({
              where: { warehouse_id: wId, created_at: { [Op.between]: [startOfDay, endOfDay] } },
            });

            const movementCount = await AssetMovement.count({
              where: { created_at: { [Op.between]: [startOfDay, endOfDay] } },
            });

            csvData = `Daily Report Summary for Warehouse: ${warehouse.name}\n`;
            csvData += `Date: ${startOfDay.toDateString()}\n\n`;
            csvData += `Key Metrics,Value\n`;
            csvData += `Triggered Alerts,${alertCount}\n`;
            csvData += `Inventory Movements,${movementCount}\n`;
          } else if (report_type === 'Asset Report' || report_type === 'asset_report') {
            // Compile asset list CSV
            const assets = await Warehouse.findByPk(wId, {
              include: ['assets'],
            });
            const list = (assets as any)?.assets || [];

            csvData = `Inventory Asset Valuation Report for Warehouse: ${warehouse.name}\n\n`;
            csvData += `SKU,Name,Category,Quantity,Unit,Unit Price,Total Valuation\n`;
            
            list.forEach((asset: any) => {
              const val = Number(asset.quantity) * Number(asset.unit_price);
              csvData += `"${asset.sku}","${asset.name}","${asset.category}",${asset.quantity},"${asset.unit}",$${asset.unit_price},$${val.toFixed(2)}\n`;
            });
          } else {
            // Default generic telemetry report
            csvData = `Generic System Report for Warehouse: ${warehouse.name}\n`;
            csvData += `Generated at: ${new Date().toISOString()}\n`;
          }

          // 3. Upload to S3
          const key = `reports/wh-${wId}-${report_type.toLowerCase().replace(' ', '_')}-${Date.now()}.csv`;
          const s3Url = await s3Service.uploadReport(key, Buffer.from(csvData), 'text/csv');

          // 4. Update the MySQL report URL record
          await report.update({ s3_file_url: s3Url });
          console.log(`Async report generation finished. S3 URL: ${s3Url}`);
        } catch (err) {
          console.error(`Async report generation failed for report ID ${report.id}:`, err);
          await report.update({ s3_file_url: 'failed' });
        }
      }, 500); // short delay to return response first

      return res.status(202).json({
        message: 'Report generation started successfully',
        report_id: report.id,
        status: 'pending',
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to trigger report generation' });
    }
  }

  /**
   * Generates S3 pre-signed link and redirects/sends it to the client.
   */
  public static async download(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    try {
      const report = await Report.findByPk(id);
      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      if (report.s3_file_url === 'pending') {
        return res.status(400).json({ error: 'Report is still being compiled' });
      }
      if (report.s3_file_url === 'failed') {
        return res.status(400).json({ error: 'Report generation failed' });
      }

      const preSignedUrl = await s3Service.getSignedUrl(report.s3_file_url);
      return res.status(200).json({ downloadUrl: preSignedUrl });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to generate download URL' });
    }
  }

  /**
   * Daily Report Preview JSON.
   */
  public static async getDaily(req: AuthenticatedRequest, res: Response) {
    const { warehouse_id, date } = req.query;
    if (!warehouse_id) return res.status(400).json({ error: 'warehouse_id is required' });

    const wId = parseInt(warehouse_id as string, 10);
    const filterDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(filterDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(filterDate.setHours(23, 59, 59, 999));

    try {
      const alerts = await Alert.findAll({
        where: { warehouse_id: wId, created_at: { [Op.between]: [startOfDay, endOfDay] } },
        include: [{ model: Device, as: 'device', attributes: ['name', 'type'] }],
      });

      const movements = await AssetMovement.findAll({
        where: { created_at: { [Op.between]: [startOfDay, endOfDay] } },
        include: [{ model: User, as: 'operator', attributes: ['name'] }],
      });

      const devices = await Device.findAll({ where: { warehouse_id: wId } });
      const online = devices.filter((d) => d.status === 'online').length;
      const offline = devices.filter((d) => d.status === 'offline').length;

      return res.status(200).json({
        date: startOfDay.toDateString(),
        device_status: { online, offline },
        alert_count: alerts.length,
        movement_count: movements.length,
        alerts_list: alerts,
        movements_list: movements,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to compile daily preview data' });
    }
  }

  /**
   * Monthly Report Preview JSON.
   */
  public static async getMonthly(req: AuthenticatedRequest, res: Response) {
    const { warehouse_id, month, year } = req.query;
    if (!warehouse_id) return res.status(400).json({ error: 'warehouse_id is required' });

    const wId = parseInt(warehouse_id as string, 10);
    const m = month ? parseInt(month as string, 10) - 1 : new Date().getMonth();
    const y = year ? parseInt(year as string, 10) : new Date().getFullYear();

    const startOfMonth = new Date(y, m, 1);
    const endOfMonth = new Date(y, m + 1, 0, 23, 59, 59, 999);

    try {
      const alerts = await Alert.count({
        where: { warehouse_id: wId, created_at: { [Op.between]: [startOfMonth, endOfMonth] } },
      });

      const movements = await AssetMovement.count({
        where: { created_at: { [Op.between]: [startOfMonth, endOfMonth] } },
      });

      return res.status(200).json({
        period: `${startOfMonth.toLocaleString('default', { month: 'long' })} ${y}`,
        alerts_triggered: alerts,
        stock_movements: movements,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to compile monthly preview data' });
    }
  }
}
export default ReportController;
