import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart2, Users, Layers, ChevronDown, ChevronRight, User, TrendingUp,
  Lock, Info, AlertTriangle, ShieldCheck
} from 'lucide-react';
import api from '../api';

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

const stats = [
  { title: 'Total Level Income', value: 1630.714, prefix: '$ ', suffix: '', icon: TrendingUp, color: 'text-[#00FF99]', aura: 'bg-[#00FF99]/30' },
  { title: 'Total Network Members', value: 7, prefix: '', suffix: '', icon: Users, color: 'text-[#00C6FF]', aura: 'bg-[#00C6FF]/20' },
  { title: 'Active Levels', value: 2, prefix: '', suffix: '', icon: Layers, color: 'text-[#A020F0]', aura: 'bg-[#A020F0]/20', isProgress: true },
];



const Counter = ({ value, prefix, suffix }) => {
  const [count, setCount] = useState(0);
  const isFloat = value % 1 !== 0;

  useEffect(() => {
    let start = 0;
    const end = parseFloat(value);
    if (start === end) return;

    let totalMilSecDur = 1500;
    let incrementTime = (totalMilSecDur / end) * 5;
    if (incrementTime < 10) incrementTime = 10;
    
    // Smooth out large float increments
    const step = end / 60; 

    let timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 25);
    return () => clearInterval(timer);
  }, [value]);

  return <span>{prefix}{isFloat ? count.toFixed(3) : Math.floor(count).toLocaleString()}{suffix}</span>;
};

const CircularProgress = ({ progress, label, total }) => {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / total) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="60" height="60" className="transform -rotate-90 drop-shadow-[0_0_10px_rgba(160,32,240,0.4)]">
        <circle cx="30" cy="30" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-800" />
        <circle 
          cx="30" cy="30" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" 
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          className="text-[#A020F0] transition-all duration-1000 ease-in-out" strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-white">
        <span className="font-bold text-sm leading-none">{label}</span>
      </div>
    </div>
  );
};

const getLevelBadgeClass = (level) => {
  if (level >= 6) return 'bg-[#A020F0]/10 border-[#A020F0]/40 text-[#FF00FF] shadow-[0_0_10px_rgba(160,32,240,0.3)]';
  if (level >= 1) return 'bg-[#00C6FF]/10 border-[#00C6FF]/40 text-[#00C6FF] shadow-[0_0_10px_rgba(0,198,255,0.3)]';
  return 'bg-gray-800 border-gray-700 text-gray-400';
};

