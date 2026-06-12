import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Alert, AlertRule, Device, User } from '../models';
import { socketService } from '../services/socket.service';

export class AlertController {
  /**
   * List alerts with filters (warehouse, severity, status, device).
   */
  public static async list(req: AuthenticatedRequest, res: Response) {
    const { warehouse_id, severity, status, device_id } = req.query;

    const filter: any = {};
    if (warehouse_id) filter.warehouse_id = parseInt(warehouse_id as string, 10);
    if (severity) filter.severity = severity as string;
    if (status) filter.status = status as string;
    if (device_id) filter.device_id = parseInt(device_id as string, 10);

    // Apply scoping limits
    if (req.user && req.user.role !== 'superadmin' && req.user.warehouse_id) {
      filter.warehouse_id = req.user.warehouse_id;
    }

    try {
      const alerts = await Alert.findAll({
        where: filter,
        include: [
          { model: Device, as: 'device' },
          { model: User, as: 'acknowledgedByUser', attributes: ['id', 'name', 'email'] },
        ],
        order: [['created_at', 'DESC']],
      });
      return res.status(200).json(alerts);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve alerts' });
    }
  }

  public static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const alert = await Alert.findByPk(req.params.id, {
        include: [
          { model: Device, as: 'device' },
          { model: User, as: 'acknowledgedByUser', attributes: ['id', 'name', 'email'] },
        ],
      });
      if (!alert) {
        return res.status(404).json({ error: 'Alert not found' });
      }
      return res.status(200).json(alert);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve alert' });
    }
  }

  /**
   * Acknowledge alert with user notes.
   */
  public static async acknowledge(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { note } = req.body;

    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const alert = await Alert.findByPk(id);
      if (!alert) {
        return res.status(404).json({ error: 'Alert not found' });
      }

      await alert.update({
        status: 'acknowledged',
        acknowledged_by: req.user.id,
        acknowledged_at: new Date(),
        acknowledged_note: note || '',
      });

      // Emit event
      socketService.emitToWarehouse(alert.warehouse_id, 'alert_acknowledged', {
        alert_id: alert.id,
        acknowledged_by: req.user.name,
        acknowledged_at: alert.acknowledged_at,
        acknowledged_note: note || '',
      });

      return res.status(200).json({ message: 'Alert acknowledged', alert });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to acknowledge alert' });
    }
  }

  /**
   * Bulk Acknowledge alerts.
   */
  public static async bulkAcknowledge(req: AuthenticatedRequest, res: Response) {
    const { alertIds, note } = req.body;

    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      return res.status(400).json({ error: 'alertIds must be a non-empty array' });
    }

    try {
      const filter: any = { id: alertIds };

      // Ensure user doesn't acknowledge alerts of other warehouses if constrained
      if (req.user.role !== 'superadmin' && req.user.warehouse_id) {
        filter.warehouse_id = req.user.warehouse_id;
      }

      await Alert.update(
        {
          status: 'acknowledged',
          acknowledged_by: req.user.id,
          acknowledged_at: new Date(),
          acknowledged_note: note || 'Bulk Acknowledged',
        },
        {
          where: filter,
        }
      );

      // Fetch the alerts we just updated to emit socket signals
      const updatedAlerts = await Alert.findAll({ where: { id: alertIds } });

      updatedAlerts.forEach((alert) => {
        socketService.emitToWarehouse(alert.warehouse_id, 'alert_acknowledged', {
          alert_id: alert.id,
          acknowledged_by: req.user!.name,
          acknowledged_at: alert.acknowledged_at,
          acknowledged_note: note || 'Bulk Acknowledged',
        });
      });

      return res.status(200).json({ message: `Successfully acknowledged ${updatedAlerts.length} alerts` });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to bulk acknowledge alerts' });
    }
  }

  /**
   * Resolve an alert.
   */
  public static async resolve(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    try {
      const alert = await Alert.findByPk(id);
      if (!alert) {
        return res.status(404).json({ error: 'Alert not found' });
      }

      await alert.update({
        status: 'resolved',
        resolved_at: new Date(),
      });

      // Emit event
      socketService.emitToWarehouse(alert.warehouse_id, 'alert_resolved', {
        alert_id: alert.id,
        resolved_at: alert.resolved_at,
      });

      return res.status(200).json({ message: 'Alert resolved successfully', alert });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to resolve alert' });
    }
  }

  // --- Alert Rules CRUD ---

  public static async listRules(req: AuthenticatedRequest, res: Response) {
    const { warehouse_id } = req.query;

    const filter: any = {};
    if (warehouse_id) filter.warehouse_id = parseInt(warehouse_id as string, 10);

    if (req.user && req.user.role !== 'superadmin' && req.user.warehouse_id) {
      filter.warehouse_id = req.user.warehouse_id;
    }

    try {
      const rules = await AlertRule.findAll({
        where: filter,
        include: [{ model: Device, as: 'device' }],
      });
      return res.status(200).json(rules);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve alert rules' });
    }
  }

  public static async createRule(req: AuthenticatedRequest, res: Response) {
    try {
      const rule = await AlertRule.create(req.body);
      return res.status(201).json(rule);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to create alert rule' });
    }
  }

  public static async updateRule(req: AuthenticatedRequest, res: Response) {
    try {
      const rule = await AlertRule.findByPk(req.params.id);
      if (!rule) {
        return res.status(404).json({ error: 'Alert rule not found' });
      }
      await rule.update(req.body);
      return res.status(200).json(rule);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update alert rule' });
    }
  }

  public static async deleteRule(req: AuthenticatedRequest, res: Response) {
    try {
      const rule = await AlertRule.findByPk(req.params.id);
      if (!rule) {
        return res.status(404).json({ error: 'Alert rule not found' });
      }
      await rule.destroy();
      return res.status(200).json({ message: 'Alert rule deleted successfully' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete alert rule' });
    }
  }
}
export default AlertController;
