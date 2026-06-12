import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WarehouseProvider, useWarehouse } from './context/WarehouseContext';
import { useSocket } from './hooks/useSocket';
import { AlertTicker } from './components/alerts/AlertTicker';
import { Toaster } from 'react-hot-toast';

// Import Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { FloorMap } from './pages/FloorMap';
import { Devices } from './pages/Devices';
import { DeviceDetail } from './pages/DeviceDetail';
import { Alerts } from './pages/Alerts';
import { Assets } from './pages/Assets';
import { Analytics } from './pages/Analytics';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

// Icons
import {
  LayoutDashboard,
  Map,
  Cpu,
  ShieldAlert,
  Boxes,
  LineChart,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  Bell,
  Building,
} from 'lucide-react';

const queryClient = new QueryClient();

// --- Protected Layout Component ---
const ProtectedLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { selectedWarehouseId, setSelectedWarehouseId, warehouses, selectedWarehouse } = useWarehouse();
  const { isConnected, onlineCount, offlineCount, registerSensorCallback, registerAlertCallback } = useSocket();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const navLinks = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Floor Map', path: '/map', icon: Map },
    { name: 'Devices', path: '/devices', icon: Cpu },
    { name: 'Alerts', path: '/alerts', icon: ShieldAlert },
    { name: 'Assets & Stock', path: '/assets', icon: Boxes },
    { name: 'Analytics', path: '/analytics', icon: LineChart },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <aside
        className={`bg-slate-950 border-r border-slate-800 transition-all duration-300 flex flex-col justify-between z-30 no-print
          ${sidebarCollapsed ? 'w-16' : 'w-64'} 
          ${mobileMenuOpen ? 'translate-x-0 fixed inset-y-0 left-0' : 'max-md:-translate-x-full max-md:hidden'}
        `}
      >
        <div>
          {/* Top Logo & Title */}
          <div className="h-16 border-b border-slate-800 flex items-center justify-between px-4">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-xl">📦</span>
              {!sidebarCollapsed && (
                <span className="font-extrabold text-white tracking-wider text-sm font-sans uppercase">
                  IoT WMS
                </span>
              )}
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white max-md:hidden"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Warehouse Selector */}
          <div className="p-4 border-b border-slate-800/60">
            {sidebarCollapsed ? (
              <div className="text-center text-slate-400"><Building className="w-5 h-5 mx-auto" /></div>
            ) : (
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Select Warehouse</label>
                <select
                  disabled={user.role !== 'superadmin' && !!user.warehouse_id}
                  value={selectedWarehouseId || ''}
                  onChange={(e) => setSelectedWarehouseId(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 p-2.5 rounded-lg focus:border-blue-500 outline-none"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Nav List */}
          <nav className="p-4 space-y-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 py-2.5 px-4.5 rounded-xl text-xs font-semibold tracking-wide transition-all
                    ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                    }
                  `}
                >
                  <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                  {!sidebarCollapsed && <span>{link.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer / User Profile */}
        <div className="p-4 border-t border-slate-800/80 space-y-3">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-white border border-slate-700 text-xs">
                {user.name.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <div className="text-[11px] font-bold text-slate-200 truncate leading-tight">{user.name}</div>
                <div className="text-[9px] text-slate-500 capitalize">{user.role.replace('_', ' ')}</div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 py-2 px-3 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between px-6 z-20 no-print">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-extrabold text-white text-md tracking-tight">
              {selectedWarehouse ? selectedWarehouse.name : 'Warehouse Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-5">
            {/* Live connection status badge */}
            <div className="flex items-center gap-2 border border-slate-800 bg-slate-950/40 px-3 py-1.5 rounded-lg text-xs font-semibold">
              <span className={`w-2 h-2 rounded-full inline-block ${isConnected ? 'bg-emerald-500 animate-ping' : 'bg-red-500'}`}></span>
              <span className="text-slate-400 max-sm:hidden">{isConnected ? 'Broker Connected' : 'Broker Disconnected'}</span>
            </div>

            {/* Notifications Bell */}
            <Link to="/alerts" className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-300 transition-all relative">
              <Bell className="w-4 h-4" />
              {(onlineCount + offlineCount) > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[8px] px-1 rounded-full">
                  {(onlineCount + offlineCount)}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* Real-time alerts banner ticker */}
        <AlertTicker registerAlertCallback={registerAlertCallback} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-900/90 relative">
          <Routes>
            <Route path="/" element={<Dashboard registerSensorCallback={registerSensorCallback} registerAlertCallback={registerAlertCallback} />} />
            <Route path="/map" element={<FloorMap />} />
            <Route path="/devices" element={<Devices registerSensorCallback={registerSensorCallback} />} />
            <Route path="/devices/:id" element={<DeviceDetail registerSensorCallback={registerSensorCallback} />} />
            <Route path="/alerts" element={<Alerts registerAlertCallback={registerAlertCallback} />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
      <Toaster position="bottom-right" reverseOrder={false} />
    </div>
  );
};

// --- Main App Entry Router ---
export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <WarehouseProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/*" element={<ProtectedLayout />} />
            </Routes>
          </WarehouseProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
export default App;
