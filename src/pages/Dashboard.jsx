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
  UserCheck,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProfile } from '../redux/slices/authSlice';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import api from '../api';

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  if (apiUrl) {
    const serverUrl = apiUrl.replace(/\/api$/, '');
    return `${serverUrl}${cleanPath}`;
  }
  return cleanPath;
};

const Dashboard = () => {
  const dispatch = useDispatch();
  const { user, profile, walletAddress } = useSelector((state) => state.auth);

  const [miningProgress, setMiningProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState('');
  const [activePackages, setActivePackages] = useState([]);
  const [announcementImages, setAnnouncementImages] = useState([]);
  const [announcementContent, setAnnouncementContent] = useState('');
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const [dashboardSettings, setDashboardSettings] = useState({
    transparencyProfitsThisWeek: '+0.82%',
    transparencyProfitsLastWeek: '+5.28%',
    transparencyProfitsLast30Days: '+16.10%',
    transparencyPerformanceOverview: '17.33%',
    transparencyChartData: [],
    liveTradingFeed: []
  });
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  useEffect(() => {
    const fetchDashboardSettings = async () => {
      try {
        const res = await api.get('/user/dashboard-settings');
        if (res.data) {
          setDashboardSettings(res.data);
        }
      } catch (err) {
        console.error('Error fetching dashboard settings:', err);
      }
    };
    fetchDashboardSettings();
  }, []);

  const currentUser = profile || user;
  const filteredChartData = (dashboardSettings.transparencyChartData || []).filter(
    item => item.period === selectedPeriod
  );
  const balance = currentUser?.availableBalance || 0;
  const totalEarning = currentUser?.totalEarning || 0;
  const levelIncome = currentUser?.levelIncome || 0;
  const referralIncome = currentUser?.referralIncome || 0;
  const miningIncome = currentUser?.miningIncome || 0;
  const directTeam = currentUser?.directTeam || 0;
  const sponsor = currentUser?.sponsorId || 'None';
  const isActive = currentUser?.isActive || false;
  const activePackageName = activePackages.length > 0 
    ? activePackages.map(p => p.packageId?.name || 'Standard Package').join(', ')
    : (currentUser?.activePackage?.name || 'None');
  const promotionalIncome = currentUser?.promotionalIncome || 0;
  const fastrackQualified = currentUser?.fastrackQualified ? 'Active' : 'Inactive';

  useEffect(() => {
    const checkAnnouncement = async () => {
      try {
        const res = await api.get('/user/announcement');
        if (res.data) {
          const images = res.data.announcementImages && res.data.announcementImages.length > 0
            ? res.data.announcementImages
            : (res.data.announcementImage ? [res.data.announcementImage] : []);
          const content = res.data.announcementContent || '';
          if (images.length > 0 || content) {
            const announcementKey = `${images.join(',')}||${content}`;
            const lastSeen = localStorage.getItem('last_seen_announcement');
            if (lastSeen !== announcementKey) {
              setAnnouncementImages(images);
              setAnnouncementContent(content);
              setShowAnnouncement(true);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching announcement:', err);
      }
    };
    checkAnnouncement();
  }, []);

  const handleCloseAnnouncement = () => {
    const announcementKey = `${announcementImages.join(',')}||${announcementContent}`;
    localStorage.setItem('last_seen_announcement', announcementKey);
    setShowAnnouncement(false);
  };

  const handleCarouselScroll = (e) => {
    const width = e.target.offsetWidth;
    const scrollLeft = e.target.scrollLeft;
    const index = Math.round(scrollLeft / width);
    setActiveCarouselIndex(index);
  };

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
      const today = new Date();
      const day = today.getDay(); // 0 = Sunday, 6 = Saturday
      if (day === 0 || day === 6) {
        setMiningProgress(0);
        setTimeLeft('Resumes Monday');
        return;
      }

      const now = today.getTime();
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
              {currentUser?.pins === 0 && (
                <div className="inline-flex items-center gap-2 px-3 py-1 border border-red-500/30 bg-red-500/10 text-red-500 rounded-full text-xs font-medium mb-6 ml-2">
                  <span>0 Pin</span>
                </div>
              )}
              {currentUser?.achieverBadge && (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 border border-amber-500/50 bg-gradient-to-r from-amber-500/15 to-yellow-400/10 rounded-full text-xs font-bold mb-6 ml-2 shadow-[0_0_12px_rgba(245,158,11,0.25)] animate-pulse">
                  <span className="text-base leading-none">🏆</span>
                  <span className="text-amber-300 tracking-wide">{currentUser.achieverBadge}</span>
                </div>
              )}
              
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

        {/* Copy Trading Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#0f0f13] border border-gray-800 rounded-3xl p-6 lg:p-8"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Cpu className="text-[#A020F0]" size={24} />
              <h2 className="text-xl font-bold text-white">Copy Trading</h2>
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
            { title: 'Copy Trade Income', value: `$${miningIncome.toFixed(2)}`, sub: 'Passive ROI', icon: Cpu, iconColor: 'text-[#A020F0]', iconBg: 'bg-[#A020F0]/10' },
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

      {/* Transparency & Live Trading Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-10">
        {/* Transparency Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 className="text-[#00FF99]" size={24} />
            <h2 className="text-xl font-bold text-white">Transparency</h2>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { title: 'Profits This Week', value: dashboardSettings.transparencyProfitsThisWeek },
              { title: 'Profits Last Week', value: dashboardSettings.transparencyProfitsLastWeek },
              { title: 'Profits Last 30 Days', value: dashboardSettings.transparencyProfitsLast30Days },
            ].map((stat, idx) => (
              <div key={idx} className="bg-[#0f0f13] border border-gray-800/80 rounded-2xl p-5 hover:border-gray-700 transition-colors">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">{stat.title}</p>
                <h3 className="text-2xl font-black text-[#00FF99]">{stat.value}</h3>
              </div>
            ))}
          </div>

          {/* Performance Overview Chart Card */}
          <div className="bg-[#0f0f13] border border-gray-800 rounded-3xl p-6 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Performance Overview</p>
                <h3 className="text-3xl font-black text-white">{dashboardSettings.transparencyPerformanceOverview}%</h3>
              </div>
              
              {/* Period Tabs */}
              <div className="flex bg-gray-950/80 border border-gray-800 p-1 rounded-xl text-xs overflow-x-auto max-w-full">
                {[
                  { id: 'week', label: 'Current Week' },
                  { id: 'month', label: 'Month' },
                  { id: '3m', label: '3M' },
                  { id: '6m', label: '6M' },
                  { id: 'year', label: 'Year' },
                  { id: 'all', label: 'All' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedPeriod(tab.id)}
                    className={`px-3 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${
                      selectedPeriod === tab.id
                        ? 'bg-gradient-to-r from-[#00C6FF] to-[#0072FF] text-white shadow-[0_0_10px_rgba(0,198,255,0.3)]'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart Area */}
            <div className="h-64 w-full">
              {filteredChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={filteredChartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00C6FF" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00C6FF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="label" 
                      stroke="#4B5563" 
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#4B5563" 
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0B0F1A', borderColor: '#1F2937', borderRadius: '12px' }}
                      labelStyle={{ color: '#9CA3AF', fontWeight: 'bold' }}
                      itemStyle={{ color: '#00C6FF' }}
                      formatter={(value) => [`${value}%`, 'Return']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#00C6FF" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#chartGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 text-sm font-semibold">
                  No data points configured for this period
                </div>
              )}
            </div>
            <p className="text-[11px] text-gray-500 text-center mt-4">Cumulative returns for the selected period</p>
          </div>
        </div>

        {/* Live Trading Feed Column */}
        <div className="lg:col-span-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-[#FF00FF]" size={24} />
              <h2 className="text-xl font-bold text-white">Live Trading Feed</h2>
            </div>
            <div className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 animate-pulse uppercase tracking-wider">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
              Live
            </div>
          </div>

          <div className="flex-1 bg-[#0f0f13] border border-gray-800 rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between min-h-[350px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF00FF]/5 rounded-full blur-2xl"></div>
            
            <div className="space-y-4 overflow-y-auto max-h-[380px] pr-1 hide-scrollbar">
              {(dashboardSettings.liveTradingFeed || []).map((trade, idx) => {
                const isProfit = trade.closePrice >= trade.openPrice;
                return (
                  <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-gray-900/40 border border-gray-800/50 hover:border-gray-700/60 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">{trade.asset}</span>
                        <span className="text-[10px] font-mono text-gray-500">{trade.time}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <span className="block text-[9px] text-gray-500 uppercase font-bold tracking-wider">Open</span>
                        <span className="text-xs text-gray-300 font-mono font-bold">${trade.openPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-gray-500 uppercase font-bold tracking-wider">Close</span>
                        <span className={`text-xs font-mono font-black ${isProfit ? 'text-emerald-400' : 'text-rose-500'}`}>
                          ${trade.closePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {(!dashboardSettings.liveTradingFeed || dashboardSettings.liveTradingFeed.length === 0) && (
                <div className="text-center py-10 text-gray-500 text-sm font-semibold">
                  No active trades feed
                </div>
              )}
            </div>
          </div>
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
                ...(currentUser?.pins === 0 ? [{ title: 'My Pins', value: '0', icon: ShieldCheck, color: 'text-red-500' }] : []),
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

      {/* Announcement Popup Modal */}
      <AnimatePresence>
        {showAnnouncement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseAnnouncement}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-[#0B0F1A] border border-gray-800/80 rounded-3xl overflow-hidden max-w-lg w-full shadow-[0_0_50px_rgba(160,32,240,0.35)] relative z-10"
            >
              {/* Header/Close bar */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-800/50">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#A020F0] animate-pulse"></div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Important Announcement</span>
                </div>
                <button
                  onClick={handleCloseAnnouncement}
                  className="text-gray-400 hover:text-white bg-gray-805 hover:bg-gray-800 p-1.5 rounded-xl transition-all border border-gray-700/30"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Announcement Body Content */}
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto hide-scrollbar bg-[#05000a]">
                {announcementImages.length > 0 && (
                  <div className="relative group/carousel">
                    {/* Carousel Scroll Container */}
                    <div
                      id="announcement-carousel"
                      onScroll={handleCarouselScroll}
                      className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-4 w-full rounded-2xl"
                      style={{ scrollSnapType: 'x mandatory' }}
                    >
                      {announcementImages.map((imgUrl, idx) => (
                        <div
                          key={idx}
                          className="snap-center shrink-0 w-full flex items-center justify-center bg-[#05000a] min-h-[200px]"
                        >
                          <img
                            src={getImageUrl(imgUrl)}
                            alt={`Announcement ${idx + 1}`}
                            className="w-full max-h-[50vh] object-contain rounded-2xl border border-gray-800/60 shadow-inner"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://placehold.co/600x400/161B2A/A020F0?text=Announcement+Image';
                            }}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Navigation Arrows */}
                    {announcementImages.length > 1 && (
                      <>
                        <button
                          onClick={() => {
                            const container = document.getElementById('announcement-carousel');
                            if (container) {
                              container.scrollBy({ left: -container.offsetWidth, behavior: 'smooth' });
                            }
                          }}
                          className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/85 text-white p-2 rounded-full border border-gray-800/40 hover:scale-105 transition-all z-10 cursor-pointer"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          onClick={() => {
                            const container = document.getElementById('announcement-carousel');
                            if (container) {
                              container.scrollBy({ left: container.offsetWidth, behavior: 'smooth' });
                            }
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/85 text-white p-2 rounded-full border border-gray-800/40 hover:scale-105 transition-all z-10 cursor-pointer"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </>
                    )}

                    {/* Indicator Dots */}
                    {announcementImages.length > 1 && (
                      <div className="flex justify-center gap-1.5 mt-3">
                        {announcementImages.map((_, idx) => (
                          <div
                            key={idx}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${
                              activeCarouselIndex === idx ? 'bg-[#A020F0] w-4' : 'bg-gray-750'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {announcementContent && (
                  <div className="bg-[#161B2A]/40 border border-gray-800/40 rounded-2xl p-5 text-gray-300 text-sm leading-relaxed whitespace-pre-wrap select-text">
                    {announcementContent}
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="px-6 py-4 border-t border-gray-800/50 flex justify-end bg-[#0B0F1A]">
                <button
                  onClick={handleCloseAnnouncement}
                  className="w-full sm:w-auto bg-gradient-to-r from-[#A020F0] to-[#6A0DAD] hover:from-[#B026FF] text-white px-6 py-2.5 rounded-xl text-sm font-bold tracking-wide uppercase transition-all shadow-[0_0_15px_rgba(160,32,240,0.2)]"
                >
                  Acknowledge & Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </div>
  );
};

export default Dashboard;
