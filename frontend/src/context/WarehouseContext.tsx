import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';

interface Warehouse {
  id: number;
  name: string;
  location: string;
  type: string;
  timezone: string;
}

interface WarehouseContextType {
  selectedWarehouseId: number | null;
  setSelectedWarehouseId: (id: number) => void;
  warehouses: Warehouse[];
  selectedWarehouse: Warehouse | null;
  isLoading: boolean;
}

const WarehouseContext = createContext<WarehouseContextType | undefined>(undefined);

export const WarehouseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseIdState] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchWarehouses = async () => {
      if (!token) return;
      setIsLoading(true);
      try {
        const response = await axios.get('/api/warehouses', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setWarehouses(response.data);

        // Auto-select first warehouse, or lock to user's assigned warehouse
        if (user && user.role !== 'superadmin' && user.warehouse_id) {
          setSelectedWarehouseIdState(user.warehouse_id);
        } else if (response.data.length > 0) {
          const stored = localStorage.getItem('selectedWarehouseId');
          if (stored && response.data.some((w: any) => w.id === parseInt(stored, 10))) {
            setSelectedWarehouseIdState(parseInt(stored, 10));
          } else {
            setSelectedWarehouseIdState(response.data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch warehouses:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWarehouses();
  }, [token, user]);

  const setSelectedWarehouseId = (id: number) => {
    if (user && user.role !== 'superadmin' && user.warehouse_id && user.warehouse_id !== id) {
      // Prevent bypassing scoping for non-superadmins
      return;
    }
    localStorage.setItem('selectedWarehouseId', id.toString());
    setSelectedWarehouseIdState(id);
  };

  const selectedWarehouse = warehouses.find((w) => w.id === selectedWarehouseId) || null;

  return (
    <WarehouseContext.Provider
      value={{
        selectedWarehouseId,
        setSelectedWarehouseId,
        warehouses,
        selectedWarehouse,
        isLoading,
      }}
    >
      {children}
    </WarehouseContext.Provider>
  );
};

export const useWarehouse = () => {
  const context = useContext(WarehouseContext);
  if (context === undefined) {
    throw new Error('useWarehouse must be used within a WarehouseProvider');
  }
  return context;
};
export default WarehouseContext;
