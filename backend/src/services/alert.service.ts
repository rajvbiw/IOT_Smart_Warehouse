import { Alert, AlertRule, Device } from '../models';
import { socketService } from './socket.service';
import { snsService } from './sns.service';
import { Op } from 'sequelize';

class AlertService {
  /**
   * Processes a telemetry reading for a device and metric, checking it against alert rules.
   */
  public async checkTelemetry(payload: {
    device_uid: string;
    metric: string;
    value: number;
    timestamp: Date | string;
    warehouse_id: number;
    zone_id: number;
  }): Promise<void> {
    const { device_uid, metric, value, warehouse_id } = payload;

    try {
      // Find the device
      const device = await Device.findOne({
        where: { device_uid },
      });

      if (!device) return;

      // Find all active alert rules for this warehouse matching either this specific device or this device type
      const rules = await AlertRule.findAll({
        where: {
          warehouse_id,
          is_active: true,
          [Op.or]: [
            { device_id: device.id },
            { device_id: null, device_type: device.type },
          ],
        },
      });

      for (const rule of rules) {
        // Match metric
        if (rule.metric !== metric) continue;

        // Check if value breaches the condition
        let isBreached = false;
        const thresh = Number(rule.threshold);
        switch (rule.condition) {
          case 'gt':
            isBreached = value > thresh;
            break;
          case 'lt':
            isBreached = value < thresh;
            break;
          case 'eq':
            isBreached = value === thresh;
            break;
          case 'gte':
            isBreached = value >= thresh;
            break;
          case 'lte':
            isBreached = value <= thresh;
            break;
        }

        if (isBreached) {
          // Check for alert cooldown
          const cooldownPeriod = rule.cooldown_minutes || 5;
          const cooldownCutoff = new Date(Date.now() - cooldownPeriod * 60 * 1000);

          const recentAlert = await Alert.findOne({
            where: {
              device_id: device.id,
              alert_rule_id: rule.id,
              created_at: {
                [Op.gte]: cooldownCutoff,
              },
            },
          });

          if (!recentAlert) {
            // No recent alert within cooldown window, trigger alert!
            const message = `Rule breached: Device '${device.name}' metric '${metric}' was ${value} (threshold ${rule.condition} ${rule.threshold}) in warehouse ${warehouse_id}.`;
            
            const alert = await Alert.create({
              warehouse_id,
              device_id: device.id,
              alert_rule_id: rule.id,
              metric,
              value,
              message,
              severity: rule.severity,
              status: 'open',
            });

            console.log(`[ALERT TRIGGERED] ID: ${alert.id}, Severity: ${alert.severity}`);

            // 1. Emit Socket.io event to room: warehouse_{id}
            socketService.emitToWarehouse(warehouse_id, 'new_alert', {
              id: alert.id,
              device_id: alert.device_id,
              device_uid,
              alert_rule_id: alert.alert_rule_id,
              metric,
              value,
              message,
              severity: alert.severity,
              status: alert.status,
              created_at: alert.created_at,
            });

            // 2. If critical, publish SNS alert
            if (rule.severity === 'critical') {
              const snsSubject = `CRITICAL: IoT Alert on ${device.name}`;
              await snsService.publishCriticalAlert(message, snsSubject);
            }
          }
        }
      }
    } catch (err) {
      console.error(`Error checking telemetry alerts for device ${device_uid}:`, err);
    }
  }
}

export const alertService = new AlertService();
export default alertService;
