import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useWarehouse } from '../context/WarehouseContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

export const useSocket = () => {
  const { selectedWarehouseId } = useWarehouse();
  const { token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [offlineCount, setOfflineCount] = useState(0);
  
  const socketRef = useRef<Socket | null>(null);

  // Setup listeners for other components to register callbacks dynamically
  const sensorCallbacks = useRef<Map<string, (data: any) => void>>(new Map());
  const alertCallbacks = useRef<Map<string, (data: any) => void>>(new Map());

  const registerSensorCallback = (id: string, cb: (data: any) => void) => {
    sensorCallbacks.current.set(id, cb);
    return () => { sensorCallbacks.current.delete(id); };
  };

  const registerAlertCallback = (id: string, cb: (data: any) => void) => {
    alertCallbacks.current.set(id, cb);
    return () => { alertCallbacks.current.delete(id); };
  };

  useEffect(() => {
    if (!token || !selectedWarehouseId) return;

    // Connect to local proxy/server
    const socket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket.io connected to server.');
      
      // Join the specific warehouse room
      socket.emit('join_warehouse', selectedWarehouseId);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket.io disconnected.');
    });

    // Real-time sensor telemetry updates
    socket.on('sensor_update', (data) => {
      sensorCallbacks.current.forEach((cb) => cb(data));
    });

    // Real-time new alert triggers
    socket.on('new_alert', (data) => {
      // Show toaster notification
      const toastStyle = {
        background: '#1e293b',
        color: '#f8fafc',
        border: '1px solid #334155',
      };
      
      if (data.severity === 'critical') {
        toast.error(`⚠️ CRITICAL ALERT: ${data.message}`, { duration: 6000, style: toastStyle });
      } else {
        toast(`⚠️ Warning Alert: ${data.message}`, { duration: 4000, style: toastStyle });
      }

      alertCallbacks.current.forEach((cb) => cb(data));
    });

    // Device status updates
    socket.on('device_status_change', (data) => {
      const toastStyle = { background: '#1e293b', color: '#f8fafc', border: '1px solid #334155' };
      if (data.status === 'offline') {
        toast.error(`🔌 Device offline: ${data.device_uid}`, { style: toastStyle });
      } else {
        toast.success(`🔌 Device back online: ${data.device_uid}`, { style: toastStyle });
      }
    });

    // Heartbeat online/offline count updates
    socket.on('heartbeat', (data) => {
      setOnlineCount(data.online_count);
      setOfflineCount(data.offline_count);
    });

    return () => {
      if (socket) {
        socket.emit('leave_warehouse', selectedWarehouseId);
        socket.disconnect();
      }
    };
  }, [token, selectedWarehouseId]);

  return {
    isConnected,
    onlineCount,
    offlineCount,
    registerSensorCallback,
    registerAlertCallback,
  };
};
export default useSocket;
