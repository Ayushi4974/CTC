import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Database, ShieldAlert, Sliders } from 'lucide-react';
import api from '../api';
import { toast } from 'react-toastify';

const Settings = () => {
  const [settings, setSettings] = useState({
    minWithdrawalAmount: 10,
    maxDailyWithdrawalAmount: 10000,
    withdrawalCooldownHours: 24,
    emergencyThreshold: 5000,
    treasuryReserves: 25000,
    globalRoiMultiplier: 1.0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/admin/treasury/stats');
        if (res.data.settings) {
          setSettings(res.data.settings);
        }
      } catch (error) {
        toast.error('Failed to load system settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : Number(value)
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.put('/admin/treasury/settings', settings);
      toast.success('System parameters updated successfully!');
    } catch (error) {
      toast.error('Failed to update system parameters');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[40vh]">
        <div className="w-10 h-10 border-4 border-[#A020F0] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* settings card form */}
      <div className="bg-[#0B0F1A] border border-gray-800 rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#A020F0]/5 rounded-full blur-2xl"></div>

        <div className="flex justify-between items-center border-b border-gray-800/50 pb-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">System Settings Control</h3>
            <p className="text-xs text-gray-500 mt-1">Configure limits, emergency reserves, and withdrawal lock cooldowns</p>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 bg-gradient-to-r from-[#A020F0] to-[#6A0DAD] hover:from-[#B026FF] text-white px-4 py-2 rounded-xl text-sm font-bold tracking-wide uppercase transition-all shadow-[0_0_15px_rgba(160,32,240,0.3)]"
          >
            <Save size={16} />
            <span>Save Parameters</span>
          </button>
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1: limits */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sliders size={14} className="text-[#FF00FF]" />
              Withdrawal Limits & Lockouts
            </h4>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Min Withdrawal ($)</label>
              <input
                type="number"
                name="minWithdrawalAmount"
                value={settings.minWithdrawalAmount}
                onChange={handleChange}
                className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#A020F0]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Max Daily Withdrawal ($)</label>
              <input
                type="number"
                name="maxDailyWithdrawalAmount"
                value={settings.maxDailyWithdrawalAmount}
                onChange={handleChange}
                className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#A020F0]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Withdrawal Lockout Period (Hours)</label>
              <input
                type="number"
                name="withdrawalCooldownHours"
                value={settings.withdrawalCooldownHours}
                onChange={handleChange}
                className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#A020F0]"
              />
              <span className="block text-[10px] text-gray-500 mt-1">Prevents withdrawals for X hours after last package purchase or payout request.</span>
            </div>
          </div>

          {/* Section 2: reserves */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <Database size={14} className="text-[#FF00FF]" />
              Treasury Reserve Parameters
            </h4>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Current Staking Reserves ($)</label>
              <input
                type="number"
                name="treasuryReserves"
                value={settings.treasuryReserves}
                onChange={handleChange}
                className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#A020F0]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Emergency Reserves Threshold ($)</label>
              <input
                type="number"
                name="emergencyThreshold"
                value={settings.emergencyThreshold}
                onChange={handleChange}
                className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#A020F0]"
              />
              <span className="block text-[10px] text-gray-500 mt-1">Triggers emergency mode warnings if reserves drop below this limit.</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Global ROI Scaling Multiplier</label>
              <input
                type="number"
                step="0.1"
                name="globalRoiMultiplier"
                value={settings.globalRoiMultiplier}
                onChange={handleChange}
                className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#A020F0]"
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
