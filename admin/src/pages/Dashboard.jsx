import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, UserCheck, Briefcase, CreditCard, Clock, 
  TrendingUp, ShieldAlert, Cpu, Database
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import api from '../api';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [treasury, setTreasury] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, treasuryRes] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/admin/treasury/stats')
        ]);
        setStats(dashRes.data);
        setTreasury(treasuryRes.data);
      } catch (error) {
        toast.error('Failed to load dashboard metrics');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#A020F0] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const cards = [
    { title: 'Total Registered Users', value: stats?.totalUsers || 0, icon: Users, color: 'text-[#A020F0]', bg: 'bg-[#A020F0]/10' },
    { title: 'Active Staking Users', value: stats?.activeUsers || 0, icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { title: 'Total Investment Staked', value: `$${(stats?.totalDeposits || 0).toLocaleString()}`, icon: Briefcase, color: 'text-[#00C6FF]', bg: 'bg-[#00C6FF]/10' },
    { title: 'Total Paid Out', value: `$${(stats?.totalWithdrawals || 0).toLocaleString()}`, icon: CreditCard, color: 'text-[#FF00FF]', bg: 'bg-[#FF00FF]/10' },
    { title: 'Pending Withdrawals', value: `$${(treasury?.pendingPayouts || 0).toLocaleString()}`, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { title: 'Treasury Reserves', value: `$${(treasury?.treasuryReserves || 0).toLocaleString()}`, icon: Database, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  ];

  const chartData = stats?.chartData || [];

  return (
    <div className="space-y-8">
      {/* Alert Banner if Treasury is low */}
      {treasury?.riskAlerts?.includes('RESERVES_CRITICAL') && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3 text-red-400 text-sm">
          <ShieldAlert className="shrink-0 animate-bounce" />
          <div>
            <strong className="font-extrabold uppercase tracking-wide">Treasury Warning:</strong> System reserves have fallen below the emergency threshold! Review settings immediately.
          </div>
        </div>
      )}

      {/* Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-[#0B0F1A] border border-gray-800 rounded-3xl p-6 relative overflow-hidden group hover:border-[#A020F0]/30 transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-transparent to-white/[0.01] pointer-events-none"></div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">{card.title}</p>
                  <h3 className="text-3xl font-black text-white tracking-tight">{card.value}</h3>
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${card.bg} ${card.color} group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={22} />
                </div>
              </div>
              <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                Live Server Data
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart 1: Investment growth */}
        <div className="bg-[#0B0F1A] border border-gray-800 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">Investment & Withdrawal Volatility</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="depositsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00C6FF" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#00C6FF" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="withdrawalsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF00FF" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#FF00FF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#161B2A" />
                <XAxis dataKey="name" stroke="#4B5563" fontSize={11} />
                <YAxis stroke="#4B5563" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0B0F1A', border: '1px solid #1f2937', borderRadius: '12px' }} labelStyle={{ color: '#fff' }} />
                <Area type="monotone" dataKey="deposits" name="Total Deposits" stroke="#00C6FF" fillOpacity={1} fill="url(#depositsGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="withdrawals" name="Total Payouts" stroke="#FF00FF" fillOpacity={1} fill="url(#withdrawalsGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Daily Mining output */}
        <div className="bg-[#0B0F1A] border border-gray-800 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">ROI & Liability Trend</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#161B2A" />
                <XAxis dataKey="name" stroke="#4B5563" fontSize={11} />
                <YAxis stroke="#4B5563" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0B0F1A', border: '1px solid #1f2937', borderRadius: '12px' }} labelStyle={{ color: '#fff' }} />
                <Line type="monotone" dataKey="roi" name="Daily ROI Payouts" stroke="#A020F0" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
