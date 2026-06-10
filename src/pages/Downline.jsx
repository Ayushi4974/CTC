import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, User, Mail, Shield, BarChart3, TrendingUp, 
  ChevronDown, ChevronRight, Award, Activity, Copy, Check, Car, Home, Info, Timer,
  ShieldCheck, Globe, Lock
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchProfile } from '../redux/slices/authSlice';
import api from '../api';

const CircularProgress = ({ progress, label, total }) => {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / total) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="60" height="60" className="transform -rotate-90 drop-shadow-[0_0_10px_rgba(0,198,255,0.4)]">
        <circle cx="30" cy="30" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-800" />
        <circle 
          cx="30" cy="30" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" 
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          className="text-[#00C6FF] transition-all duration-1000 ease-in-out" strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-white">
        <span className="font-bold text-sm leading-none">{label}</span>
      </div>
    </div>
  );
};

const LEVEL_PERCENTAGES = [
  15, 8, 7, 4, 4, 3, 3, 3, 3, 4, 
  5, 7, 8, 8, 12, 15, 8, 7, 4, 4, 
  3, 3, 3, 3, 4, 5, 7, 8, 8, 12
];

const LEVEL_REQUIREMENTS = [
  { staking: 20, directs: 2 }, { staking: 40, directs: 3 }, { staking: 60, directs: 4 }, { staking: 80, directs: 5 }, { staking: 120, directs: 6 },
  { staking: 200, directs: 7 }, { staking: 300, directs: 8 }, { staking: 400, directs: 9 }, { staking: 400, directs: 10 }, { staking: 500, directs: 11 },
  { staking: 600, directs: 12 }, { staking: 700, directs: 13 }, { staking: 900, directs: 14 }, { staking: 900, directs: 15 }, { staking: 1000, directs: 16 },
  { staking: 1100, directs: 17 }, { staking: 1200, directs: 18 }, { staking: 1300, directs: 19 }, { staking: 1400, directs: 20 }, { staking: 1500, directs: 21 },
  { staking: 1600, directs: 22 }, { staking: 1700, directs: 23 }, { staking: 1800, directs: 24 }, { staking: 1900, directs: 25 }, { staking: 2000, directs: 26 },
  { staking: 2200, directs: 27 }, { staking: 2400, directs: 28 }, { staking: 2700, directs: 29 }, { staking: 3000, directs: 30 }, { staking: 3000, directs: 30 }
];

