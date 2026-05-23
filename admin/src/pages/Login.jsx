import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, User, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';

const Login = () => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!userId || !password) {
      return toast.error('Please enter all credentials');
    }
    
    setLoading(true);
    try {
      const res = await api.post('/admin/login', { userId, password });
      const user = res.data;
      
      if (user.role !== 'admin') {
        toast.error('Access Denied: Not authorized as Administrator');
        setLoading(false);
        return;
      }
      
      localStorage.setItem('adminUser', JSON.stringify(user));
      toast.success('Admin login successful!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Visual background lights */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#A020F0]/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FF00FF]/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#0B0F1A]/90 backdrop-blur-xl border border-[#A020F0]/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(160,32,240,0.15)] relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#A020F0] to-[#FF00FF] flex items-center justify-center mx-auto mb-4 shadow-[0_0_25px_rgba(160,32,240,0.4)]">
            <ShieldCheck className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-widest uppercase">CTC ADMIN</h1>
          <p className="text-gray-400 text-xs mt-1 uppercase font-semibold tracking-wider">Secure Access Portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Admin User ID</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Enter Admin ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#A020F0] focus:shadow-[0_0_15px_rgba(160,32,240,0.15)] transition-all uppercase"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl pl-12 pr-12 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#A020F0] focus:shadow-[0_0_15px_rgba(160,32,240,0.15)] transition-all"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#A020F0] to-[#6A0DAD] hover:from-[#B026FF] hover:to-[#7B1FA2] text-white py-3.5 rounded-xl font-bold tracking-wider uppercase transition-all shadow-[0_4px_20px_rgba(160,32,240,0.4)] disabled:opacity-50 hover:scale-[1.01] active:scale-95"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
