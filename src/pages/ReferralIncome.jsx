import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, User, Mail, Shield, ShieldCheck, Globe, Copy, Check,
  DollarSign, ArrowUpRight, TrendingUp, Gift, Calendar, ExternalLink, Activity, Car,
  CheckCircle2, Clock
} from 'lucide-react';

const profileData = {
  id: 'D76CD9F3',
  name: 'Ethan',
  email: 'ethan@gmail.com',
  totalNetwork: 3,
};

const referralStats = [
  { title: 'Total Direct Referrals', value: 12, prefix: '', suffix: '', icon: Users, color: 'text-[#00C6FF]', aura: 'bg-[#00C6FF]/20', border: 'border-[#00C6FF]/30' },
  { title: 'Total Referral Income', value: 4250, prefix: 'CTC ', suffix: '.00', icon: DollarSign, color: 'text-[#A020F0]', aura: 'bg-[#A020F0]/20', border: 'border-[#A020F0]/30' },
  { title: 'Pending Bonus', value: 150, prefix: 'CTC ', suffix: '.00', icon: Gift, color: 'text-amber-500', aura: 'bg-amber-500/20', border: 'border-amber-500/30' },
];

const referralHistory = [
  { id: 'CTC881', name: 'Sarah Jenkins', initial: 'S', package: 'Package 3', pkgColor: 'text-[#A020F0] bg-[#A020F0]/10 border-[#A020F0]/30', amount: '25,000', commPercent: '5%', earned: '1,250.00', date: '2026-05-10', status: 'Credited' },
  { id: 'CTC992', name: 'Michael T.', initial: 'M', package: 'Package 2', pkgColor: 'text-[#00C6FF] bg-[#00C6FF]/10 border-[#00C6FF]/30', amount: '5,000', commPercent: '5%', earned: '250.00', date: '2026-05-08', status: 'Credited' },
  { id: 'CTC104', name: 'David W.', initial: 'D', package: 'Package 4', pkgColor: 'text-[#FF00FF] bg-[#FF00FF]/10 border-[#FF00FF]/30', amount: '50,000', commPercent: '5%', earned: '2,500.00', date: '2026-05-05', status: 'Credited' },
  { id: 'CTC115', name: 'Emma R.', initial: 'E', package: 'Package 1', pkgColor: 'text-[#00FF99] bg-[#00FF99]/10 border-[#00FF99]/30', amount: '1,000', commPercent: '5%', earned: '50.00', date: '2026-05-01', status: 'Credited' },
  { id: 'CTC126', name: 'James L.', initial: 'J', package: 'Package 2', pkgColor: 'text-[#00C6FF] bg-[#00C6FF]/10 border-[#00C6FF]/30', amount: '3,000', commPercent: '5%', earned: '150.00', date: '2026-05-12', status: 'Pending' },
];

const Counter = ({ value, prefix, suffix }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value, 10);
    if (start === end) return;

    let totalMilSecDur = 1000;
    let incrementTime = (totalMilSecDur / end) * 2;
    if (incrementTime < 10) incrementTime = 10;

    let timer = setInterval(() => {
      start += Math.ceil(end / 20);
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, incrementTime);
    return () => clearInterval(timer);
  }, [value]);

  return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
};