const LevelIncome = () => {
  const [expandedLevel, setExpandedLevel] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [directTeam, setDirectTeam] = useState([]);
  const [allLevels, setAllLevels] = useState([]);
  const [levelIncomeData, setLevelIncomeData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, teamRes, incomeRes] = await Promise.all([
          api.get('/user/profile'),
          api.get('/user/team'),
          api.get('/user/level-income')
        ]);
        setCurrentUser(profileRes.data);
        setDirectTeam(teamRes.data.directTeam || []);
        setAllLevels(teamRes.data.allLevels || []);
        setLevelIncomeData(incomeRes.data || []);
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    fetchData();
  }, []);

  const toggleLevel = (level) => {
    setExpandedLevel(expandedLevel === level ? null : level);
  };

  const currentLevelIncome = currentUser?.levelIncome || 0;
  const activeDirectsCount = directTeam.filter(d => d.isActive).length;
  const currentNetworkMembers = currentUser?.directTeam || 0;

  // Global level income qualification requires personal staking of $1500+ and 5+ active directs
  const hasGlobalEligibility = (currentUser?.totalInvestment || 0) >= 1500 && activeDirectsCount >= 5;

  const dynamicStats = [
    { title: 'Total Level Income', value: currentLevelIncome, prefix: '$', suffix: '', icon: TrendingUp, color: 'text-[#00FF99]', aura: 'bg-[#00FF99]/30' },
    { title: 'Total Network Members', value: currentNetworkMembers, prefix: '', suffix: '', icon: Users, color: 'text-[#00C6FF]', aura: 'bg-[#00C6FF]/20' },
    { title: 'Active Levels', value: allLevels.filter(lvl => {
        const reqs = LEVEL_REQUIREMENTS[lvl.level - 1] || { staking: 0, directs: 0 };
        return (currentUser?.totalInvestment || 0) >= reqs.staking && activeDirectsCount >= reqs.directs && hasGlobalEligibility;
      }).length, prefix: '', suffix: '', icon: Layers, color: 'text-[#A020F0]', aura: 'bg-[#A020F0]/20', isProgress: true },
  ];

  const dynamicLevelData = allLevels.map((lvl) => {
    const reqs = LEVEL_REQUIREMENTS[lvl.level - 1] || { staking: 0, directs: 0 };
    const isUnlocked = (currentUser?.totalInvestment || 0) >= reqs.staking && 
                       activeDirectsCount >= reqs.directs && 
                       hasGlobalEligibility;

    const commEarned = levelIncomeData
      .filter(inc => inc.level === lvl.level)
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      level: lvl.level,
      members: lvl.members.length,
      income: parseFloat(commEarned.toFixed(3)),
      bonusPercent: LEVEL_PERCENTAGES[lvl.level - 1] || 0,
      isLocked: !isUnlocked,
      reqDirects: reqs.directs,
      reqVol: reqs.staking,
      users: lvl.members.map(member => {
        const earnedFromMember = levelIncomeData
          .filter(income => income.fromUser && income.fromUser._id === member._id)
          .reduce((sum, item) => sum + item.amount, 0);

        return {
          name: member.fullName,
          id: member.userId,
          vol: member.totalInvestment || 0,
          earned: earnedFromMember > 0 ? earnedFromMember.toFixed(3) : '0.000'
        };
      })
    };
  });

  return (
    <div className="max-w-7xl mx-auto pb-12 pt-4 px-4 sm:px-6 lg:px-8 min-h-screen">
      
      {/* Header */}
      <div className="mb-8">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-extrabold text-white mb-2 tracking-tight"
        >
          Level Income
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-gray-400"
        >
          View your income generated from your network levels.
        </motion.p>
      </div>

      {/* Mandatory Volume Warning */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-6 bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between shadow-[0_0_20px_rgba(239,68,68,0.1)]"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.5)]">
            <AlertTriangle size={18} className="text-red-500 animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">Attention Required</p>
            <p className="text-sm font-medium text-white">
              You have not met the <span className="font-bold text-orange-400">10% monthly business volume</span> required for salary and bonus eligibility.
              <a href="#" className="ml-2 text-[11px] text-[#00C6FF] hover:text-white underline underline-offset-2 transition-colors">View Terms</a>
            </p>
          </div>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Current Status</p>
          <div className="flex items-center gap-2">
            <div className="w-32 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 w-[0%]"></div>
            </div>
            <span className="text-xs font-bold text-red-500">0%</span>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {dynamicStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + (idx * 0.1) }}
              className={`bg-[#0B0F1A]/60 backdrop-blur-[16px] border border-white/[0.15] rounded-3xl p-6 relative overflow-hidden group transition-all duration-500 hover:-translate-y-1 shadow-[0_10px_30px_rgba(0,0,0,0.5)]`}
            >
              <div className={`absolute -inset-10 ${stat.aura} blur-3xl rounded-full opacity-0 group-hover:opacity-60 transition-opacity duration-700`}></div>
              
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-[#161B2A] flex items-center justify-center ${stat.color} shadow-[inset_0_0_15px_rgba(255,255,255,0.05)] border border-gray-800/50`}>
                      <Icon size={20} className="drop-shadow-[0_0_8px_currentColor]" />
                    </div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{stat.title}</p>
                  </div>
                  <p className={`text-3xl font-black ${stat.color} drop-shadow-[0_0_10px_currentColor] tracking-tight`}>
                    {stat.isProgress ? (
                      stat.value
                    ) : (
                      <Counter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                    )}
                  </p>
                </div>

                {stat.isProgress && (
                  <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-gray-800/50">
                    <div className="text-right">
                      <p className="text-xs font-bold text-white uppercase tracking-wider">Unlocked</p>
                      <p className="text-[9px] text-gray-500 uppercase tracking-widest">Out of 30</p>
                    </div>
                    <CircularProgress progress={stat.value} label={stat.value} total={30} />
                  </div>
                )}

              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Level Income Breakdown */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h3 className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-[#A020F0] to-[#00C6FF] mb-6 drop-shadow-[0_0_5px_rgba(160,32,240,0.5)]">
          Level Income Breakdown
        </h3>

        <div className="flex flex-col gap-4">
          {dynamicLevelData.map((data) => (
            <div 
              key={data.level}
              className={`backdrop-blur-[12px] border rounded-2xl overflow-hidden transition-all duration-300 ${
                data.isLocked 
                  ? 'bg-[#0B0F1A]/40 border-gray-800/30 opacity-70 cursor-not-allowed' 
                  : 'bg-[#161B2A]/40 border-gray-700/50 shadow-lg hover:border-[#A020F0]/50'
              }`}
            >
              {/* Accordion Header */}
              <button 
                onClick={() => !data.isLocked && toggleLevel(data.level)}
                disabled={data.isLocked}
                className={`w-full flex flex-col md:flex-row items-start md:items-center justify-between p-5 transition-colors group ${!data.isLocked ? 'hover:bg-[#A020F0]/10' : ''}`}
              >
                <div className="flex items-center gap-6 mb-4 md:mb-0">
                  <div className={`px-4 py-1.5 rounded-full text-xs font-black border flex items-center gap-2 ${
                    data.isLocked ? 'bg-gray-800 border-gray-700 text-gray-500' : getLevelBadgeClass(data.level)
                  }`}>
                    Level {data.level}
                    {data.isLocked && <Lock size={12} className="text-gray-500" />}
                  </div>
                  
                  <span className={`text-sm font-medium ${data.isLocked ? 'text-gray-500' : 'text-gray-300'}`}>
                    {data.members} Members
                  </span>
                </div>
                
                <div className="flex items-center justify-between w-full md:w-auto gap-6">
                  {data.isLocked ? (
                    <div className="relative group/tooltip flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest font-bold cursor-help">
                      <Lock size={12} className="text-gray-500" />
                      <span>Unlock Requires {data.reqDirects} Directs & $ {data.reqVol} Vol.</span>
                      <div className="absolute bottom-full right-0 mb-2 w-56 p-3 bg-gray-900 border border-gray-700 text-[10px] text-gray-300 rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-20 text-left normal-case tracking-normal font-medium leading-relaxed">
                        To unlock Level {data.level} bonuses, you must complete {data.reqDirects} active direct referrals and maintain a self-staking/team volume of {data.reqVol} USDT.
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-6">
                      <div className="hidden md:flex flex-col items-end">
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Bonus Target</span>
                        <span className="text-sm font-black text-[#00C6FF]">{data.bonusPercent}%</span>
                      </div>
                      <span className="text-lg font-black text-[#00FF99] drop-shadow-[0_0_8px_rgba(0,255,153,0.4)]">
                        ${data.income}
                      </span>
                    </div>
                  )}
                  
                  {!data.isLocked && (
                    <div className={`text-[#A020F0] transition-transform duration-300 ${expandedLevel === data.level ? 'rotate-180' : ''}`}>
                      <ChevronDown size={20} />
                    </div>
                  )}
                </div>
              </button>

              {/* Accordion Content */}
              <AnimatePresence>
                {expandedLevel === data.level && !data.isLocked && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-[#050505]/60 border-t border-gray-800/60"
                  >
                    <div className="p-6">
                      
                      {/* Expanded Level Meta Header is now outside, we can just show members directly */}
                      {/* Sub-table Header */}
                      <div className="grid grid-cols-4 gap-4 pb-3 border-b border-gray-800/40 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-2">
                        <div className="col-span-2">Contributing Member</div>
                        <div className="col-span-1 text-right">Business Vol.</div>
                        <div className="col-span-1 text-right">Income Earned</div>
                      </div>
                      
                      {/* Sub-table Rows */}
                      <div className="flex flex-col gap-2">
                        {data.users.map((user, i) => (
                          <div key={i} className="grid grid-cols-4 gap-4 items-center p-3 rounded-xl bg-[#161B2A]/40 border border-transparent hover:border-[#00C6FF]/30 hover:bg-[#161B2A]/80 transition-colors group">
                            <div className="col-span-2 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00C6FF]/20 to-[#A020F0]/20 flex items-center justify-center border border-[#00C6FF]/40 group-hover:border-[#00C6FF] transition-colors">
                                <User size={14} className="text-[#00C6FF]" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white leading-tight group-hover:text-[#00C6FF] transition-colors">{user.name}</p>
                                <p className="text-[10px] text-gray-500 font-mono">{user.id}</p>
                              </div>
                            </div>
                            <div className="col-span-1 text-right text-xs font-bold text-gray-400 group-hover:text-white transition-colors">
                              ${user.vol}
                            </div>
                            <div className="col-span-1 text-right text-sm font-bold text-[#00FF99]">
                              +${user.earned}
                            </div>
                          </div>
                        ))}
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Footer Notes */}
      <div className="mt-12 text-center border-t border-gray-800/50 pt-8">
        <p className="text-xs text-gray-500 font-medium flex items-center justify-center gap-2">
          <ShieldCheck size={14} className="text-[#00FF99]" />
          Level bonuses are distributed as per the package profit percentage structure.
        </p>
      </div>

    </div>
  );
};

export default LevelIncome;
