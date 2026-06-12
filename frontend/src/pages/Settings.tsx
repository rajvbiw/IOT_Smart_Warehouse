import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useWarehouse } from '../context/WarehouseContext';
import { useAuth } from '../context/AuthContext';
import { Save, UserPlus, Users, Bell, Globe, Building } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface UserItem {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export const Settings: React.FC = () => {
  const { selectedWarehouseId, selectedWarehouse, setSelectedWarehouseId } = useWarehouse();
  const { token, user } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'notifications'>('profile');
  
  // Warehouse state
  const [whName, setWhName] = useState('');
  const [whLoc, setWhLoc] = useState('');
  const [whType, setWhType] = useState('general');
  const [whTimezone, setWhTimezone] = useState('Asia/Kolkata');

  // Users state
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('viewer');

  // Notification state
  const [emailChannel, setEmailChannel] = useState('ops-alerts@warehouse-iot.com');
  const [slackWebhook, setSlackWebhook] = useState('https://hooks.slack.com/services/T00/B00/X00');

  useEffect(() => {
    if (selectedWarehouse) {
      setWhName(selectedWarehouse.name);
      setWhLoc(selectedWarehouse.location);
      setWhType(selectedWarehouse.type);
      setWhTimezone(selectedWarehouse.timezone || 'Asia/Kolkata');
    }
    fetchUsers();
  }, [selectedWarehouse]);

  const fetchUsers = async () => {
    if (!token) return;
    try {
      const res = await axios.get('/api/auth/me', { // fallback user fetch or mock list
        headers: { Authorization: `Bearer ${token}` },
      });
      // Mocking a complete list of users since we are running in local environment
      setUsersList([
        { id: 1, name: 'Super Admin', email: 'superadmin@warehouse-iot.com', role: 'superadmin', is_active: true },
        { id: 2, name: 'Mumbai Manager', email: 'mumbai.mgr@warehouse-iot.com', role: 'warehouse_manager', is_active: true },
        { id: 3, name: 'Mumbai Operator 1', email: 'mumbai.op1@warehouse-iot.com', role: 'operator', is_active: true },
        { id: 5, name: 'Pune Manager', email: 'pune.mgr@warehouse-iot.com', role: 'warehouse_manager', is_active: true },
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleWarehouseUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedWarehouseId) return;

    try {
      await axios.put(
        `/api/warehouses/${selectedWarehouseId}`,
        {
          name: whName,
          location: whLoc,
          type: whType,
          timezone: whTimezone,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Warehouse configurations saved successfully.');
    } catch (err) {
      toast.error('Failed to update warehouse profile.');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    // In demo environment, we simulate adding users to the local state list
    setUsersList((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        name: newUserName,
        email: newUserEmail,
        role: newUserRole,
        is_active: true,
      },
    ]);
    toast.success(`User account created for ${newUserName}`);
    setShowAddUserModal(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('');
  };

  const handleToggleUserActive = (userId: number) => {
    setUsersList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, is_active: !u.is_active } : u))
    );
    toast.success('User status updated.');
  };

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Notification channels configuration stored.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-white">System Settings</h2>
        <p className="text-xs text-slate-400">Configure warehouse profiles, access roles, and alert webhooks</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700/50 text-xs">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 px-6 font-semibold border-b-2 transition-all ${
            activeTab === 'profile' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Warehouse Profile
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-6 font-semibold border-b-2 transition-all ${
            activeTab === 'users' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          User Accounts ({usersList.length})
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-3 px-6 font-semibold border-b-2 transition-all ${
            activeTab === 'notifications' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Notification Channels
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'profile' && selectedWarehouse && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm max-w-xl">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-1.5">
            <Building className="w-4.5 h-4.5 text-blue-400" /> Warehouse Information
          </h3>

          <form onSubmit={handleWarehouseUpdate} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1.5">Warehouse Name</label>
              <input
                type="text"
                required
                value={whName}
                onChange={(e) => setWhName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5">Location Address</label>
              <input
                type="text"
                required
                value={whLoc}
                onChange={(e) => setWhLoc(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-1.5">Storage Category Type</label>
                <select
                  value={whType}
                  onChange={(e) => setWhType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none"
                >
                  <option value="general">General Cargo</option>
                  <option value="cold_storage">Cold Storage</option>
                  <option value="pharma">Pharmaceuticals</option>
                  <option value="chemical">Hazmat Chemicals</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5">Timezone Offset</label>
                <select
                  value={whTimezone}
                  onChange={(e) => setWhTimezone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none"
                >
                  <option value="Asia/Kolkata">India (IST) - UTC+5:30</option>
                  <option value="UTC">Coordinated Universal Time (UTC)</option>
                  <option value="America/New_York">US Eastern (EST) - UTC-5</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={user?.role !== 'superadmin' && user?.role !== 'warehouse_manager'}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-xl shadow transition-all flex items-center gap-1.5 mt-2"
            >
              <Save className="w-4 h-4" /> Save Configurations
            </button>
          </form>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
              <Users className="w-4.5 h-4.5 text-blue-400" /> System Access Users
            </h3>
            {user?.role === 'superadmin' && (
              <button
                onClick={() => setShowAddUserModal(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-1.5 px-3 rounded-lg text-xs transition-all shadow flex items-center gap-1"
              >
                <UserPlus className="w-4 h-4" /> Add User
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-700/50 text-slate-400">
                  <th className="py-2">User Name</th>
                  <th className="py-2">Email Address</th>
                  <th className="py-2">Assigned Role</th>
                  <th className="py-2">Status</th>
                  {user?.role === 'superadmin' && <th className="py-2 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={u.id} className="border-b border-slate-700/30">
                    <td className="py-3 text-slate-200 font-semibold">{u.name}</td>
                    <td className="py-3 text-slate-400">{u.email}</td>
                    <td className="py-3 capitalize">
                      <span className="bg-slate-700/40 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full font-mono text-[10px]">
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase ${
                        u.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    {user?.role === 'superadmin' && (
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleToggleUserActive(u.id)}
                          className={`text-xs font-semibold hover:underline ${
                            u.is_active ? 'text-red-400' : 'text-emerald-400'
                          }`}
                        >
                          {u.is_active ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm max-w-xl">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-1.5">
            <Bell className="w-4.5 h-4.5 text-blue-400" /> Real-time Alerting Pipelines
          </h3>

          <form onSubmit={handleSaveNotifications} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1.5">Operations Mailing List (Mock email)</label>
              <input
                type="email"
                value={emailChannel}
                onChange={(e) => setEmailChannel(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5">Slack Webhook URL (Critical events notification)</label>
              <input
                type="text"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-xl shadow transition-all flex items-center gap-1.5 mt-2"
            >
              <Save className="w-4 h-4" /> Save Channels
            </button>
          </form>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full relative">
            <h3 className="text-md font-bold text-white mb-4">Add User Account</h3>
            
            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="john@warehouse-iot.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5">Security Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none"
                >
                  <option value="warehouse_manager">Warehouse Manager</option>
                  <option value="operator">Operator (Staff)</option>
                  <option value="viewer">Viewer Only</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium shadow-md"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Settings;
