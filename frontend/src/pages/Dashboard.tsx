import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useWarehouse } from '../context/WarehouseContext';
import { useAuth } from '../context/AuthContext';
import { Activity, ShieldAlert, PackageSearch, Shuffle, Layers, ShieldCheck, Check } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { toast } from 'react-hot-toast';

interface OverviewStats {
  online_devices: number;
  offline_devices: number;
  open_alerts: {
    critical: number;
    warning: number;
    info: number;
    total: number;
  };
  avg_temperature: number;
  avg_humidity: number;
  low_stock_items: number;
  total_assets: number;
  alerts_last_24h: number;
  movements_today: number;
}

interface ZoneStatus {
  id: number;
  name: string;
  zone_type: string;
  device_count: number;
  alert_count: number;
  status: 'green' | 'yellow' | 'red';
  latest_readings: {
    avg_temp: number | null;
    avg_humidity: number | null;
  };
}

interface Alert {
  id: number;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved';
  device?: {
    name: string;
  };
  created_at: string;
}

interface DashboardProps {
  registerSensorCallback: (id: string, cb: (data: any) => void) => () => void;
  registerAlertCallback: (id: string, cb: (data: any) => void) => () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  registerSensorCallback,
  registerAlertCallback,
}) => {
  const { selectedWarehouseId } = useWarehouse();
  const { token } = useAuth();
  
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [zones, setZones] = useState<ZoneStatus[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    if (!token || !selectedWarehouseId) return;
    try {
      // 1. Fetch overview numbers
      const statsRes = await axios.get(`/api/dashboard/overview?warehouse_id=${selectedWarehouseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(statsRes.data);

      // 2. Fetch zones status grid
      const zonesRes = await axios.get(`/api/dashboard/zones?warehouse_id=${selectedWarehouseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setZones(zonesRes.data);

      // 3. Fetch recent alerts
      const alertsRes = await axios.get(`/api/alerts?warehouse_id=${selectedWarehouseId}&status=open`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecentAlerts(alertsRes.data.slice(0, 10));

      // 4. Fetch movements to build chart
      const movementsRes = await axios.get(`/api/assets/movements?warehouse_id=${selectedWarehouseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Aggregate last 7 days movements: inbound vs outbound
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toLocaleDateString([], { weekday: 'short' });
      }).reverse();

      const counts: { [day: string]: { inbound: number; outbound: number } } = {};
      last7Days.forEach(day => { counts[day] = { inbound: 0, outbound: 0 }; });

      movementsRes.data.forEach((mov: any) => {
        const day = new Date(mov.created_at).toLocaleDateString([], { weekday: 'short' });
        if (counts[day]) {
          if (mov.movement_type === 'inbound') counts[day].inbound += Number(mov.quantity);
          else if (mov.movement_type === 'outbound') counts[day].outbound += Number(mov.quantity);
        }
      });

      const formattedChart = last7Days.map(day => ({
        day,
        Inbound: counts[day].inbound,
        Outbound: counts[day].outbound,
      }));
      setChartData(formattedChart);

    } catch (err) {
      console.error('Dashboard data fetching failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Socket bindings to update numbers in real-time
    const unsubscribeSensor = registerSensorCallback('dashboard', (data) => {
      // Refresh averages or stats dynamically on sensor stream values
      fetchData();
    });

    const unsubscribeAlert = registerAlertCallback('dashboard', (newAlert) => {
      setRecentAlerts((prev) => [newAlert, ...prev].slice(0, 10));
      setStats((prev) => {
        if (!prev) return null;
        const newOpen = { ...prev.open_alerts };
        if (newAlert.severity === 'critical') newOpen.critical++;
        else if (newAlert.severity === 'warning') newOpen.warning++;
        else newOpen.info++;
        newOpen.total++;
        return {
          ...prev,
          open_alerts: newOpen,
        };
      });
    });

    return () => {
      unsubscribeSensor();
      unsubscribeAlert();
    };
  }, [token, selectedWarehouseId]);

  const handleAcknowledge = async (id: number) => {
    try {
      await axios.put(`/api/alerts/${id}/acknowledge`, { note: 'Acknowledged from dashboard panel' }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Alert acknowledged.');
      fetchData();
    } catch (err) {
      toast.error('Failed to acknowledge alert.');
    }
  };

  if (isLoading || !stats) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-800 rounded-xl"></div>
          ))}
        </div>
        <div className="h-96 bg-slate-800 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 4 Cards Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1 */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm relative overflow-hidden flex items-center gap-4">
          <div className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{stats.online_devices}</div>
            <div className="text-xs text-slate-400 font-medium">Devices Online</div>
            <div className="text-[10px] text-slate-500 mt-1">({stats.offline_devices} offline)</div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm relative overflow-hidden flex items-center gap-4">
          <div className={`p-3.5 rounded-lg ${stats.open_alerts.total > 0 ? 'bg-red-500/10 text-red-400' : 'bg-slate-700/20 text-slate-400'}`}>
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{stats.open_alerts.total}</div>
            <div className="text-xs text-slate-400 font-medium">Open Alerts</div>
            <div className="text-[10px] text-red-500 mt-1 font-semibold flex gap-2">
              {stats.open_alerts.critical > 0 && <span>{stats.open_alerts.critical} Critical</span>}
              {stats.open_alerts.warning > 0 && <span>{stats.open_alerts.warning} Warn</span>}
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm relative overflow-hidden flex items-center gap-4">
          <div className={`p-3.5 rounded-lg ${stats.low_stock_items > 0 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-slate-700/20 text-slate-400'}`}>
            <PackageSearch className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{stats.low_stock_items}</div>
            <div className="text-xs text-slate-400 font-medium">Low Stock Items</div>
            <div className="text-[10px] text-slate-500 mt-1">({stats.total_assets} items total)</div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm relative overflow-hidden flex items-center gap-4">
          <div className="p-3.5 bg-blue-500/10 text-blue-400 rounded-lg">
            <Shuffle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{stats.movements_today}</div>
            <div className="text-xs text-slate-400 font-medium">Movements Today</div>
            <div className="text-[10px] text-slate-500 mt-1">Valuation: ${stats.total_assets * 15}</div>
          </div>
        </div>
      </div>

      {/* Grid: Averages + Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Zone Status */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm lg:col-span-2">
          <h3 className="text-md font-bold text-white mb-4 flex items-center gap-1.5">
            <Layers className="w-5 h-5 text-blue-400" />
            Zone Status Grid
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-center relative overflow-hidden"
              >
                {/* Border Indicator */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    zone.status === 'red'
                      ? 'bg-red-500'
                      : zone.status === 'yellow'
                      ? 'bg-yellow-500'
                      : 'bg-emerald-500'
                  }`}
                ></div>

                <div>
                  <div className="font-bold text-white text-sm">{zone.name}</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">{zone.zone_type}</div>
                  <div className="text-xs text-slate-500 mt-2">Devices: {zone.device_count} online</div>
                </div>

                <div className="text-right">
                  <div className="flex flex-col items-end gap-1">
                    {zone.latest_readings?.avg_temp !== null && (
                      <span className="text-xs font-semibold text-slate-200">
                        Temp: {zone.latest_readings.avg_temp}°C
                      </span>
                    )}
                    {zone.latest_readings?.avg_humidity !== null && (
                      <span className="text-xs font-semibold text-slate-200">
                        Hum: {zone.latest_readings.avg_humidity}%
                      </span>
                    )}
                  </div>
                  {zone.alert_count > 0 && (
                    <span className="inline-block mt-2 text-[10px] font-bold bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">
                      {zone.alert_count} active
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Movement Chart */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm">
          <h3 className="text-md font-bold text-white mb-4 flex items-center gap-1.5">
            <Shuffle className="w-5 h-5 text-blue-400" />
            Weekly Stock Movements
          </h3>
          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <XAxis dataKey="day" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="Inbound" fill="#10B981" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Outbound" fill="#EF4444" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm">
        <h3 className="text-md font-bold text-white mb-4 flex items-center gap-1.5">
          <ShieldAlert className="w-5 h-5 text-red-400" />
          Recent Active Alerts
        </h3>
        
        {recentAlerts.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm flex flex-col items-center justify-center gap-2">
            <ShieldCheck className="w-8 h-8 text-emerald-500/50" />
            No open alerts. All systems running normal.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-700/50 text-slate-400">
                  <th className="py-2.5">Severity</th>
                  <th className="py-2.5">Sensor Device</th>
                  <th className="py-2.5">Alert Details</th>
                  <th className="py-2.5">Time Triggered</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentAlerts.map((alert) => (
                  <tr key={alert.id} className="border-b border-slate-700/30 hover:bg-slate-700/10">
                    <td className="py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                        alert.severity === 'critical' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="py-3 text-slate-200 font-medium">{alert.device?.name || 'IoT Sensor'}</td>
                    <td className="py-3 text-slate-400 max-w-sm truncate">{alert.message}</td>
                    <td className="py-3 text-slate-400">{new Date(alert.created_at).toLocaleString()}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-1 px-2.5 rounded transition-all inline-flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Ack
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default Dashboard;
