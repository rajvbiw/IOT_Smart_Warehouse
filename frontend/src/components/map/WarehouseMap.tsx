import React, { useEffect, useState } from 'react';
import { MapContainer, Polygon, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Thermometer, Droplet, Box, Activity, ShieldAlert, DoorClosed, AlertTriangle } from 'lucide-react';

// Setup CRS Simple map container helper
const MapController: React.FC<{ bounds: L.LatLngBoundsExpression }> = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds);
    map.setMaxBounds(bounds);
  }, [map, bounds]);
  return null;
};

// Custom DIV icons for Leaflet using Tailwind + Inline HTML SVGs
const createDeviceIcon = (type: string, status: string) => {
  let colorClass = 'bg-emerald-500';
  if (status === 'offline') colorClass = 'bg-red-500';
  else if (status === 'maintenance') colorClass = 'bg-yellow-500';

  let iconHtml = '';
  switch (type) {
    case 'temperature':
      iconHtml = `<svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z"/></svg>`;
      break;
    case 'humidity':
      iconHtml = `<svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 9.172V5L8 4z"/></svg>`;
      break;
    case 'stock_level':
      iconHtml = `<svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`;
      break;
    case 'motion':
      iconHtml = `<svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>`;
      break;
    case 'door':
      iconHtml = `<svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>`;
      break;
    case 'fire':
      iconHtml = `<svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/></svg>`;
      break;
    default:
      iconHtml = `<svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
  }

  return L.divIcon({
    html: `
      <div class="flex items-center justify-center w-8 h-8 rounded-full shadow-lg ${colorClass} border-2 border-slate-900 cursor-pointer transition-all hover:scale-110">
        ${iconHtml}
      </div>
    `,
    className: 'custom-leaflet-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

interface ZoneData {
  id: number;
  name: string;
  zone_type: 'storage' | 'loading' | 'refrigeration' | 'hazmat';
  coordinates_json: { x: number; y: number; w: number; h: number };
  status: 'green' | 'yellow' | 'red';
  latest_readings?: { avg_temp: number | null; avg_humidity: number | null };
}

interface DeviceData {
  id: number;
  device_uid: string;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'maintenance';
  battery_level: number;
  zone_id: number;
  // We mock x,y offsets relative to zone origin for visualization
  xOffset?: number;
  yOffset?: number;
}

interface WarehouseMapProps {
  zones: ZoneData[];
  devices: DeviceData[];
  onDeviceSelect: (device: DeviceData) => void;
  onZoneSelect: (zone: ZoneData) => void;
  heatmapType: 'none' | 'temperature' | 'humidity';
}

export const WarehouseMap: React.FC<WarehouseMapProps> = ({
  zones,
  devices,
  onDeviceSelect,
  onZoneSelect,
  heatmapType,
}) => {
  // Map dimensions representable in feet/meters (e.g. 100 x 100 coordinate space)
  const bounds: L.LatLngBoundsExpression = [[0, 0], [100, 100]];

  // Generate polygons coordinates from bounding coordinates_json {x, y, w, h}
  const getPolygonCoords = (rect: { x: number; y: number; w: number; h: number }): L.LatLngExpression[] => {
    // Leaflet LatLng works as [Y, X]
    // Translate x,y bottom-left coordinates into Leaflet polygon vertices
    const { x, y, w, h } = rect;
    return [
      [y, x],
      [y + h, x],
      [y + h, x + w],
      [y, x + w],
    ];
  };

  // Determine Polygon styling based on status and heatmap settings
  const getPolygonStyle = (zone: ZoneData) => {
    // If heatmap overlay is selected, display color mapping corresponding to the average values
    if (heatmapType === 'temperature') {
      const avg = zone.latest_readings?.avg_temp;
      if (avg === null || avg === undefined) return { fillColor: '#475569', fillOpacity: 0.2, color: '#64748B', weight: 1.5 };
      if (avg < 0) return { fillColor: '#3B82F6', fillOpacity: 0.5, color: '#3B82F6', weight: 1.5 }; // freezing (blue)
      if (avg > 30) return { fillColor: '#EF4444', fillOpacity: 0.6, color: '#EF4444', weight: 2 }; // hot (red)
      return { fillColor: '#10B981', fillOpacity: 0.4, color: '#10B981', weight: 1.5 }; // normal (green)
    }

    if (heatmapType === 'humidity') {
      const avg = zone.latest_readings?.avg_humidity;
      if (avg === null || avg === undefined) return { fillColor: '#475569', fillOpacity: 0.2, color: '#64748B', weight: 1.5 };
      if (avg > 70) return { fillColor: '#2563EB', fillOpacity: 0.6, color: '#2563EB', weight: 2 }; // high (dark blue)
      if (avg < 35) return { fillColor: '#F59E0B', fillOpacity: 0.4, color: '#F59E0B', weight: 1.5 }; // dry (orange)
      return { fillColor: '#06B6D4', fillOpacity: 0.4, color: '#06B6D4', weight: 1.5 }; // normal (cyan)
    }

    // Default status styles
    switch (zone.status) {
      case 'red':
        return { fillColor: '#EF4444', fillOpacity: 0.35, color: '#EF4444', weight: 2 };
      case 'yellow':
        return { fillColor: '#F59E0B', fillOpacity: 0.3, color: '#F59E0B', weight: 1.5 };
      case 'green':
      default:
        return { fillColor: '#10B981', fillOpacity: 0.2, color: '#10B981', weight: 1 };
    }
  };

  return (
    <div className="w-full h-[500px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 relative shadow-inner z-0">
      <MapContainer
        crs={L.CRS.Simple}
        bounds={bounds}
        zoomSnap={0.5}
        className="w-full h-full"
        zoomControl={false}
        attributionControl={false}
      >
        <MapController bounds={bounds} />

        {/* Zones Polygons */}
        {zones.map((zone) => {
          if (!zone.coordinates_json) return null;
          const style = getPolygonStyle(zone);
          return (
            <Polygon
              key={zone.id}
              positions={getPolygonCoords(zone.coordinates_json)}
              pathOptions={style}
              eventHandlers={{
                click: () => onZoneSelect(zone),
              }}
            >
              <Tooltip sticky>
                <div className="text-slate-100 font-sans p-1">
                  <div className="font-bold text-sm">{zone.name}</div>
                  <div className="text-xs text-slate-400 capitalize mt-0.5">Type: {zone.zone_type}</div>
                  {zone.latest_readings && (
                    <div className="text-xs font-semibold text-slate-200 mt-1 flex flex-col gap-0.5">
                      {zone.latest_readings.avg_temp !== null && (
                        <span>Temp: {zone.latest_readings.avg_temp}°C</span>
                      )}
                      {zone.latest_readings.avg_humidity !== null && (
                        <span>Humidity: {zone.latest_readings.avg_humidity}%</span>
                      )}
                    </div>
                  )}
                </div>
              </Tooltip>
            </Polygon>
          );
        })}

        {/* Device Markers */}
        {devices.map((device) => {
          const zone = zones.find((z) => z.id === device.zone_id);
          if (!zone || !zone.coordinates_json) return null;

          // Map x,y offsets relative to zone bounding box or generate stable random positions
          const { x, y, w, h } = zone.coordinates_json;
          
          // Seeded placement offsets for deterministic positioning of markers
          const seedX = (device.id * 17) % 100;
          const seedY = (device.id * 31) % 100;

          // Stay within zone margins
          const markerX = x + 2 + (seedX / 100) * (w - 4);
          const markerY = y + 2 + (seedY / 100) * (h - 4);

          return (
            <Marker
              key={device.id}
              position={[markerY, markerX]}
              icon={createDeviceIcon(device.type, device.status)}
              eventHandlers={{
                click: () => onDeviceSelect(device),
              }}
            >
              <Tooltip direction="top" offset={[0, -10]}>
                <div className="text-xs font-sans text-slate-100 p-0.5">
                  <div className="font-bold">{device.name}</div>
                  <div className="text-slate-400 capitalize">Type: {device.type} ({device.status})</div>
                  <div className="text-slate-300 mt-0.5 font-medium">Battery: {device.battery_level}%</div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
export default WarehouseMap;