const Downline = () => {
  const dispatch = useDispatch();
  const { user, profile } = useSelector((state) => state.auth);
  const currentUser = profile || user;
  
  const [directTeam, setDirectTeam] = useState([]);
  const [allLevels, setAllLevels] = useState([]);
  const [levelIncomeData, setLevelIncomeData] = useState([]);
  const [copied, setCopied] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [hasActivePackage, setHasActivePackage] = useState(false);

  useEffect(() => {
    dispatch(fetchProfile());
    const fetchData = async () => {
      try {
        const [teamRes, incomeRes, packagesRes] = await Promise.all([
          api.get('/user/team'),
          api.get('/user/level-income'),
          api.get('/package/my-packages')
        ]);
        setDirectTeam(teamRes.data.directTeam || []);
        setAllLevels(teamRes.data.allLevels || []);
        setLevelIncomeData(incomeRes.data || []);

        const activePkg = (packagesRes.data || []).find(pkg => pkg.status === 'active');
        if (activePkg) {
          setHasActivePackage(true);
          const start = new Date(activePkg.startDate || activePkg.createdAt);
          const deadline = new Date(start.getTime() + 10 * 24 * 60 * 60 * 1000);
          const now = new Date();
          const diffMs = deadline.getTime() - now.getTime();
          const diffSec = Math.max(0, Math.floor(diffMs / 1000));
          setTimeLeft(diffSec);
        } else {
          setHasActivePackage(false);
          setTimeLeft(0);
        }
      } catch (err) {
        console.error('Failed to fetch team data', err);
      }
    };
    fetchData();
  }, [dispatch]);

  const profileData = {
    id: currentUser?.userId || 'N/A',
    name: currentUser?.fullName || 'N/A',
    email: currentUser?.email || 'N/A',
    totalNetwork: currentUser?.totalTeam || 0,
    overallBusiness: currentUser?.totalInvestment || 0,
  };

  const activeDirectsCount = directTeam.filter(d => d.isActive && (d.pins === undefined || d.pins > 0)).length;

  const dynamicLevelsData = allLevels.map((lvl) => {
    const reqs = LEVEL_REQUIREMENTS[lvl.level - 1] || { staking: 0, directs: 0 };
    const isUnlocked = (currentUser?.totalInvestment || 0) >= reqs.staking && 
                       activeDirectsCount >= reqs.directs;

    const commEarned = levelIncomeData
      .filter(inc => inc.level === lvl.level)
      .reduce((sum, item) => sum + item.amount, 0);

    const maxReqDirects = reqs.directs || 1;

    return {
      level: lvl.level,
      members: lvl.members.length,
      maxMembers: maxReqDirects, // Scaled dynamically as per level direct referrals requirement
      volume: lvl.members.reduce((acc, curr) => acc + (curr.totalInvestment || 0), 0),
      commPercent: LEVEL_PERCENTAGES[lvl.level - 1] || 0,
      commEarned: parseFloat(commEarned.toFixed(3)), 
      performance: Math.min((lvl.members.length / maxReqDirects) * 100, 100),
      isActive: isUnlocked,
      reqDirects: reqs.directs,
      reqVol: reqs.staking,
      partners: lvl.members.map(member => ({
        name: member.fullName,
        id: member.userId,
        vol: member.totalInvestment || 0,
        pins: member.pins ?? 1 // If undefined (older users), default to 1 (normal)
      }))
    };
  });

  const totalMembers = dynamicLevelsData.reduce((acc, curr) => acc + curr.members, 0);
  const totalBusiness = dynamicLevelsData.reduce((acc, curr) => acc + curr.volume, 0);
  const totalCommission = dynamicLevelsData.reduce((acc, curr) => acc + curr.commEarned, 0);
  const activeLevelsCount = dynamicLevelsData.filter(l => l.isActive).length;

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null) return null;
        return prev > 0 ? prev - 1 : 0;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(profileData.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleRow = (level) => {
    setExpandedRow(expandedRow === level ? null : level);
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 pt-4 px-4 sm:px-6 lg:px-8">
      
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-extrabold text-white mb-2"
          >
            Referral Network
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-gray-400"
          >
            Manage and track your referral network growth. View all levels of your downline team.
          </motion.p>
        </div>

        {/* Fastrack Growth Timer */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl p-3 flex items-center gap-4 shadow-[0_0_20px_rgba(249,115,22,0.15)]"
        >
          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center border border-orange-500/50 relative">
            <Timer className="text-orange-400 animate-pulse" size={18} />
          </div>
          <div>
            <p className="text-[10px] text-orange-400 font-bold uppercase tracking-widest mb-0.5">Fastrack Bonus</p>
            {currentUser?.fastrackQualified ? (
              <p className="text-sm font-bold text-green-400 tracking-wide flex items-center gap-1">
                <ShieldCheck size={14} className="text-green-400" /> Active
              </p>
            ) : timeLeft === null ? (
              <p className="text-sm font-bold text-gray-400 tracking-wide">Loading...</p>
            ) : !hasActivePackage ? (
              <p className="text-sm font-bold text-gray-500 tracking-wide">No Active Package</p>
            ) : timeLeft > 0 ? (
              <p className="text-sm font-bold text-white tabular-nums tracking-wide">{formatTime(timeLeft)}</p>
            ) : (
              <p className="text-sm font-bold text-red-500 tracking-wide">Expired</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Profile Information Split */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10">
        {/* Left Stats Grid */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3 bg-[#0B0F1A]/60 backdrop-blur-[16px] rounded-3xl p-8 lg:p-10 relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(160,32,240,0.15)]"
        >
          {/* Gradient Border & Inner Bevel Shadow */}
          <div className="absolute inset-0 rounded-3xl border border-transparent bg-gradient-to-br from-[#A020F0]/50 via-transparent to-transparent pointer-events-none" style={{ WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude', padding: '1px' }}></div>
          <div className="absolute inset-0 rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] pointer-events-none"></div>

          {/* Background Watermark (Global Network) */}
          <div className="absolute -right-10 -bottom-10 opacity-[0.03] pointer-events-none group-hover:opacity-[0.05] transition-opacity duration-700">
            <Globe size={300} className="text-[#A020F0] stroke-[0.5]" />
          </div>

          <h2 className="text-sm font-bold text-white mb-8 tracking-wide relative z-10">YOUR PROFILE INFORMATION</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
            
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Shield size={14} className="text-[#00C6FF] drop-shadow-[0_0_8px_rgba(0,198,255,0.6)]" /> User ID
              </span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white tracking-tight">{profileData.id}</span>
                <button 
                  onClick={handleCopy}
                  className="w-7 h-7 rounded-lg bg-[#161B2A] hover:bg-[#A020F0]/20 flex items-center justify-center border border-gray-700 hover:border-[#A020F0] hover:text-[#A020F0] hover:shadow-[0_0_10px_rgba(160,32,240,0.4)] transition-all"
                >
                  {copied ? <Check size={14} className="text-[#00FF99]" /> : <Copy size={14} className="text-gray-400 hover:text-inherit" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <User size={14} className="text-[#00FF99] drop-shadow-[0_0_8px_rgba(0,255,153,0.6)]" /> Full Name
              </span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white tracking-tight">{profileData.name}</span>
                <div className="bg-[#00FF99]/20 border border-[#00FF99]/40 rounded-full p-0.5" title="Verified KYC">
                  <ShieldCheck size={12} className="text-[#00FF99] drop-shadow-[0_0_5px_rgba(0,255,153,0.5)]" />
                </div>
              </div>
            </div>

            <div className="flex flex-col col-span-1 sm:col-span-2 md:col-span-1">
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

        {/* High-Impact Overall Business Card */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1 bg-gradient-to-br from-[#161B2A] to-[#050505] backdrop-blur-xl border border-[#A020F0]/50 rounded-3xl p-6 shadow-[0_0_40px_rgba(160,32,240,0.15)] relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-[#A020F0]/10 blur-2xl group-hover:bg-[#A020F0]/20 transition-colors"></div>
          <div className="relative z-10 h-full flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded bg-[#A020F0]/20 flex items-center justify-center border border-[#A020F0]/40">
                <BarChart3 size={14} className="text-[#FF00FF]" />
              </div>
              <span className="text-xs font-bold text-[#A020F0] uppercase tracking-widest">Overall Business</span>
            </div>
            <span className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 tracking-tight">
              $ {profileData.overallBusiness}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Network Performance Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-6 px-2">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Your Network Performance</h2>
          <p className="text-sm text-gray-400">Detailed breakdown of your network by levels</p>
        </div>
        
        <div className="flex items-center gap-8">
          {/* Eligibility Tracker */}
          <div className="flex items-center gap-3 bg-[#161B2A]/80 border border-gray-800 rounded-xl py-2 px-4 shadow-[inset_0_0_15px_rgba(0,0,0,0.5)]">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Salary Eligibility</p>
              <p className="text-xs font-bold text-white">0% / 10% Vol. Reached</p>
            </div>
          </div>

          {/* Active Levels Ring */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-bold text-white">Active Levels</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Out of 30</p>
            </div>
            <CircularProgress progress={activeLevelsCount} label={activeLevelsCount} total={30} />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[#0B0F1A]/80 backdrop-blur-xl border border-gray-800/60 rounded-3xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)] mb-10"
      >
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-6 gap-4 px-6 py-4 border-b border-gray-800/60 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-[#161B2A]/40">
          <div className="col-span-2">Level Details</div>
          <div className="col-span-1 text-center">Members</div>
          <div className="col-span-1">Business Vol.</div>
          <div className="col-span-1 text-center flex items-center justify-center gap-1 group relative cursor-help">
            Comm. %
            <Info size={12} className="text-gray-500 hover:text-white" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 border border-gray-700 text-[10px] text-gray-300 rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 normal-case tracking-normal text-left">
              Level bonus is distributed based on your specific package's profit percentage.
            </div>
          </div>
          <div className="col-span-1">Your Commission</div>
        </div>

        {/* Table Rows */}
        <div className="flex flex-col">
          {dynamicLevelsData.map((row) => (
            <React.Fragment key={row.level}>
              <div 
                onClick={() => row.members > 0 && toggleRow(row.level)}
                className={`grid grid-cols-1 md:grid-cols-6 gap-4 px-6 py-5 border-b border-gray-800/30 items-center transition-colors ${
                  row.members > 0 ? 'hover:bg-[#161B2A]/60 bg-[#161B2A]/20 cursor-pointer' : 'hover:bg-[#161B2A]/40'
                }`}
              >
                {/* Level & Badge */}
                <div className="col-span-2 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shadow-lg relative ${
                    row.isActive 
                      ? 'bg-gradient-to-br from-[#00C6FF] to-[#A020F0] text-white shadow-[0_0_15px_rgba(0,198,255,0.3)]' 
                      : row.reward ? 'bg-gradient-to-br from-[#FF00FF]/20 to-[#A020F0]/20 border border-[#FF00FF]/30 text-[#FF00FF]'
                      : 'bg-[#161B2A] border border-gray-700 text-gray-500'
                  }`}>
                    {row.reward ? <row.icon size={20} className={row.isActive ? "text-white" : "text-[#FF00FF] drop-shadow-[0_0_10px_rgba(255,0,255,0.5)]"} /> : `L${row.level}`}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`font-bold text-sm ${row.reward && !row.isActive ? 'text-[#FF00FF]' : 'text-white'}`}>
                        {row.reward ? `${row.reward} ` : `Level ${row.level}`}
                      </p>
                      {row.members > 0 && <ChevronRight size={14} className={`text-gray-500 transition-transform ${expandedRow === row.level ? 'rotate-90' : ''}`} />}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${row.isActive ? 'bg-[#00C6FF]' : 'bg-gray-600'}`} 
                          style={{ width: `${(row.members / row.maxMembers) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] text-gray-500">{row.members}/{row.maxMembers}</span>
                    </div>
                  </div>
                </div>

                {/* Members */}
                <div className="col-span-1 flex justify-start md:justify-center items-center gap-1">
                  <span className="text-lg font-bold text-white">{row.members}</span>
                  <span className="text-[10px] text-gray-500 mt-1 md:hidden">members</span>
                </div>

                {/* Business Volume */}
                <div className="col-span-1">
                  <p className="text-sm font-bold text-white mb-0.5">$ {row.volume}</p>
                  {row.isActive ? (
                    <p className="text-[10px] text-[#00FF99] flex items-center gap-1 drop-shadow-[0_0_5px_rgba(0,255,153,0.5)]"><TrendingUp size={10} /> Active level</p>
                  ) : (
                    <p className="text-[10px] text-red-500/80 flex items-center gap-1" title={`Requires $${row.reqVol} Personal Staking & ${row.reqDirects} Direct Referrals`}>
                      <Lock size={10} /> Locked (Need {row.reqDirects} Dir & ${row.reqVol})
                    </p>
                  )}
                </div>

                {/* Comm % */}
                <div className="col-span-1 md:text-center">
                  <span className="text-sm font-bold text-white">{row.commPercent}%</span>
                </div>

                {/* Your Commission */}
                <div className="col-span-1">
                  <p className={`text-sm font-bold mb-0.5 ${row.commEarned > 0 ? 'text-[#00FF99] drop-shadow-[0_0_5px_rgba(0,255,153,0.5)]' : 'text-gray-400'}`}>
                    $ {row.commEarned}
                  </p>
                  <p className="text-[10px] text-gray-500 hidden md:block">Level {row.level} earnings</p>
                </div>
              </div>

              {/* Expandable Content for Direct Partners */}
              <AnimatePresence>
                {expandedRow === row.level && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-[#050505]/50 border-b border-gray-800/30"
                  >
                    <div className="p-4 md:px-20">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Direct Partners in Level {row.level}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {row.partners.map((partner, i) => (
                          <div key={i} className="bg-[#161B2A] border border-gray-800 rounded-xl p-3 flex justify-between items-center hover:border-[#A020F0]/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                                <User size={14} className="text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white leading-tight">{partner.name}</p>
                                <p className="text-[10px] text-gray-500">{partner.id}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Volume</p>
                              <p className="text-xs font-bold text-[#00C6FF]">$ {partner.vol}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </React.Fragment>
          ))}
        </div>
      </motion.div>

      {/* Floating Bottom Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#0B0F1A]/80 backdrop-blur-xl border border-gray-800/60 rounded-3xl p-6 shadow-lg flex flex-col items-start justify-center"
        >
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Members</span>
          <span className="text-3xl font-extrabold text-white">{totalMembers}</span>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-[#0B0F1A]/80 backdrop-blur-xl border border-[#A020F0]/30 rounded-3xl p-6 shadow-[0_0_20px_rgba(160,32,240,0.1)] flex flex-col items-start justify-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#A020F0]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <span className="text-[10px] font-bold text-[#A020F0] uppercase tracking-widest mb-1 relative z-10 flex items-center gap-1.5"><TrendingUp size={12}/> Total Business Volume</span>
          <span className="text-3xl font-extrabold text-white relative z-10">$ {totalBusiness}</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-[#0B0F1A]/80 backdrop-blur-xl border border-[#00FF99]/30 rounded-3xl p-6 shadow-[0_0_30px_rgba(0,255,153,0.15)] flex flex-col items-start justify-center relative overflow-hidden"
        >
          <div className="absolute right-0 top-0 w-48 h-48 bg-[#00C6FF]/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
          <span className="text-[10px] font-bold text-[#00C6FF] uppercase tracking-widest mb-1 relative z-10">Total Commission Earned</span>
          <span className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-[#00FF99] to-[#00C6FF] drop-shadow-[0_0_10px_rgba(0,255,153,0.4)] relative z-10 tracking-tight">
            $ {totalCommission}
          </span>
        </motion.div>
      </div>

    </div>
  );
};

export default Downline;
