import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useWarehouse } from '../context/WarehouseContext';
import { useAuth } from '../context/AuthContext';
import { WarehouseMap } from '../components/map/WarehouseMap';
import { TimeSeriesChart } from '../components/charts/SensorChart';
import { X, Battery, Wifi, Cpu, Layers, Link as LinkIcon, Thermometer, Droplet, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

export const FloorMap: React.FC = () => {
  const { selectedWarehouseId } = useWarehouse();
  const { token } = useAuth();

  const [zones, setZones] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);
  const [deviceHistory, setDeviceHistory] = useState<any[]>([]);
  const [selectedZone, setSelectedZone] = useState<any | null>(null);
  const [heatmap, setHeatmap] = useState<'none' | 'temperature' | 'humidity'>('none');
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    if (!token || !selectedWarehouseId) return;
    try {
      // Fetch zones
      const zonesRes = await axios.get(`/api/warehouses/${selectedWarehouseId}/zones`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Fetch stats to overlay zone average temperatures & humidities
      const statsRes = await axios.get(`/api/dashboard/zones?warehouse_id=${selectedWarehouseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Merge stats into zone list
      const mergedZones = zonesRes.data.map((z: any) => {
        const stats = statsRes.data.find((zs: any) => zs.id === z.id);
        return {
          ...z,
          status: stats ? stats.status : 'green',
          latest_readings: stats ? stats.latest_readings : { avg_temp: null, avg_humidity: null },
        };
      });
      setZones(mergedZones);

      // Fetch devices
      const devicesRes = await axios.get(`/api/devices?warehouse_id=${selectedWarehouseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDevices(devicesRes.data);
    } catch (err) {
      console.error('Failed to fetch floor map data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, selectedWarehouseId]);

  // Fetch device historical readings for the mini chart when a device is clicked
  useEffect(() => {
    const fetchDeviceHistory = async () => {
      if (!selectedDevice || !token) return;
      try {
        const res = await axios.get(
          `/api/devices/${selectedDevice.id}/readings?start=-1h&interval=5m`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setDeviceHistory(res.data);
      } catch (err) {
        console.error('Failed to fetch mini history:', err);
        setDeviceHistory([]);
      }
    };

    fetchDeviceHistory();
  }, [selectedDevice, token]);

  const handleDeviceSelect = (device: any) => {
    setSelectedZone(null); // close zone panel
    setSelectedDevice(device);
  };

  const handleZoneSelect = (zone: any) => {
    setSelectedDevice(null); // close device panel
    setSelectedZone(zone);
  };

  if (isLoading) {
    return (
      <div className="h-[550px] bg-slate-800 border border-slate-700 rounded-xl animate-pulse flex items-center justify-center">
        <span className="text-slate-400 text-sm">Loading visual floor plan overlays...</span>
      </div>
    );
  }

  // Find devices in selected zone
  const zoneDevices = selectedZone
    ? devices.filter((d) => d.zone_id === selectedZone.id)
    : [];

  return (
    <div className="space-y-6 relative">
      {/* Header and Heatmap Control */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white">Warehouse Floor Map</h2>
          <p className="text-xs text-slate-400">Spatial visual monitoring of connected IoT sensors</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-1.5 flex gap-2 text-xs">
          <span className="text-slate-400 self-center px-2 font-medium">Heatmap Overlay:</span>
          <button
            onClick={() => setHeatmap('none')}
            className={`px-3 py-1 rounded transition-all ${
              heatmap === 'none' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            None
          </button>
          <button
            onClick={() => setHeatmap('temperature')}
            className={`px-3 py-1 rounded transition-all ${
              heatmap === 'temperature' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            Temperature
          </button>
          <button
            onClick={() => setHeatmap('humidity')}
            className={`px-3 py-1 rounded transition-all ${
              heatmap === 'humidity' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            Humidity
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Leaflet Visual Map */}
        <div className="lg:col-span-3">
          <WarehouseMap
            zones={zones}
            devices={devices}
            onDeviceSelect={handleDeviceSelect}
            onZoneSelect={handleZoneSelect}
            heatmapType={heatmap}
          />
        </div>

        {/* Dynamic Detail Side Panel */}
        <div className="lg:col-span-1">
          {/* Default Unselected Panel */}
          {!selectedDevice && !selectedZone && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 h-full flex flex-col justify-center items-center text-center text-slate-500 min-h-[300px]">
              <Layers className="w-12 h-12 text-slate-600/70 mb-3" />
              <p className="text-sm font-medium">Interactive Panel</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto">
                Click on any zone polygon or sensor marker on the floor plan to view live details.
              </p>
            </div>
          )}

          {/* Device Selection Panel */}
          {selectedDevice && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg relative flex flex-col h-full animate-fade-in">
              <button
                onClick={() => setSelectedDevice(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`w-2.5 h-2.5 rounded-full inline-block ${
                    selectedDevice.status === 'online'
                      ? 'bg-emerald-500'
                      : selectedDevice.status === 'offline'
                      ? 'bg-red-500'
                      : 'bg-yellow-500'
                  }`}
                ></span>
                <span className="text-xs uppercase font-bold text-slate-400">{selectedDevice.status}</span>
              </div>

              <h3 className="font-extrabold text-white text-md tracking-tight leading-tight">
                {selectedDevice.name}
              </h3>
              <p className="text-slate-400 text-xs font-mono mt-1">UID: {selectedDevice.device_uid}</p>

              {/* Status Spec Grid */}
              <div className="grid grid-cols-2 gap-3 mt-4 border-y border-slate-700/50 py-3 text-xs">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Battery className="w-4 h-4 text-slate-400" />
                  <span>Battery: {selectedDevice.battery_level}%</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Wifi className="w-4 h-4 text-slate-400" />
                  <span>Signal: {selectedDevice.signal_strength} dBm</span>
                </div>
              </div>

              {/* Mini history chart */}
              <div className="mt-5 flex-1">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-slate-400">Last 1 Hour Trend</span>
                  <Link
                    to={`/devices/${selectedDevice.id}`}
                    className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5"
                  >
                    <Eye className="w-3 h-3" /> Full History
                  </Link>
                </div>
                {deviceHistory.length > 0 ? (
                  <TimeSeriesChart
                    data={deviceHistory}
                    yLabel={selectedDevice.type === 'temperature' ? '°C' : '%'}
                    strokeColor={selectedDevice.type === 'temperature' ? '#EF4444' : '#06B6D4'}
                  />
                ) : (
                  <div className="h-36 bg-slate-900 border border-slate-800 rounded flex items-center justify-center text-slate-500 text-xs">
                    No recent readings data.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Zone Selection Panel */}
          {selectedZone && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg relative flex flex-col h-full animate-fade-in">
              <button
                onClick={() => setSelectedZone(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <span className={`inline-block self-start px-2 py-0.5 rounded-full font-bold text-[9px] uppercase mb-2 ${
                selectedZone.status === 'red'
                  ? 'bg-red-500/10 text-red-400'
                  : selectedZone.status === 'yellow'
                  ? 'bg-yellow-500/10 text-yellow-400'
                  : 'bg-emerald-500/10 text-emerald-400'
              }`}>
                {selectedZone.status === 'red' ? 'Alert' : selectedZone.status === 'yellow' ? 'Warning' : 'Normal'}
              </span>

              <h3 className="font-extrabold text-white text-md tracking-tight leading-tight">
                {selectedZone.name}
              </h3>
              <p className="text-slate-400 text-xs mt-1 capitalise">Type: {selectedZone.zone_type} Zone</p>

              {/* Zone Averages Block */}
              <div className="bg-slate-900/60 rounded-lg p-3 mt-4 border border-slate-700/30 flex justify-between text-xs">
                {selectedZone.latest_readings.avg_temp !== null && (
                  <div className="flex items-center gap-1.5 text-slate-200">
                    <Thermometer className="w-4 h-4 text-red-400" />
                    <span>Avg Temp: {selectedZone.latest_readings.avg_temp}°C</span>
                  </div>
                )}
                {selectedZone.latest_readings.avg_humidity !== null && (
                  <div className="flex items-center gap-1.5 text-slate-200">
                    <Droplet className="w-4 h-4 text-cyan-400" />
                    <span>Avg Hum: {selectedZone.latest_readings.avg_humidity}%</span>
                  </div>
                )}
              </div>

              {/* Devices inside this zone */}
              <div className="mt-5 flex-1">
                <span className="text-xs font-semibold text-slate-400 block mb-2.5">Zone Devices ({zoneDevices.length})</span>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {zoneDevices.map((dev) => (
                    <div
                      key={dev.id}
                      onClick={() => handleDeviceSelect(dev)}
                      className="bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between text-xs cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-200 truncate max-w-[120px]">{dev.name}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded font-semibold text-[10px] uppercase ${
                        dev.status === 'online' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {dev.status}
                      </span>
                    </div>
                  ))}
                  {zoneDevices.length === 0 && (
                    <div className="text-center text-slate-500 text-xs py-4">No devices mapped to this zone.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default FloorMap;
