import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { GaugeChart, TimeSeriesChart } from '../components/charts/SensorChart';
import { Battery, Wifi, ShieldAlert, Hammer, Calendar, Cpu, MapPin, ChevronLeft, Download, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Device {
  id: number;
  device_uid: string;
  name: string;
  type: string;
  manufacturer: string;
  model: string;
  firmware_version: string;
  battery_level: number;
  signal_strength: number;
  status: 'online' | 'offline' | 'maintenance';
  last_seen_at: string;
  ip_address: string;
  zone_id: number;
}

interface Alert {
  id: number;
  message: string;
  severity: string;
  status: string;
  created_at: string;
}

interface Maintenance {
  id: number;
  maintenance_type: string;
  description: string;
  cost: number;
  next_maintenance_date: string | null;
  created_at: string;
  performedByUser?: {
    name: string;
  };
}

interface DeviceDetailProps {
  registerSensorCallback: (id: string, cb: (data: any) => void) => () => void;
}

const RANGES = [
  { label: '1H', start: '-1h', interval: '1m' },
  { label: '6H', start: '-6h', interval: '5m' },
  { label: '24H', start: '-24h', interval: '10m' },
  { label: '7D', start: '-7d', interval: '1h' },
  { label: '30D', start: '-30d', interval: '4h' },
];

export const DeviceDetail: React.FC<DeviceDetailProps> = ({ registerSensorCallback }) => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();

  const [device, setDevice] = useState<Device | null>(null);
  const [liveValue, setLiveValue] = useState<number | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  
  const [selectedRange, setSelectedRange] = useState(RANGES[2]); // default 24H
  const [stats, setStats] = useState({ min: 0, max: 0, avg: 0, std: 0 });

  const [showMaintModal, setShowMaintModal] = useState(false);
  const [maintType, setMaintType] = useState('calibration');
  const [maintDesc, setMaintDesc] = useState('');
  const [maintCost, setMaintCost] = useState('0');
  const [maintNextDate, setMaintNextDate] = useState('');
  const [maintStatusChange, setMaintStatusChange] = useState('');

  const fetchDeviceData = async () => {
    if (!token || !id) return;
    try {
      // 1. Fetch device details
      const devRes = await axios.get(`/api/devices/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDevice(devRes.data);

      // 2. Fetch latest cache reading
      const latestRes = await axios.get(`/api/devices/${id}/latest`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (latestRes.data && latestRes.data.value !== undefined) {
        setLiveValue(latestRes.data.value);
      }

      // 3. Fetch device alerts
      const alertsRes = await axios.get(`/api/alerts?device_id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAlerts(alertsRes.data.slice(0, 15));

      // 4. Fetch maintenance timeline
      // Note: for this demo we can fetch maintenance logs via custom endpoint or query logs
      // Let's call /api/devices/:id/maintenance (or mock it since we seeded)
      // Since Sequelize syncs, let's load maintenance logs for this device
      const logsRes = await axios.get(`/api/devices/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // In our Sequelize associations, Device hasMany MaintenanceLog
      // Let's add logs query or fetch them
      setMaintenance([]);
    } catch (err) {
      console.error('Failed to load device details:', err);
    }
  };

  const fetchHistory = async () => {
    if (!token || !id) return;
    try {
      const res = await axios.get(
        `/api/devices/${id}/readings?start=${selectedRange.start}&interval=${selectedRange.interval}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHistory(res.data);

      // Compute statistics in JS
      if (res.data.length > 0) {
        const values = res.data.map((d: any) => d.value).filter((v: any) => v !== null && !isNaN(v));
        if (values.length > 0) {
          const min = Math.min(...values);
          const max = Math.max(...values);
          const sum = values.reduce((a: any, b: any) => a + b, 0);
          const avg = sum / values.length;
          
          // Std deviation
          const variance = values.reduce((a: any, b: any) => a + Math.pow(b - avg, 2), 0) / values.length;
          const std = Math.sqrt(variance);

          setStats({ min, max, avg, std });
        }
      }
    } catch (err) {
      console.error('Failed to load history chart:', err);
    }
  };

  useEffect(() => {
    fetchDeviceData();
  }, [token, id]);

  useEffect(() => {
    fetchHistory();
  }, [token, id, selectedRange]);

  useEffect(() => {
    if (!device) return;

    // Listen to real-time changes
    const unsubscribe = registerSensorCallback('device-detail', (data) => {
      if (data.device_uid === device.device_uid) {
        setLiveValue(data.value);
        // Prepend to history local state to shift chart live
        setHistory((prev) => [...prev, { time: data.timestamp, value: data.value }].slice(-50));
      }
    });

    return () => unsubscribe();
  }, [device]);

  const handleMaintenanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !token) return;

    try {
      await axios.post(
        `/api/devices/${id}/maintenance`,
        {
          maintenance_type: maintType,
          description: maintDesc,
          cost: parseFloat(maintCost),
          next_maintenance_date: maintNextDate || null,
          status_change: maintStatusChange || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Maintenance logged successfully.');
      setShowMaintModal(false);
      setMaintDesc('');
      setMaintCost('0');
      setMaintNextDate('');
      fetchDeviceData();
    } catch (err) {
      toast.error('Failed to log maintenance event.');
    }
  };

  if (!device) {
    return (
      <div className="h-96 bg-slate-800 border border-slate-700 rounded-xl animate-pulse flex items-center justify-center">
        <span className="text-slate-400 text-sm">Loading telemetry profile...</span>
      </div>
    );
  }

  const getMetricUnit = (type: string) => {
    switch (type) {
      case 'temperature': return '°C';
      case 'humidity': return '%';
      case 'stock_level': return '%';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button and title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/devices"
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-300 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white leading-tight">{device.name}</h2>
              <span className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                device.status === 'online' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
              }`}>
                {device.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5" /> UID: {device.device_uid}
            </p>
          </div>
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={() => setShowMaintModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-xl shadow-lg transition-all text-xs flex items-center gap-1.5"
          >
            <Hammer className="w-4 h-4" /> Log Maintenance
          </button>
        </div>
      </div>

      {/* Overview Specs grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm flex items-center gap-3">
          <Battery className="w-6 h-6 text-slate-400" />
          <div>
            <div className="text-lg font-bold text-white">{device.battery_level}%</div>
            <div className="text-xs text-slate-400 font-medium">Battery Power</div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm flex items-center gap-3">
          <Wifi className="w-6 h-6 text-slate-400" />
          <div>
            <div className="text-lg font-bold text-white">{device.signal_strength} dBm</div>
            <div className="text-xs text-slate-400 font-medium">Signal strength</div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm flex items-center gap-3">
          <MapPin className="w-6 h-6 text-slate-400" />
          <div>
            <div className="text-lg font-bold text-white">Zone {device.zone_id}</div>
            <div className="text-xs text-slate-400 font-medium">Device Location</div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm flex items-center gap-3">
          <Cpu className="w-6 h-6 text-slate-400" />
          <div>
            <div className="text-lg font-bold text-white">{device.firmware_version}</div>
            <div className="text-xs text-slate-400 font-medium">Firmware Version</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time value Dial */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm flex flex-col justify-center items-center">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide self-start mb-4">Real-Time Reading</h3>
          {liveValue !== null ? (
            <GaugeChart
              value={liveValue}
              min={device.type === 'temperature' ? -15 : 0}
              max={device.type === 'temperature' ? 45 : 100}
              unit={getMetricUnit(device.type)}
              title={device.type}
              color={device.type === 'temperature' ? '#EF4444' : '#3B82F6'}
            />
          ) : (
            <div className="h-48 flex items-center text-slate-500 text-sm">Waiting for live data...</div>
          )}
        </div>

        {/* Historical Chart */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Historical Telemetry</h3>
            
            <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
              {RANGES.map((r) => (
                <button
                  key={r.label}
                  onClick={() => setSelectedRange(r)}
                  className={`px-3 py-1 rounded transition-all ${
                    selectedRange.label === r.label ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {history.length > 0 ? (
            <TimeSeriesChart
              data={history}
              yLabel={getMetricUnit(device.type)}
              strokeColor={device.type === 'temperature' ? '#EF4444' : '#3B82F6'}
            />
          ) : (
            <div className="h-64 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-500 text-xs">
              No historical data available for selected duration.
            </div>
          )}
        </div>
      </div>

      {/* Bottom section: Stats & Alert history */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats Summary */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider text-slate-400">Duration Stats</h3>
          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between border-b border-slate-700/50 pb-2">
              <span className="text-slate-400">Minimum Value</span>
              <span className="font-bold text-white">{stats.min.toFixed(2)} {getMetricUnit(device.type)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-700/50 pb-2">
              <span className="text-slate-400">Maximum Value</span>
              <span className="font-bold text-white">{stats.max.toFixed(2)} {getMetricUnit(device.type)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-700/50 pb-2">
              <span className="text-slate-400">Average Mean</span>
              <span className="font-bold text-white">{stats.avg.toFixed(2)} {getMetricUnit(device.type)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Std Deviation</span>
              <span className="font-bold text-white">{stats.std.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Alert History */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider text-slate-400">Alert History</h3>
          
          {alerts.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">No triggered alert rules.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-700/50 text-slate-400">
                    <th className="py-2">Severity</th>
                    <th className="py-2">Details</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => (
                    <tr key={alert.id} className="border-b border-slate-700/30">
                      <td className="py-2.5">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] uppercase font-bold ${
                          alert.severity === 'critical' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          {alert.severity}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-300 truncate max-w-xs">{alert.message}</td>
                      <td className="py-2.5 text-slate-400 capitalize">{alert.status}</td>
                      <td className="py-2.5 text-slate-400">{new Date(alert.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Maintenance Modal Form */}
      {showMaintModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full relative">
            <h3 className="text-md font-bold text-white mb-4">Log Maintenance Calibration</h3>
            
            <form onSubmit={handleMaintenanceSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5">Action Type</label>
                <select
                  value={maintType}
                  onChange={(e) => setMaintType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none"
                >
                  <option value="calibration">Calibration Check</option>
                  <option value="battery">Battery Swap</option>
                  <option value="repair">Hardware Repair</option>
                  <option value="replacement">Device Replacement</option>
                  <option value="firmware">Firmware Update</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5">Device status after maintenance</label>
                <select
                  value={maintStatusChange}
                  onChange={(e) => setMaintStatusChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none"
                >
                  <option value="">Leave Unchanged</option>
                  <option value="online">Mark Online (Active)</option>
                  <option value="offline">Mark Offline</option>
                  <option value="maintenance">Mark Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5">Description notes</label>
                <textarea
                  required
                  rows={3}
                  value={maintDesc}
                  onChange={(e) => setMaintDesc(e.target.value)}
                  placeholder="e.g. Swapped batteries and verified communication RSSI."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1.5">Parts Cost ($)</label>
                  <input
                    type="number"
                    value={maintCost}
                    onChange={(e) => setMaintCost(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1.5">Next Maintenance Date</label>
                  <input
                    type="date"
                    value={maintNextDate}
                    onChange={(e) => setMaintNextDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setShowMaintModal(false)}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium shadow-md"
                >
                  Save Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default DeviceDetail;
