import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Calendar, DollarSign, ShieldCheck, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';

const PackageHistory = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriods, setSelectedPeriods] = useState({});
  const [stakingLoading, setStakingLoading] = useState({});

  const handleSelectPeriod = (pkgId, period) => {
    setSelectedPeriods(prev => ({ ...prev, [pkgId]: period }));
  };

  const handleStartStaking = async (pkgId) => {
    const period = selectedPeriods[pkgId];
    if (!period) {
      toast.error('Please select a staking duration first.');
      return;
    }
    try {
      setStakingLoading(prev => ({ ...prev, [pkgId]: true }));
      const res = await api.post('/package/start-staking', { userPackageId: pkgId, period });
      toast.success(res.data.message || 'Staking activated successfully!');
      // Refetch packages
      const refreshed = await api.get('/package/my-packages');
      setPackages(refreshed.data);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to activate staking.');
    } finally {
      setStakingLoading(prev => ({ ...prev, [pkgId]: false }));
    }
  };

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const res = await api.get('/package/my-packages');
        setPackages(res.data);
      } catch (err) {
        console.error('Error fetching package history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPackages();
  }, []);

  return (
    <div className="max-w-7xl mx-auto pb-12 pt-4 px-4 sm:px-6 lg:px-8 min-h-screen">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-14 h-14 rounded-2xl bg-[#00C6FF]/10 border border-[#00C6FF]/30 flex items-center justify-center shadow-[inset_0_0_15px_rgba(0,198,255,0.2)]"
        >
          <Package size={28} className="text-[#00C6FF] drop-shadow-[0_0_8px_rgba(0,198,255,0.8)]" />
        </motion.div>
        <div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-extrabold text-white tracking-tight"
          >
            Package History
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-gray-400"
          >
            Manage and track all your active and past investment packages
          </motion.p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00C6FF]"></div>
        </div>
      ) : packages.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#0B0F1A]/60 backdrop-blur-xl border border-gray-800/60 rounded-3xl p-16 flex flex-col items-center justify-center text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
        >
          <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-4">
            <Package size={32} className="text-gray-600" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No packages found.</h3>
          <p className="text-gray-500 max-w-sm mb-6">You haven't purchased any investment packages yet. Start your journey by choosing a plan.</p>
          <a href="/products" className="bg-gradient-to-r from-[#00C6FF] to-[#A020F0] text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-cyan-500/20">
            View All Packages
          </a>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-[#0B0F1A]/60 backdrop-blur-xl border border-gray-800/60 rounded-3xl p-6 shadow-xl relative overflow-hidden group hover:border-[#00C6FF]/40 transition-all duration-500"
            >
              <div className="absolute top-0 right-0 p-4">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  pkg.status === 'active' 
                    ? 'bg-[#00FF99]/10 text-[#00FF99] border border-[#00FF99]/20' 
                    : pkg.status === 'upgraded'
                    ? 'bg-[#A020F0]/10 text-[#A020F0] border border-[#A020F0]/20'
                    : pkg.status === 'completed'
                    ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                    : pkg.status === 'pending'
                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    : 'bg-red-500/10 text-red-500 border border-red-500/20'
                }`}>
                  {pkg.status}
                </span>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#161B2A] flex items-center justify-center border border-gray-800 group-hover:border-[#00C6FF]/30 transition-colors">
                    <DollarSign size={24} className="text-[#00C6FF]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">{pkg.packageId?.name || 'Standard Package'}</h3>
                    <p className="text-sm font-bold text-[#00FF99]">${pkg.amount}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="bg-[#161B2A]/50 p-3 rounded-2xl border border-gray-800/50">
                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Daily ROI</p>
                    <p className="text-sm font-bold text-white">{pkg.dailyProfitPercent}%</p>
                  </div>
                  <div className="bg-[#161B2A]/50 p-3 rounded-2xl border border-gray-800/50">
                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Total Earned</p>
                    <p className="text-sm font-bold text-[#00FF99]">${pkg.totalEarned.toFixed(2)}</p>
                  </div>
                </div>

                {!pkg.isManual ? (
                  (pkg.stakingEnabled || pkg.isStaked) ? (
                    <div className="bg-[#161B2A]/50 p-4 rounded-2xl border border-cyan-500/20 shadow-[0_0_15px_rgba(0,198,255,0.05)] mt-2">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] text-[#00C6FF] uppercase font-bold tracking-wider">Auto-Compounding Staking</p>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold uppercase">Active</span>
                      </div>
                      <div className="flex justify-between items-center mb-1.5 text-xs">
                        <span className="text-gray-400">Duration:</span>
                        <span className="font-bold text-white">{pkg.stakingPeriod || pkg.stakingDuration} Days (Locked)</span>
                      </div>
                      <div className="flex justify-between items-center mb-1.5 text-xs">
                        <span className="text-gray-400">Compound Bal:</span>
                        <span className="font-extrabold text-[#00C6FF]">${Number(pkg.compoundingBalance || pkg.amount).toFixed(2)}</span>
                      </div>
                      {pkg.stakingStartDate && (
                        <div className="flex justify-between items-center mb-1.5 text-xs">
                          <span className="text-gray-400">Start Date:</span>
                          <span className="font-medium text-gray-300">{new Date(pkg.stakingStartDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {pkg.stakingEndDate && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400">End Date:</span>
                          <span className="font-medium text-gray-300">{new Date(pkg.stakingEndDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  ) : pkg.status === 'active' ? (
                    <div className="bg-[#161B2A]/30 p-4 rounded-2xl border border-gray-800 mt-2 flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Auto-Compounding Staking</p>
                        <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-400 text-[9px] font-bold uppercase">Disabled</span>
                      </div>
                      
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-gray-500 font-bold uppercase">Select Staking Duration</label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[30, 90, 180, 360].map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => handleSelectPeriod(pkg._id, d)}
                              className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                                selectedPeriods[pkg._id] === d
                                  ? 'bg-gradient-to-r from-[#00C6FF] to-[#A020F0] text-white shadow-md'
                                  : 'bg-[#161B2A] text-gray-400 hover:text-white border border-gray-800/80 hover:border-gray-700'
                              }`}
                            >
                              {d}d
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStartStaking(pkg._id)}
                        disabled={!selectedPeriods[pkg._id] || stakingLoading[pkg._id]}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                          !selectedPeriods[pkg._id] || stakingLoading[pkg._id]
                            ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-800'
                            : 'bg-gradient-to-r from-[#00C6FF] to-[#A020F0] text-white shadow-lg hover:shadow-cyan-500/20 hover:-translate-y-0.5'
                        }`}
                      >
                        {stakingLoading[pkg._id] ? 'Activating...' : 'Enable Staking'}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-[#161B2A]/30 p-4 rounded-2xl border border-gray-800 mt-2 flex justify-between items-center text-xs">
                      <span className="text-gray-400 uppercase text-[9px] font-bold tracking-wider">Auto-Compounding Staking</span>
                      <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-400 text-[9px] font-bold uppercase">Not Activated</span>
                    </div>
                  )
                ) : (
                  <div className="bg-[#161B2A]/30 p-4 rounded-2xl border border-gray-800 mt-2 flex flex-col gap-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-450 font-bold uppercase text-[9px] tracking-wider">Manual Payment Info</span>
                      <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-400 text-[9px] font-bold uppercase">{pkg.networkType}</span>
                    </div>
                    <div className="flex flex-col gap-1 mt-1">
                      <span className="text-[10px] text-gray-500 uppercase font-bold">Transaction Hash</span>
                      <span className="font-mono text-gray-300 select-all break-all bg-[#0B0F1A] border border-gray-800 p-1.5 rounded-lg leading-relaxed text-[11px]">
                        {pkg.txHash}
                      </span>
                    </div>
                    {pkg.status === 'rejected' && (
                      <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-2.5 mt-2 space-y-1">
                        <span className="text-red-400 font-semibold text-[10px] block">REJECTION REASON:</span>
                        <p className="text-gray-400 italic text-[11px]">"{pkg.rejectionReason || 'Details incorrect or not matching deposit wallet.'}"</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 flex items-center gap-1"><Calendar size={12}/> Start Date</span>
                    <span className="text-gray-300">{new Date(pkg.startDate).toLocaleDateString()}</span>
                  </div>

                </div>

                {!pkg.isManual && (() => {
                  const isZeroPin = pkg.isZeroPin || pkg.packageId?.isZeroPin;
                  const multiplier = isZeroPin ? 1 : 4;
                  return (
                    <>
                      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mt-2">
                        <div 
                          className="h-full bg-gradient-to-r from-[#00C6FF] to-[#A020F0]" 
                          style={{ width: `${Math.min((pkg.totalEarned / (pkg.amount * multiplier)) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-[10px] text-gray-500 text-center font-medium">Earnings Cap: {multiplier}x (${pkg.amount * multiplier} Max)</p>
                    </>
                  );
                })()}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Footer Notes */}
      <div className="mt-12 text-center border-t border-gray-800/50 pt-8">
        <p className="text-xs text-gray-500 font-medium flex items-center justify-center gap-2">
          <ShieldCheck size={14} className="text-[#00FF99]" />
          All investments are secured and tracked on the BEP-20 blockchain network.
        </p>
      </div>
    </div>
  );
};

export default PackageHistory;
