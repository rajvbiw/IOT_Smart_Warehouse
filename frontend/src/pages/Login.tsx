import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Lock, Mail, Server } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all credentials.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { accessToken, refreshToken, user } = response.data;
      
      login(accessToken, refreshToken, user);
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/');
    } catch (err: any) {
      console.error('Login request failed:', err);
      toast.error(err.response?.data?.error || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl p-8 relative overflow-hidden">
        {/* Glow decorative effects */}
        <div className="absolute top-0 left-0 w-24 h-24 bg-blue-500 rounded-full blur-3xl opacity-10"></div>
        <div className="absolute bottom-0 right-0 w-24 h-24 bg-emerald-500 rounded-full blur-3xl opacity-10"></div>

        <div className="text-center mb-8 relative">
          <div className="inline-flex p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 mb-3 text-blue-400">
            <Server className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">IoT Smart Warehouse</h2>
          <p className="text-sm text-slate-400 mt-1.5">Sign in to monitoring & control dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Mail className="w-4.5 h-4.5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manager@warehouse-iot.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-11 pr-4 text-slate-100 placeholder-slate-500 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Lock className="w-4.5 h-4.5" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-11 pr-4 text-slate-100 placeholder-slate-500 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center mt-6 text-xs text-slate-500 border-t border-slate-700/50 pt-4">
          Demo Accounts:
          <div className="mt-1 font-mono text-[10px] text-slate-400">
            superadmin@warehouse-iot.com / admin123
          </div>
          <div className="font-mono text-[10px] text-slate-400">
            mumbai.mgr@warehouse-iot.com / manager123
          </div>
        </div>
      </div>
    </div>
  );
};
export default Login;
