import React from 'react';
import { 
  Zap, 
  Cpu, 
  ShieldCheck, 
  TrendingUp, 
  Clock, 
  Wallet, 
  Gift, 
  Users, 
  BarChart2, 
  Briefcase,
  UserCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProfile } from '../redux/slices/authSlice';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../api';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { user, profile, walletAddress } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  const currentUser = profile || user;
  const balance = currentUser?.availableBalance || 0;
  const totalEarning = currentUser?.totalEarning || 0;
  const levelIncome = currentUser?.levelIncome || 0;
  const referralIncome = currentUser?.referralIncome || 0;
  const miningIncome = currentUser?.miningIncome || 0;
  const directTeam = currentUser?.directTeam || 0;
  const sponsor = currentUser?.sponsorId || 'None';
  const isActive = currentUser?.isActive || false;
  const activePackageName = currentUser?.activePackage?.name || 'None';
  const promotionalIncome = currentUser?.promotionalIncome || 0;
  const fastrackQualified = currentUser?.fastrackQualified ? 'Active' : 'Inactive';
  
  const [miningProgress, setMiningProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState('');
  const [activePackages, setActivePackages] = useState([]);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const res = await api.get('/package/my-packages');
        setActivePackages(res.data.filter(p => p.status === 'active'));
      } catch (err) {
        console.error('Error fetching packages:', err);
      }
    };
    fetchPackages();

    const updateProgress = () => {
      const now = new Date().getTime();
      const cycleMs = 12 * 60 * 60 * 1000;
      const elapsed = now % cycleMs;
      const progress = (elapsed / cycleMs) * 100;
      setMiningProgress(progress);

      const remainingMs = cycleMs - elapsed;
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };
    
    updateProgress();
    const interval = setInterval(updateProgress, 1000);
    return () => clearInterval(interval);
  }, []);

  const getPackageProfit = () => {
    if (activePackages.length === 0) {
      if (currentUser?.totalInvestment >= 20) return '0.25%';
      return '0%';
    }
    
    // Sum the profit percentages
    const totalProfit = activePackages.reduce((sum, p) => sum + (p.dailyProfitPercent || 0), 0);
    return `${totalProfit.toFixed(1)}%`;
  };

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
          dispatch({ type: 'auth/setWalletAddress', payload: accounts[0] });
          toast.success("Wallet connected successfully!");
        } else {
          toast.error("No active wallet found. Please unlock your wallet.");
        }
      } catch (error) {
        console.error("Wallet connection error:", error);
        toast.error(error?.message || "Failed to connect wallet. Please check your extension.");
      }
    } else {
      toast.error("Please install MetaMask to use this feature!");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Top Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Welcome Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#05000a] to-[#12001F] rounded-3xl p-8 border border-gray-800/50 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF00FF]/5 to-[#A020F0]/10"></div>
          
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div className="inline-block px-3 py-1 bg-[#A020F0]/20 rounded-full text-xs font-semibold text-[#FF00FF] mb-6 uppercase tracking-wider">
                Dashboard Overview
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Welcome back, <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF00FF] via-[#A020F0] to-[#6A0DAD]">{currentUser?.fullName || 'User'}</span>
              </h1>
              
              <div className={`inline-flex items-center gap-2 px-3 py-1 border rounded-full text-xs font-medium mb-6 ${isActive ? 'bg-[#00FF99]/10 border-[#00FF99]/30 text-[#00FF99]' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#00FF99] shadow-[0_0_8px_rgba(0,255,153,0.8)]' : 'bg-red-500 shadow-[0_0_8px_rgba(255,0,0,0.8)]'}`}></div>
                {isActive ? 'ACTIVE' : 'INACTIVE'}
              </div>
              
              <p className="text-gray-400 text-sm md:text-base max-w-md">
                Your portfolio performance and network growth at a glance.
              </p>
            </div>
            
            <div className="mt-8">
              {walletAddress ? (
                <button className="bg-gray-800 text-[#00FF99] border border-[#00FF99]/30 px-8 py-3 rounded-xl font-medium shadow-lg flex items-center gap-2">
                  <Wallet size={18} />
                  Connected: {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
                </button>
              ) : (
                <button 
                  onClick={connectWallet}
                  className="bg-gradient-to-r from-[#A020F0] to-[#FF00FF] text-white px-8 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Mining Operations Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#0f0f13] border border-gray-800 rounded-3xl p-6 lg:p-8"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Cpu className="text-[#A020F0]" size={24} />
              <h2 className="text-xl font-bold text-white">Mining Operations</h2>
            </div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-800/40 px-2 py-1 rounded border border-gray-700">
              Mon - Fri Cycle
            </div>
          </div>
          <p className="text-gray-400 text-sm mb-6">Real-time trading performance & ROI</p>
          
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <div className="px-4 py-2.5 border border-[#00FF99]/30 text-[#00FF99] bg-[#00FF99]/5 rounded-lg text-sm font-semibold tracking-wider flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00FF99] animate-pulse"></div>
              {isActive ? 'TRADING LIVE' : 'AWAITING ACTIVATION'}
            </div>
            <div className="px-4 py-2.5 border border-[#FF00FF]/30 text-[#FF00FF] bg-[#FF00FF]/5 rounded-lg text-sm font-medium flex items-center gap-2">
              <Briefcase size={16} /> STAKED: ${currentUser?.totalInvestment || '0.00'}
            </div>
            <div className="px-4 py-2.5 border border-gray-700 text-gray-300 bg-gray-800/40 rounded-lg text-[10px] font-bold uppercase tracking-tighter">
              ROI: {getPackageProfit()} / 12h
            </div>
          </div>

          {/* Active Packages List */}
          {activePackages.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {activePackages.map((p, idx) => (
                <div key={idx} className="bg-[#161B2A] border border-[#A020F0]/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
                  <ShieldCheck size={12} className="text-[#A020F0]" />
                  <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wide">
                    {p.packageId?.name || 'Package'} (${p.amount})
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mb-6">
            <div className="flex justify-between text-xs font-semibold text-gray-500 tracking-wider mb-2 uppercase">
              <span>Next Profit Sync</span>
              <span className="text-[#FF00FF] font-mono">{timeLeft}</span>
            </div>
            <div className="h-2.5 w-full bg-gray-800 rounded-full overflow-hidden p-0.5 border border-gray-700">
              <div 
                className="h-full bg-gradient-to-r from-[#A020F0] via-[#FF00FF] to-[#A020F0] rounded-full transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(160,32,240,0.5)]"
                style={{ width: `${miningProgress}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-[#15151a] rounded-2xl p-4 border border-gray-800/50 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#A020F0]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Mined (This Month)</p>
              <h3 className="text-2xl font-bold text-white mb-2">{isActive ? '12 Sessions' : '0 Sessions'}</h3>
              <p className="text-xs text-[#FF00FF] font-medium flex items-center gap-1">
                <Zap size={12} /> {isActive ? '45.8' : '0'} TH/s Power
              </p>
            </div>
            <div className="bg-[#15151a] rounded-2xl p-4 border border-gray-800/50 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#00C6FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Total Trading ROI</p>
              <h3 className="text-2xl font-bold text-[#00C6FF] mb-2">${miningIncome.toFixed(2)}</h3>
              <p className="text-xs text-gray-500">Live Cycle Returns</p>
            </div>
          </div>

          <div className="bg-[#15151a] rounded-xl p-4 border border-gray-800/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-gray-800/80 flex items-center justify-center text-gray-400">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Current Session Status</p>
                <p className="text-sm font-medium text-white">{isActive ? 'Trading Operational' : 'Inactive'}</p>
              </div>
            </div>
            <div className="text-[10px] font-bold text-[#00FF99] bg-[#00FF99]/10 px-2 py-1 rounded border border-[#00FF99]/30">
              SYNCED
            </div>
          </div>

        </motion.div>
      </div>

      {/* Token Performance */}
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-6">
          <Zap className="text-yellow-500" size={24} />
          <h2 className="text-xl font-bold text-white">Token Performance</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
          {[
            { title: 'Available Balance', value: `$${balance.toFixed(2)}`, sub: 'Ready to Withdraw', icon: Wallet, iconColor: 'text-[#A020F0]', iconBg: 'bg-[#A020F0]/10' },
            { title: 'Total Earnings', value: `$${totalEarning.toFixed(2)}`, sub: 'Lifetime Income', icon: TrendingUp, iconColor: 'text-[#00FF99]', iconBg: 'bg-[#00FF99]/10' },
            { title: 'Mining Income', value: `$${miningIncome.toFixed(2)}`, sub: 'Passive ROI', icon: Cpu, iconColor: 'text-[#A020F0]', iconBg: 'bg-[#A020F0]/10' },
          ].map((item, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + idx * 0.1 }}
              className="bg-[#0f0f13] border border-gray-800 rounded-2xl p-6 relative overflow-hidden group hover:border-gray-700 transition-colors"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">{item.title}</p>
                  <h3 className="text-3xl font-bold text-white">{item.value}</h3>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.iconBg} ${item.iconColor}`}>
                  <item.icon size={20} />
                </div>
              </div>
              <div className={`inline-block px-3 py-1 rounded-md text-xs font-medium ${item.subBg || 'bg-gray-800'} ${item.subColor || 'text-gray-400'}`}>
                {item.sub}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Income & Network */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-10">
        
        {/* Income Analysis */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Wallet className="text-emerald-500" size={24} />
              <h2 className="text-xl font-bold text-white">Income Analysis</h2>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">Total: ${totalEarning.toFixed(2)}</span>
              <button className="text-sm text-[#FF00FF] px-4 py-2 bg-[#FF00FF]/10 rounded-lg border border-[#FF00FF]/20 hover:bg-[#FF00FF]/20 transition-colors flex items-center gap-2">
                <BarChart2 size={16} /> Earnings Analytics
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Active Package', value: activePackageName, icon: Briefcase, iconColor: 'text-[#00FF99]', iconBg: 'bg-[#00FF99]/10' },
              { title: 'ROI Daily Profit', value: `$${miningIncome.toFixed(2)}`, icon: Cpu, iconColor: 'text-[#00C6FF]', iconBg: 'bg-[#00C6FF]/10' },
              { title: 'Fastrack Bonus', value: fastrackQualified, icon: Zap, iconColor: 'text-amber-500', iconBg: 'bg-amber-500/10' },
              { title: 'Level Bonus', value: `$${levelIncome.toFixed(2)}`, icon: TrendingUp, iconColor: 'text-[#A020F0]', iconBg: 'bg-[#A020F0]/10' },
              { title: 'Promotion Bonus', value: `$${promotionalIncome.toFixed(2)}`, icon: Gift, iconColor: 'text-[#FF00FF]', iconBg: 'bg-[#FF00FF]/10' },
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                className="bg-[#0f0f13] border border-gray-800 rounded-2xl p-6 flex items-center justify-between group hover:border-gray-700 transition-colors"
              >
                <div>
                  <p className="text-sm text-gray-400 mb-2">{item.title}</p>
                  <h3 className="text-2xl font-bold text-white">{item.value}</h3>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.iconBg} ${item.iconColor}`}>
                  <item.icon size={24} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Network */}
        <div className="lg:col-span-1">
          <div className="flex items-center gap-2 mb-6">
            <Users className="text-purple-500" size={24} />
            <h2 className="text-xl font-bold text-white">Network</h2>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-[#0f0f13] border border-gray-800 rounded-3xl p-6"
          >
            <div className="bg-[#15151a] rounded-2xl p-6 border border-gray-800/50 text-center mb-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#A020F0]/10 rounded-full blur-2xl"></div>
              <p className="text-xs text-[#FF00FF] uppercase font-bold tracking-widest mb-2 relative z-10">Your Referral ID</p>
              <h3 className="text-3xl font-bold text-white tracking-wider relative z-10">{currentUser?.userId || 'N/A'}</h3>
            </div>
            
            <div className="space-y-3 mb-6">
              {[
                { title: 'Direct Team', value: directTeam.toString(), icon: Briefcase, color: 'text-[#A020F0]' },
                { title: 'Sponsor', value: sponsor, icon: ShieldCheck, color: 'text-[#FF00FF]' },
                { title: 'Referral Income', value: `$${referralIncome.toFixed(2)}`, icon: Users, color: 'text-[#A020F0]' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-[#15151a] border border-gray-800/30">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg bg-gray-800/50 flex items-center justify-center ${item.color}`}>
                      <item.icon size={16} />
                    </div>
                    <span className="text-sm text-gray-400">{item.title}</span>
                  </div>
                  <span className="text-white font-bold">{item.value}</span>
                </div>
              ))}
            </div>
            
            <button className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-medium transition-colors border border-gray-700">
              View Full Network
            </button>
          </motion.div>
        </div>

      </div>
      
    </div>
  );
};

export default Dashboard;