const ReferralIncome = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(profileData.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#050B14] to-[#050505] pb-12 pt-4 px-4 sm:px-6 lg:px-8 overflow-hidden">
      
      {/* Global Background Watermark */}
      <div className="absolute top-0 right-0 w-full h-full opacity-[0.02] pointer-events-none">
        <Globe size={800} className="absolute -right-64 -top-64 text-[#00C6FF] stroke-[0.5]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-extrabold text-white mb-2"
            >
              Referral Income
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-gray-400"
            >
              Track your direct referral bonuses and historical earnings.
            </motion.p>
          </div>
          
          <motion.button 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden group bg-gradient-to-r from-[#A020F0] to-[#FF00FF] text-white px-6 py-3 rounded-xl font-bold shadow-[0_0_20px_rgba(160,32,240,0.5)] hover:shadow-[0_0_40px_rgba(255,0,255,0.8)] transition-all flex items-center gap-2 animate-pulse-slow"
          >
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Users size={18} className="relative z-10" /> <span className="relative z-10">Invite New Partner</span>
          </motion.button>
        </div>

        {/* Earning Potential & Profile Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          
          {/* Earning Potential Tracker */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 bg-[#161B2A]/80 backdrop-blur-xl border border-gray-800/60 rounded-3xl p-6 shadow-lg relative overflow-hidden flex flex-col justify-center"
          >
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <Activity size={14} className="text-[#00FF99]" /> 4X Earning Potential
            </h3>
            
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_15px_rgba(0,255,153,0.3)]" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-800" />
                <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="251.2" strokeDashoffset="125.6" className="text-[#00FF99]" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-white">50%</span>
                <span className="text-[9px] text-gray-500 uppercase tracking-widest">Reached</span>
              </div>
            </div>
            
            <p className="text-xs text-center text-gray-400 font-medium">Earned: <span className="text-white">CTC 4,250</span> / 8,500</p>
          </motion.div>

          {/* Profile Information */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3 bg-[#0B0F1A]/60 backdrop-blur-[16px] rounded-3xl p-8 relative overflow-hidden group transition-all duration-300 hover:shadow-[0_15px_40px_rgba(160,32,240,0.15)] flex flex-col justify-center"
          >
            {/* Gradient Border & Inner Bevel Shadow */}
            <div className="absolute inset-0 rounded-3xl border border-transparent bg-gradient-to-br from-[#A020F0]/50 via-transparent to-transparent pointer-events-none" style={{ WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude', padding: '1px' }}></div>
            <div className="absolute inset-0 rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] pointer-events-none"></div>

            <h2 className="text-sm font-bold text-white mb-6 tracking-wide relative z-10">YOUR PROFILE INFORMATION</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
              
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Shield size={14} className="text-[#00C6FF] drop-shadow-[0_0_8px_rgba(0,198,255,0.6)]" /> User ID
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-white tracking-tight">{profileData.id}</span>
                  <button 
                    onClick={handleCopy}
                    className="relative w-7 h-7 rounded-lg bg-[#161B2A] flex items-center justify-center border border-gray-700 hover:border-[#A020F0] hover:text-[#A020F0] hover:shadow-[0_0_10px_rgba(160,32,240,0.4)] transition-all overflow-hidden"
                  >
                    {copied && <div className="absolute inset-0 bg-[#00FF99]/20 animate-pulse"></div>}
                    {copied ? <Check size={14} className="text-[#00FF99] relative z-10" /> : <Copy size={14} className="text-gray-400 hover:text-inherit relative z-10" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <User size={14} className="text-[#00FF99] drop-shadow-[0_0_8px_rgba(0,255,153,0.6)]" /> Full Name
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-white tracking-tight">{profileData.name}</span>
                  <div className="group/kyc relative">
                    <div className="bg-[#00FF99]/20 border border-[#00FF99]/40 rounded-full p-0.5 cursor-help">
                      <ShieldCheck size={12} className="text-[#00FF99] drop-shadow-[0_0_5px_rgba(0,255,153,0.5)]" />
                    </div>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 p-2 bg-gray-900 border border-gray-700 text-[10px] text-gray-300 rounded shadow-xl opacity-0 invisible group-hover/kyc:opacity-100 group-hover/kyc:visible transition-all z-20 text-center">
                      Verified User. Mandatory KYC has been completed.
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col col-span-2 md:col-span-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Mail size={14} className="text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.6)]" /> Email
                </span>
                <span className="text-lg font-bold text-white truncate leading-tight tracking-tight mt-1">{profileData.email}</span>
              </div>

              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Users size={14} className="text-[#FF00FF] drop-shadow-[0_0_8px_rgba(255,0,255,0.6)]" /> Total Network
                </span>
                <span className="text-2xl font-bold text-white tracking-tight">{profileData.totalNetwork}</span>
              </div>

            </div>
          </motion.div>
        </div>

        {/* Summary Stats with Unique Auras & Odometers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {referralStats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + (idx * 0.1) }}
                className={`bg-[#0B0F1A]/80 backdrop-blur-xl border border-gray-800/60 rounded-3xl p-6 relative overflow-hidden group hover:${stat.border} transition-colors duration-500`}
              >
                <div className={`absolute -inset-10 ${stat.aura} blur-3xl rounded-full opacity-30 group-hover:opacity-70 transition-opacity duration-700`}></div>
                <div className="relative z-10 flex justify-between items-center">
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">{stat.title}</p>
                    <p className={`text-3xl font-extrabold text-white tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]`}>
                      <Counter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-2xl bg-[#161B2A] flex items-center justify-center ${stat.color} shadow-[inset_0_0_15px_rgba(255,255,255,0.05)] border border-gray-800/50`}>
                    <Icon size={24} className="drop-shadow-[0_0_8px_currentColor]" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Referral History Table */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-[#0B0F1A]/80 backdrop-blur-xl border border-gray-800/60 rounded-3xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)] mb-8"
        >
          <div className="p-6 border-b border-gray-800/60 bg-[#161B2A]/30 flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Direct Referrals Earnings</h3>
            <button className="text-sm text-[#A020F0] font-bold hover:text-[#FF00FF] transition-colors">View All</button>
          </div>

          {/* Table Header */}
          <div className="hidden md:grid grid-cols-8 gap-4 px-6 py-4 border-b border-gray-800/60 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-[#161B2A]/40">
            <div className="col-span-2">Partner Details</div>
            <div className="col-span-2">Investment Tier</div>
            <div className="col-span-1 text-center">Comm. %</div>
            <div className="col-span-1 text-right">Earned</div>
            <div className="col-span-1 text-center">Date</div>
            <div className="col-span-1 text-center">Status</div>
          </div>

          {/* Table Rows */}
          <div className="flex flex-col relative z-10">
            {referralHistory.map((row, idx) => (
              <div 
                key={idx} 
                className="group grid grid-cols-1 md:grid-cols-8 gap-4 px-6 py-5 border-b border-gray-800/30 items-center hover:bg-[#161B2A]/80 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
              >
                {/* Partner Details */}
                <div className="col-span-2 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#050505] border border-gray-700 flex items-center justify-center group-hover:border-[#A020F0] transition-colors shadow-[inset_0_0_10px_rgba(255,255,255,0.05)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#A020F0]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <span className="text-sm font-black text-white relative z-10">{row.initial}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-[#00C6FF] transition-colors">{row.name}</p>
                    <p className="text-[10px] text-gray-500">{row.id}</p>
                  </div>
                </div>

                {/* Investment */}
                <div className="col-span-2">
                  <p className="text-sm font-bold text-white mb-1">CTC {row.amount}</p>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${row.pkgColor}`}>
                    {row.package}
                  </span>
                </div>

                {/* Comm % */}
                <div className="col-span-1 md:text-center">
                  <span className="text-sm font-bold text-white">{row.commPercent}</span>
                </div>

                {/* Earned */}
                <div className="col-span-1 md:text-right">
                  <p className="text-sm font-bold text-[#00FF99] drop-shadow-[0_0_5px_rgba(0,255,153,0.3)]">
                    +CTC {row.earned}
                  </p>
                </div>

                {/* Date */}
                <div className="col-span-1 md:text-center flex items-center md:justify-center gap-1.5">
                  <Calendar size={12} className="text-gray-500 hidden md:block" />
                  <span className="text-xs text-gray-400 font-medium">{row.date}</span>
                </div>

                {/* Status */}
                <div className="col-span-1 md:text-center flex justify-end md:justify-center items-center gap-2 relative">
                  {row.status === 'Credited' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-[#A020F0]/10 text-[#FF00FF] border border-[#A020F0]/30 drop-shadow-[0_0_8px_rgba(160,32,240,0.4)]">
                      <CheckCircle2 size={12} /> Credited
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 drop-shadow-[0_0_8px_rgba(234,179,8,0.3)]">
                      <Clock size={12} className="animate-pulse" /> Pending
                    </span>
                  )}
                  {/* Hover Actions */}
                  <div className="absolute right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[#161B2A] p-1.5 rounded-lg border border-[#00C6FF]/50 text-[#00C6FF] shadow-lg shadow-[#00C6FF]/20 -mr-2 z-20" title="View Transaction">
                    <ExternalLink size={14} />
                  </div>
                </div>

              </div>
            ))}
          </div>
        </motion.div>

        {/* Reward Milestones Bottom Tracker */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-gradient-to-r from-[#161B2A] to-[#0B0F1A] border border-gray-800 rounded-3xl p-6 shadow-lg flex flex-col md:flex-row justify-between items-center gap-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#00C6FF]/10 border border-[#00C6FF]/30 flex items-center justify-center shadow-[inset_0_0_15px_rgba(0,198,255,0.2)]">
              <Car size={20} className="text-[#00C6FF]" />
            </div>
            <div>
              <p className="text-[10px] text-[#00C6FF] font-bold uppercase tracking-widest mb-0.5">Next Milestone Reward</p>
              <h4 className="text-lg font-bold text-white">Unlock BMW at Level 7</h4>
            </div>
          </div>
          <div className="w-full md:w-1/2">
            <div className="flex justify-between text-xs text-gray-400 font-medium mb-2">
              <span>Level 2 Achieved</span>
              <span>Level 7 Required</span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#00C6FF] to-[#00FF99] w-[30%] shadow-[0_0_10px_rgba(0,198,255,0.5)]"></div>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default ReferralIncome;
