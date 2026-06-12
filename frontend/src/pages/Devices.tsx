import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useWarehouse } from '../context/WarehouseContext';
import { useAuth } from '../context/AuthContext';
import { Grid, List, Search, SlidersHorizontal, Battery, Wifi, Cpu, Eye, Hammer } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Device {
  id: number;
  device_uid: string;
  name: string;
  type: string;
  manufacturer: string;
  model: string;
  battery_level: number;
  signal_strength: number;
  status: 'online' | 'offline' | 'maintenance';
  last_seen_at: string;
  ip_address: string;
  zone_id: number;
}

interface DevicesProps {
  registerSensorCallback: (id: string, cb: (data: any) => void) => () => void;
}

export const Devices: React.FC<DevicesProps> = ({ registerSensorCallback }) => {
  const { selectedWarehouseId } = useWarehouse();
  const { token } = useAuth();

  const [devices, setDevices] = useState<Device[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Real-time sensor reading values cache: device_uid -> value
  const [realtimeValues, setRealtimeValues] = useState<{ [uid: string]: number }>({});
  const [pulseDevices, setPulseDevices] = useState<{ [uid: string]: boolean }>({});

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchDevicesAndZones = async () => {
    if (!token || !selectedWarehouseId) return;
    try {
      // Fetch devices
      const devRes = await axios.get(`/api/devices?warehouse_id=${selectedWarehouseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDevices(devRes.data);

      // Fetch zones
      const zoneRes = await axios.get(`/api/warehouses/${selectedWarehouseId}/zones`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setZones(zoneRes.data);

      // Initialize real-time values from the backend's latest cache
      const valuesRes: { [uid: string]: number } = {};
      for (const dev of devRes.data) {
        try {
          const cacheRes = await axios.get(`/api/devices/${dev.id}/latest`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (cacheRes.data && cacheRes.data.value !== undefined) {
            valuesRes[dev.device_uid] = cacheRes.data.value;
          }
        } catch (e) {
          // ignore cache miss
        }
      }
      setRealtimeValues(valuesRes);
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevicesAndZones();

    // Socket subscription for real-time value changes
    const unsubscribe = registerSensorCallback('devices-page', (data) => {
      // Update value
      setRealtimeValues((prev) => ({
        ...prev,
        [data.device_uid]: data.value,
      }));

      // Trigger temporary pulse animation
      setPulseDevices((prev) => ({ ...prev, [data.device_uid]: true }));
      setTimeout(() => {
        setPulseDevices((prev) => ({ ...prev, [data.device_uid]: false }));
      }, 800);
    });

    return () => unsubscribe();
  }, [token, selectedWarehouseId]);

  // Filter devices
  const filteredDevices = devices.filter((dev) => {
    const matchesSearch =
      dev.name.toLowerCase().includes(search.toLowerCase()) ||
      dev.device_uid.toLowerCase().includes(search.toLowerCase());
    const matchesZone = selectedZone ? dev.zone_id === parseInt(selectedZone, 10) : true;
    const matchesType = selectedType ? dev.type === selectedType : true;
    const matchesStatus = selectedStatus ? dev.status === selectedStatus : true;

    return matchesSearch && matchesZone && matchesType && matchesStatus;
  });

  const getMetricUnit = (type: string) => {
    switch (type) {
      case 'temperature': return '°C';
      case 'humidity': return '%';
      case 'stock_level': return '%';
      default: return '';
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-40 bg-slate-800 rounded-xl"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white">System IoT Devices</h2>
          <p className="text-xs text-slate-400">Inventory and real-time state of all connected sensors</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg border ${
              viewMode === 'grid'
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg border ${
              viewMode === 'table'
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="w-4.5 h-4.5" />
            </span>
            <input
              type="text"
              placeholder="Search by device name or UID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-slate-200 placeholder-slate-500 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap gap-3 text-xs">
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-300 outline-none"
            >
              <option value="">All Zones</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-300 outline-none"
            >
              <option value="">All Types</option>
              <option value="temperature">Temperature</option>
              <option value="humidity">Humidity</option>
              <option value="stock_level">Stock Level</option>
              <option value="motion">Motion</option>
              <option value="door">Door</option>
              <option value="fire">Fire Alarm</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-300 outline-none"
            >
              <option value="">All Statuses</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDevices.map((dev) => {
            const hasPulse = pulseDevices[dev.device_uid];
            const liveValue = realtimeValues[dev.device_uid];
            const zone = zones.find((z) => z.id === dev.zone_id);

            return (
              <div
                key={dev.id}
                className={`bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-md ${
                  hasPulse ? 'update-pulse border-emerald-500/50' : ''
                }`}
              >
                <div>
                  {/* Status indicator */}
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[120px]">
                      {zone ? zone.name : 'Unknown Zone'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                      dev.status === 'online'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : dev.status === 'offline'
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-yellow-500/10 text-yellow-400'
                    }`}>
                      {dev.status}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-white text-sm tracking-tight truncate leading-tight">
                    {dev.name}
                  </h3>
                  <p className="text-slate-500 text-[10px] font-mono mt-0.5">UID: {dev.device_uid}</p>

                  {/* Real-time Telemetry Readout */}
                  <div className="my-5 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white tracking-tight">
                      {liveValue !== undefined ? liveValue.toFixed(1) : '--'}
                    </span>
                    <span className="text-slate-400 text-sm font-medium">{getMetricUnit(dev.type)}</span>
                  </div>
                </div>

                <div className="border-t border-slate-700/50 pt-3 mt-2 flex justify-between items-center text-[10px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Battery className="w-3.5 h-3.5 text-slate-400" />
                    <span>{dev.battery_level}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-slate-400" />
                    <span>{dev.signal_strength} dBm</span>
                  </div>
                  <Link
                    to={`/devices/${dev.id}`}
                    className="p-1 hover:bg-slate-700 rounded text-blue-400 hover:text-white transition-all"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-400">
                <th className="py-2.5">Name</th>
                <th className="py-2.5">UID</th>
                <th className="py-2.5">Type</th>
                <th className="py-2.5">Zone</th>
                <th className="py-2.5">Live Value</th>
                <th className="py-2.5">Battery</th>
                <th className="py-2.5">Signal</th>
                <th className="py-2.5">Status</th>
                <th className="py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.map((dev) => {
                const liveValue = realtimeValues[dev.device_uid];
                const zone = zones.find((z) => z.id === dev.zone_id);
                return (
                  <tr key={dev.id} className="border-b border-slate-700/30 hover:bg-slate-700/10">
                    <td className="py-3 text-slate-200 font-medium">{dev.name}</td>
                    <td className="py-3 font-mono text-[10px] text-slate-500">{dev.device_uid}</td>
                    <td className="py-3 text-slate-400 capitalize">{dev.type}</td>
                    <td className="py-3 text-slate-400">{zone ? zone.name : 'Unknown'}</td>
                    <td className="py-3 text-slate-200 font-bold">
                      {liveValue !== undefined ? `${liveValue.toFixed(1)}${getMetricUnit(dev.type)}` : '--'}
                    </td>
                    <td className="py-3 text-slate-400">{dev.battery_level}%</td>
                    <td className="py-3 text-slate-400">{dev.signal_strength} dBm</td>
                    <td className="py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                        dev.status === 'online' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {dev.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        to={`/devices/${dev.id}`}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-1 px-2.5 rounded transition-all inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
export default Devices;
