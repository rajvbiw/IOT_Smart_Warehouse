import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useWarehouse } from '../context/WarehouseContext';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ShieldCheck, Check, AlertTriangle, Layers, Plus, Trash2, Power } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'react-hot-toast';

interface Alert {
  id: number;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved';
  metric: string;
  value: number;
  device?: {
    id: number;
    name: string;
  };
  acknowledgedByUser?: {
    name: string;
  };
  acknowledged_note?: string;
  created_at: string;
}

interface AlertRule {
  id: number;
  device_id: number | null;
  device_type: string;
  metric: string;
  condition: string;
  threshold: number;
  severity: string;
  is_active: boolean;
  cooldown_minutes: number;
  device?: {
    name: string;
  };
}

interface AlertsPageProps {
  registerAlertCallback: (id: string, cb: (data: any) => void) => () => void;
}

const COLORS = ['#EF4444', '#F59E0B', '#3B82F6'];

export const Alerts: React.FC<AlertsPageProps> = ({ registerAlertCallback }) => {
  const { selectedWarehouseId } = useWarehouse();
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<'open' | 'acknowledged' | 'resolved' | 'rules'>('open');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [devices, setDevices] = useState<any[]>([]);

  // Selection state for bulk actions
  const [selectedAlertIds, setSelectedAlertIds] = useState<number[]>([]);
  const [bulkNote, setBulkNote] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Single ack modal
  const [ackAlert, setAckAlert] = useState<Alert | null>(null);
  const [ackNote, setAckNote] = useState('');

  // Rules form modal
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [ruleDeviceType, setRuleDeviceType] = useState('temperature');
  const [ruleDeviceId, setRuleDeviceId] = useState('');
  const [ruleMetric, setRuleMetric] = useState('value');
  const [ruleCondition, setRuleCondition] = useState('gt');
  const [ruleThreshold, setRuleThreshold] = useState('30');
  const [ruleSeverity, setRuleSeverity] = useState('critical');
  const [ruleCooldown, setRuleCooldown] = useState('5');

  // Filters
  const [filterSeverity, setFilterSeverity] = useState('');

  const fetchAlertsAndRules = async () => {
    if (!token || !selectedWarehouseId) return;
    try {
      // Fetch alerts
      const alertsRes = await axios.get(`/api/alerts?warehouse_id=${selectedWarehouseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAlerts(alertsRes.data);

      // Fetch rules
      const rulesRes = await axios.get(`/api/alerts/rules/all?warehouse_id=${selectedWarehouseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRules(rulesRes.data);

      // Fetch devices for dropdowns
      const devicesRes = await axios.get(`/api/devices?warehouse_id=${selectedWarehouseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDevices(devicesRes.data);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  };

  useEffect(() => {
    fetchAlertsAndRules();

    // Register socket listener to refresh alerts in real-time
    const unsubscribe = registerAlertCallback('alerts-page', () => {
      fetchAlertsAndRules();
    });

    return () => unsubscribe();
  }, [token, selectedWarehouseId]);

  // Handle Acknowledge Action
  const handleAcknowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ackAlert || !token) return;

    try {
      await axios.put(
        `/api/alerts/${ackAlert.id}/acknowledge`,
        { note: ackNote },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Alert acknowledged.');
      setAckAlert(null);
      setAckNote('');
      fetchAlertsAndRules();
    } catch (err) {
      toast.error('Failed to acknowledge alert.');
    }
  };

  // Handle Bulk Acknowledge Action
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAlertIds.length === 0 || !token) return;

    try {
      await axios.post(
        '/api/alerts/bulk-acknowledge',
        { alertIds: selectedAlertIds, note: bulkNote },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Acknowledged ${selectedAlertIds.length} alerts.`);
      setSelectedAlertIds([]);
      setBulkNote('');
      setShowBulkModal(false);
      fetchAlertsAndRules();
    } catch (err) {
      toast.error('Failed to execute bulk acknowledgment.');
    }
  };

  // Handle Resolve Action
  const handleResolve = async (id: number) => {
    if (!token) return;
    try {
      await axios.put(`/api/alerts/${id}/resolve`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Alert resolved.');
      fetchAlertsAndRules();
    } catch (err) {
      toast.error('Failed to resolve alert.');
    }
  };

  // Toggle active/inactive rule
  const handleToggleRule = async (rule: AlertRule) => {
    if (!token) return;
    try {
      await axios.put(
        `/api/alerts/rules/${rule.id}`,
        { is_active: !rule.is_active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Rule ${rule.is_active ? 'disabled' : 'enabled'}.`);
      fetchAlertsAndRules();
    } catch (err) {
      toast.error('Failed to toggle rule state.');
    }
  };

  // Create new rule
  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedWarehouseId) return;

    try {
      await axios.post(
        '/api/alerts/rules/create',
        {
          warehouse_id: selectedWarehouseId,
          device_id: ruleDeviceId ? parseInt(ruleDeviceId, 10) : null,
          device_type: ruleDeviceType,
          metric: ruleMetric,
          condition: ruleCondition,
          threshold: parseFloat(ruleThreshold),
          severity: ruleSeverity,
          cooldown_minutes: parseInt(ruleCooldown, 10),
          notification_channels: ['email', 'webhook'],
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Alert rule created successfully.');
      setShowRuleModal(false);
      setRuleDeviceId('');
      setRuleThreshold('30');
      fetchAlertsAndRules();
    } catch (err) {
      toast.error('Failed to create alert rule.');
    }
  };

  // Delete rule
  const handleDeleteRule = async (id: number) => {
    if (!token) return;
    try {
      await axios.delete(`/api/alerts/rules/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Alert rule deleted.');
      fetchAlertsAndRules();
    } catch (err) {
      toast.error('Failed to delete rule.');
    }
  };

  // Checkbox handlers
  const handleSelectAlert = (id: number) => {
    setSelectedAlertIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (filteredAlerts: Alert[]) => {
    if (selectedAlertIds.length === filteredAlerts.length) {
      setSelectedAlertIds([]);
    } else {
      setSelectedAlertIds(filteredAlerts.map((a) => a.id));
    }
  };

  // Filter lists based on tab
  const tabAlerts = alerts.filter((a) => a.status === activeTab);
  const filteredAlerts = tabAlerts.filter((a) =>
    filterSeverity ? a.severity === filterSeverity : true
  );

  // Compile statistics for charts
  const severityCounts = {
    critical: alerts.filter((a) => a.status === 'open' && a.severity === 'critical').length,
    warning: alerts.filter((a) => a.status === 'open' && a.severity === 'warning').length,
    info: alerts.filter((a) => a.status === 'open' && a.severity === 'info').length,
  };

  const pieData = [
    { name: 'Critical', value: severityCounts.critical },
    { name: 'Warning', value: severityCounts.warning },
    { name: 'Info', value: severityCounts.info },
  ].filter((d) => d.value > 0);

  // Compile alert volume over last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toLocaleDateString([], { weekday: 'short' });
  }).reverse();

  const volumeCounts: { [day: string]: number } = {};
  last7Days.forEach((day) => {
    volumeCounts[day] = 0;
  });

  alerts.forEach((alert) => {
    const day = new Date(alert.created_at).toLocaleDateString([], { weekday: 'short' });
    if (volumeCounts[day] !== undefined) {
      volumeCounts[day]++;
    }
  });

  const barData = last7Days.map((day) => ({
    name: day,
    count: volumeCounts[day],
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white">Alerts & System Violations</h2>
          <p className="text-xs text-slate-400">Manage triggered warning states and custom alert thresholds</p>
        </div>

        {activeTab === 'rules' && (
          <button
            onClick={() => setShowRuleModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-xl shadow-lg transition-all text-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create Threshold Rule
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700/50 text-xs">
        <button
          onClick={() => { setActiveTab('open'); setSelectedAlertIds([]); }}
          className={`pb-3 px-6 font-semibold border-b-2 transition-all ${
            activeTab === 'open' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Open Alerts ({alerts.filter((a) => a.status === 'open').length})
        </button>
        <button
          onClick={() => { setActiveTab('acknowledged'); setSelectedAlertIds([]); }}
          className={`pb-3 px-6 font-semibold border-b-2 transition-all ${
            activeTab === 'acknowledged' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Acknowledged ({alerts.filter((a) => a.status === 'acknowledged').length})
        </button>
        <button
          onClick={() => { setActiveTab('resolved'); setSelectedAlertIds([]); }}
          className={`pb-3 px-6 font-semibold border-b-2 transition-all ${
            activeTab === 'resolved' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Resolved ({alerts.filter((a) => a.status === 'resolved').length})
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-3 px-6 font-semibold border-b-2 transition-all ${
            activeTab === 'rules' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Alert Rules ({rules.length})
        </button>
      </div>

      {/* Charts section (hidden on Rules tab) */}
      {activeTab !== 'rules' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Alert Count Bar Chart */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm lg:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Daily Alert Ingestion (Last 7 Days)</h3>
            <div className="w-full h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                  <Bar dataKey="count" fill="#3B82F6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Severity Pie Chart */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm flex flex-col justify-center items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 self-start mb-2">Open Alerts Distribution</h3>
            {pieData.length > 0 ? (
              <div className="w-full h-36 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={4} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1 text-[10px] text-slate-400 pr-4">
                  {pieData.map((d, index) => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                      <span>{d.name}: {d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-32 flex items-center text-slate-500 text-xs">No active alerts to map.</div>
            )}
          </div>
        </div>
      )}

      {/* Main content table / Rules list */}
      {activeTab !== 'rules' ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm space-y-4">
          {/* Action bar and filtering */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex gap-2">
              {activeTab === 'open' && selectedAlertIds.length > 0 && (
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-medium py-1.5 px-3 rounded-lg text-xs transition-all shadow"
                >
                  Bulk Acknowledge ({selectedAlertIds.length})
                </button>
              )}
            </div>

            <div className="flex gap-2 text-xs">
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300 outline-none"
              >
                <option value="">All Severities</option>
                <option value="critical">Critical Only</option>
                <option value="warning">Warning Only</option>
                <option value="info">Info Only</option>
              </select>
            </div>
          </div>

          {/* Alerts Table */}
          {filteredAlerts.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm flex flex-col items-center justify-center gap-2">
              <ShieldCheck className="w-10 h-10 text-emerald-500/40" />
              No alerts found for this filter tab.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-700/50 text-slate-400">
                    {activeTab === 'open' && (
                      <th className="py-2.5 w-8">
                        <input
                          type="checkbox"
                          checked={selectedAlertIds.length === filteredAlerts.length}
                          onChange={() => handleSelectAll(filteredAlerts)}
                        />
                      </th>
                    )}
                    <th className="py-2.5">Severity</th>
                    <th className="py-2.5">Sensor Device</th>
                    <th className="py-2.5">Details</th>
                    <th className="py-2.5">Violation Value</th>
                    <th className="py-2.5">Time Triggered</th>
                    {activeTab === 'acknowledged' && <th className="py-2.5">Notes</th>}
                    <th className="py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlerts.map((alert) => (
                    <tr key={alert.id} className="border-b border-slate-700/30 hover:bg-slate-700/10">
                      {activeTab === 'open' && (
                        <td className="py-3">
                          <input
                            type="checkbox"
                            checked={selectedAlertIds.includes(alert.id)}
                            onChange={() => handleSelectAlert(alert.id)}
                          />
                        </td>
                      )}
                      <td className="py-3">
                        <span className={`inline-block px-1.5 py-0.5 rounded font-bold text-[8px] uppercase ${
                          alert.severity === 'critical' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          {alert.severity}
                        </span>
                      </td>
                      <td className="py-3 text-slate-200 font-medium">{alert.device?.name || 'Device Sensor'}</td>
                      <td className="py-3 text-slate-400 max-w-xs truncate">{alert.message}</td>
                      <td className="py-3 text-slate-200 font-bold">{alert.value}</td>
                      <td className="py-3 text-slate-400">{new Date(alert.created_at).toLocaleString()}</td>
                      {activeTab === 'acknowledged' && (
                        <td className="py-3 text-slate-400 max-w-xs truncate">
                          {alert.acknowledged_note || 'No notes'}
                        </td>
                      )}
                      <td className="py-3 text-right flex justify-end gap-1.5">
                        {activeTab === 'open' && (
                          <button
                            onClick={() => setAckAlert(alert)}
                            className="bg-slate-700 hover:bg-slate-600 text-slate-200 py-1 px-2 rounded font-medium"
                          >
                            Ack
                          </button>
                        )}
                        {(activeTab === 'open' || activeTab === 'acknowledged') && (
                          <button
                            onClick={() => handleResolve(alert.id)}
                            className="bg-blue-600 hover:bg-blue-500 text-white py-1 px-2 rounded font-medium shadow-sm"
                          >
                            Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Alert Rules tab */
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm">
          {rules.length === 0 ? (
            <div className="text-center py-10 text-slate-500">No alert rules mapped to this warehouse.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-700/50 text-slate-400">
                    <th className="py-2.5">Scope</th>
                    <th className="py-2.5">Metric</th>
                    <th className="py-2.5">Condition</th>
                    <th className="py-2.5">Threshold</th>
                    <th className="py-2.5">Severity</th>
                    <th className="py-2.5">Cooldown</th>
                    <th className="py-2.5">Active</th>
                    <th className="py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr key={rule.id} className="border-b border-slate-700/30 hover:bg-slate-700/10">
                      <td className="py-3 text-slate-200 font-medium">
                        {rule.device ? rule.device.name : `${rule.device_type} sensors`}
                      </td>
                      <td className="py-3 text-slate-400 capitalize">{rule.metric}</td>
                      <td className="py-3 text-slate-400 uppercase font-mono">{rule.condition}</td>
                      <td className="py-3 text-slate-200 font-bold">{rule.threshold}</td>
                      <td className="py-3">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] uppercase font-bold ${
                          rule.severity === 'critical' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          {rule.severity}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400">{rule.cooldown_minutes} min</td>
                      <td className="py-3">
                        <button
                          onClick={() => handleToggleRule(rule)}
                          className={`p-1 rounded-full ${
                            rule.is_active ? 'text-emerald-400 hover:text-emerald-500' : 'text-slate-500 hover:text-slate-400'
                          }`}
                        >
                          <Power className="w-4.5 h-4.5" />
                        </button>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-red-400 hover:text-red-500 p-1.5 rounded transition-all inline-block"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Acknowledge Alert Note Modal */}
      {ackAlert && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full relative">
            <h3 className="text-md font-bold text-white mb-2">Acknowledge Alert</h3>
            <p className="text-slate-400 text-xs mb-4">{ackAlert.message}</p>
            
            <form onSubmit={handleAcknowledge} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5">Action/investigation notes</label>
                <textarea
                  required
                  rows={3}
                  value={ackNote}
                  onChange={(e) => setAckNote(e.target.value)}
                  placeholder="e.g. Inspecting refrigeration unit compressor."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 placeholder-slate-600 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => { setAckAlert(null); setAckNote(''); }}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium shadow-md"
                >
                  Confirm Acknowledge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Acknowledge Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full relative">
            <h3 className="text-md font-bold text-white mb-2">Bulk Acknowledge</h3>
            <p className="text-slate-400 text-xs mb-4">Are you sure you want to acknowledge {selectedAlertIds.length} selected alerts?</p>
            
            <form onSubmit={handleBulkSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5">Bulk investigation notes</label>
                <textarea
                  required
                  rows={3}
                  value={bulkNote}
                  onChange={(e) => setBulkNote(e.target.value)}
                  placeholder="e.g. System reset and calibration check."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 placeholder-slate-600 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => { setShowBulkModal(false); setBulkNote(''); }}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium shadow-md"
                >
                  Confirm Bulk Ack
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rule Form Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full relative">
            <h3 className="text-md font-bold text-white mb-4">Create Threshold Rule</h3>
            
            <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1.5">Sensor Type Scope</label>
                  <select
                    value={ruleDeviceType}
                    onChange={(e) => setRuleDeviceType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none"
                  >
                    <option value="temperature">Temperature</option>
                    <option value="humidity">Humidity</option>
                    <option value="stock_level">Stock Level</option>
                    <option value="motion">Motion</option>
                    <option value="door">Door</option>
                    <option value="fire">Fire Alarm</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1.5">Device Specific (Optional)</label>
                  <select
                    value={ruleDeviceId}
                    onChange={(e) => setRuleDeviceId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none"
                  >
                    <option value="">Apply to all of type</option>
                    {devices.filter(d => d.type === ruleDeviceType).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1.5">Condition</label>
                  <select
                    value={ruleCondition}
                    onChange={(e) => setRuleCondition(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none"
                  >
                    <option value="gt">Greater Than (&gt;)</option>
                    <option value="lt">Less Than (&lt;)</option>
                    <option value="eq">Equal (=)</option>
                    <option value="gte">GTE (&gt;=)</option>
                    <option value="lte">LTE (&lt;=)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1.5">Threshold Value</label>
                  <input
                    type="number"
                    step="0.1"
                    value={ruleThreshold}
                    onChange={(e) => setRuleThreshold(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1.5">Severity</label>
                  <select
                    value={ruleSeverity}
                    onChange={(e) => setRuleSeverity(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none"
                  >
                    <option value="critical">Critical</option>
                    <option value="warning">Warning</option>
                    <option value="info">Info</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5">Alert Cooldown (Minutes)</label>
                <input
                  type="number"
                  value={ruleCooldown}
                  onChange={(e) => setRuleCooldown(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium shadow-md"
                >
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Alerts;
