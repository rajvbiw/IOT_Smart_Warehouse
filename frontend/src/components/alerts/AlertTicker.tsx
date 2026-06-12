import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useWarehouse } from '../../context/WarehouseContext';
import { useAuth } from '../../context/AuthContext';

interface Alert {
  id: number;
  message: string;
  severity: string;
  created_at: string;
}

interface AlertTickerProps {
  registerAlertCallback: (id: string, cb: (data: any) => void) => () => void;
}

export const AlertTicker: React.FC<AlertTickerProps> = ({ registerAlertCallback }) => {
  const { selectedWarehouseId } = useWarehouse();
  const { token } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const fetchAlerts = async () => {
      if (!token || !selectedWarehouseId) return;
      try {
        const res = await axios.get(`/api/alerts?warehouse_id=${selectedWarehouseId}&status=open`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAlerts(res.data);
      } catch (err) {
        console.error('Failed to fetch alerts in ticker:', err);
      }
    };

    fetchAlerts();

    // Register socket listener to add new alerts in real-time
    const unsubscribe = registerAlertCallback('ticker', (newAlert) => {
      setAlerts((prev) => [newAlert, ...prev]);
    });

    return () => unsubscribe();
  }, [token, selectedWarehouseId, registerAlertCallback]);

  // Keep only critical/warning alerts for the ticker
  const activeAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'warning');

  return (
    <div className="bg-slate-950 border-y border-slate-800 text-xs py-2 overflow-hidden whitespace-nowrap relative h-8 flex items-center">
      <div className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-slate-950 to-transparent w-8 z-10"></div>
      <div className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-slate-950 to-transparent w-8 z-10"></div>
      
      {activeAlerts.length === 0 ? (
        <div className="animate-marquee inline-block text-emerald-400 pl-[100%]">
          🟢 SYSTEM STATUS NORMAL — All warehouse zones operating within safe safety thresholds. Heartbeats active.
        </div>
      ) : (
        <div className="animate-marquee inline-block text-amber-400 pl-[100%] flex gap-12">
          {activeAlerts.map((alert) => (
            <span key={alert.id} className="inline-flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full inline-block ${alert.severity === 'critical' ? 'bg-red-500 animate-ping' : 'bg-yellow-500'}`}></span>
              <span className={alert.severity === 'critical' ? 'text-red-400 font-semibold' : 'text-yellow-400'}>
                [{alert.severity.toUpperCase()}]
              </span>{' '}
              {alert.message} ({new Date(alert.created_at).toLocaleTimeString()})
            </span>
          ))}
        </div>
      )}

      {/* Marquee CSS Keyframes injected directly */}
      <style>{`
        @keyframes marquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-100%, 0, 0); }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee 30s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};
export default AlertTicker;
