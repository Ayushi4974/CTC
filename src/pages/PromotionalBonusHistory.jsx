import React, { useEffect, useState } from 'react';
import api from '../api';
import { motion } from 'framer-motion';
import { Award, DollarSign, Calendar, Clock, Trophy, Users, ShieldAlert } from 'lucide-react';

const PromotionalBonusHistory = () => {
  const [bonuses, setBonuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(bonuses.length / itemsPerPage);
  const paginatedBonuses = bonuses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [bonuses.length]);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      
      if (currentPage <= 2) {
        end = 4;
      } else if (currentPage >= totalPages - 1) {
        start = totalPages - 3;
      }
      
      if (start > 2) {
        pages.push('...');
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (end < totalPages - 1) {
        pages.push('...');
      }
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  const promoRules = [
    { level: 'L1', team: '5 DIRECT', salary: '$30', margin: '0.50%', bonus: '$100' },
    { level: 'L2', team: '2 DIRECT L1 / 25 TEAM', salary: '$150', margin: '1.00%', bonus: '$300' },
    { level: 'L3', team: '3 DIRECT L1 / 125 TEAM', salary: '$500', margin: '2.00%', bonus: '$800' },
    { level: 'L4', team: '4 DIRECT L1 / 500 TEAM', salary: '$1200', margin: '2.50%', bonus: '$2000' },
    { level: 'L5', team: '5 DIRECT L1 / 1000 TEAM', salary: '$2400', margin: '3.00%', bonus: '$5000' },
    { level: 'L6', team: '6 DIRECT L1 / 2000 TEAM', salary: '$5000', margin: '3.50%', bonus: '$12000' },
    { level: 'L7', team: '7 DIRECT L1 / 5000 TEAM', salary: '$10000', margin: '4.00%', bonus: '$25000' },
    { level: 'L8', team: '3 DIRECT L7 / 20,000 TEAM', salary: '$60000', margin: '4.50%', bonus: '$100000' },
    { level: 'L9', team: '4 DIRECT L7 / 50,000 TEAM', salary: '$100000', margin: '5.00%', bonus: '$200000' },
    { level: 'L10', team: '3 DIRECT L8 / 1,000,000 TEAM', salary: '$300000', margin: '5.50%', bonus: '$500000' },
    { level: 'L11', team: '4 DIRECT L8 / 2,000,000 TEAM', salary: '$600000', margin: '6.00%', bonus: '$1000000' },
    { level: 'L12', team: '5 DIRECT L9 / 3,000,000 TEAM', salary: '$1000000', margin: '6.50%', bonus: '$2000000' },
  ];

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const [profileRes, txRes] = await Promise.all([
          api.get('/user/profile'),
          api.get('/transaction/history')
        ]);
        
        const user = profileRes.data;
        const userRank = user.rank || 'None';

        // Filter only promotional bonuses (rank bonuses and salary)
        const promoData = txRes.data.filter(tx => tx.type === 'bonus' || tx.type === 'salary');
        
        // Generate list of all achieved rank bonuses
        const ranks = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11', 'L12'];
        const rankBonusMap = {
          'L1': 100, 'L2': 300, 'L3': 800, 'L4': 2000, 'L5': 5000, 'L6': 12000,
          'L7': 25000, 'L8': 100000, 'L9': 200000, 'L10': 500000, 'L11': 1000000, 'L12': 2000000
        };

        const currentRankIndex = ranks.indexOf(userRank);
        const virtualRankBonuses = [];

        if (currentRankIndex !== -1) {
          for (let i = 0; i <= currentRankIndex; i++) {
            const rank = ranks[i];
            const bonusAmount = rankBonusMap[rank];
            
            // Check if there is an existing bonus transaction of this amount that was successful/approved
            const existingApprovedTx = promoData.find(
              tx => tx.type === 'bonus' && 
                    tx.amount === bonusAmount && 
                    (tx.status?.toLowerCase() === 'success' || tx.status?.toLowerCase() === 'approved')
            );
            
            // Check if there is an existing pending bonus transaction of this amount
            const existingPendingTx = promoData.find(
              tx => tx.type === 'bonus' && 
                    tx.amount === bonusAmount && 
                    tx.status?.toLowerCase() === 'pending'
            );

            if (existingApprovedTx) {
              // Ensure status is marked clean
              existingApprovedTx.status = 'Approved';
            } else if (existingPendingTx) {
              existingPendingTx.status = 'Pending';
            } else {
              // No successful or pending transaction exists in the database for this rank's bonus.
              // Show it as Pending per the requirement.
              virtualRankBonuses.push({
                _id: `virtual_bonus_${rank}`,
                type: 'bonus',
                amount: bonusAmount,
                status: 'Pending',
                createdAt: user.createdAt || new Date().toISOString(),
                level: rank
              });
            }
          }
        }

        // Map status labels of actual transactions to standard forms
        const processedPromoData = promoData.map(tx => {
          const lowerStatus = tx.status?.toLowerCase();
          let statusText = tx.status;
          if (lowerStatus === 'success' || lowerStatus === 'approved') {
            statusText = 'Approved';
          } else if (lowerStatus === 'pending') {
            statusText = 'Pending';
          } else if (lowerStatus === 'failed' || lowerStatus === 'rejected') {
            statusText = 'Failed';
          }
          return {
            ...tx,
            status: statusText
          };
        });

        const combined = [...processedPromoData, ...virtualRankBonuses].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setBonuses(combined);
      } catch (error) {
        console.error('Error fetching promotion history:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const formatTime = (dateString) => {
    const options = { hour: '2-digit', minute: '2-digit', hour12: true };
    return new Date(dateString).toLocaleTimeString('en-US', options);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-10 text-center md:text-left">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#A020F0] to-[#FF00FF] mb-4 drop-shadow-[0_0_15px_rgba(255,0,255,0.4)]"
        >
          Promotion Bonus History
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-gray-400 text-sm md:text-lg max-w-2xl"
        >
          Track your rank achievement rewards and bi-monthly salary payouts.
        </motion.p>
      </div>

      {/* Promotional Bonus Structure Table */}
      <div className="mb-10 bg-[#0a0a0a] rounded-3xl border border-gray-800 p-4 sm:p-6 md:p-8 relative overflow-hidden shadow-[0_0_40px_rgba(160,32,240,0.1)]">
        <div className="absolute top-0 left-0 w-64 h-64 bg-[#FF00FF] rounded-full mix-blend-multiply filter blur-[100px] opacity-10 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#A020F0] rounded-full mix-blend-multiply filter blur-[100px] opacity-10 pointer-events-none"></div>

        <div className="relative z-10">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-6 text-center md:text-left flex items-center gap-2">
            <Trophy className="text-[#FF00FF]" size={24} />
            Promotional Bonus Structure
          </h2>
          
          <div className="overflow-x-auto border border-gray-800 rounded-2xl bg-gray-900/20 backdrop-blur-md">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/50 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Position / Level</th>
                  <th className="px-6 py-4">Team</th>
                  <th className="px-6 py-4">Salary Upto</th>
                  <th className="px-6 py-4">Margin Bonus</th>
                  <th className="px-6 py-4">Bonus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 text-xs font-semibold text-gray-300">
                {promoRules.map((rule, idx) => (
                  <tr key={idx} className="hover:bg-[#161B2A]/20 transition-colors">
                    <td className="px-6 py-3.5 text-white font-bold">{rule.level}</td>
                    <td className="px-6 py-3.5 text-gray-400 font-mono">{rule.team}</td>
                    <td className="px-6 py-3.5 text-[#A020F0] font-bold">{rule.salary}</td>
                    <td className="px-6 py-3.5 text-[#00C6FF] font-bold">{rule.margin}</td>
                    <td className="px-6 py-3.5 text-emerald-400 font-bold">{rule.bonus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Notes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-6 border-t border-gray-800">
            <div className="flex items-center gap-3 bg-[#161B2A]/20 p-4 rounded-xl border border-gray-800/40">
              <Calendar className="text-[#FF00FF] shrink-0" size={20} />
              <p className="text-[11px] text-gray-400 leading-normal">
                Salary is paid 2 times per month, on the 15th & month end.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-[#161B2A]/20 p-4 rounded-xl border border-gray-800/40">
              <Users className="text-[#00C6FF] shrink-0" size={20} />
              <p className="text-[11px] text-gray-400 leading-normal">
                Team count 30% strong leg - 70% from the other legs.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-[#161B2A]/20 p-4 rounded-xl border border-gray-800/40">
              <ShieldAlert className="text-emerald-400 shrink-0" size={20} />
              <p className="text-[11px] text-gray-400 leading-normal">
                ONLY APPLY ON 300$ AND ABOVE ID'S.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="bg-[#0a0a0a] rounded-3xl border border-gray-800 p-4 sm:p-6 md:p-8 relative overflow-hidden shadow-[0_0_40px_rgba(160,32,240,0.1)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#A020F0] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#FF00FF] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 pointer-events-none"></div>

        <div className="relative z-10 space-y-4">
          {loading ? (
            <div className="text-center py-10 text-[#FF00FF] animate-pulse">Loading promotion history...</div>
          ) : bonuses.length === 0 ? (
            <div className="text-center py-16">
              <Trophy className="mx-auto h-16 w-16 text-gray-700 mb-4" />
              <p className="text-gray-400 text-lg">No promotion bonuses recorded yet.</p>
              <p className="text-gray-500 text-sm mt-2">Achieve leadership ranks to unlock bonuses and salary.</p>
            </div>
          ) : (
            paginatedBonuses.map((tx, idx) => (
              <motion.div 
                key={tx._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-4 sm:p-5 hover:border-[#FF00FF]/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    tx.type === 'bonus' 
                      ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.2)]' 
                      : tx.type === 'level_split'
                      ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                      : 'bg-[#00FF99]/10 text-[#00FF99] border border-[#00FF99]/20 shadow-[0_0_15px_rgba(0,255,153,0.2)]'
                  }`}>
                    {tx.type === 'bonus' ? <Trophy size={24} /> : tx.type === 'level_split' ? <Award size={24} /> : <DollarSign size={24} />}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm sm:text-base md:text-lg">
                      {tx.type === 'bonus' ? 'Rank Achievement Bonus' : tx.type === 'level_split' ? `Level ${tx.level} Promo Split` : 'Leadership Salary'}
                    </h3>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center text-xs text-gray-400 gap-1">
                        <Calendar size={12} />
                        {formatDate(tx.createdAt)}
                      </div>
                      <div className="flex items-center text-xs text-gray-400 gap-1">
                        <Clock size={12} />
                        {formatTime(tx.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right ml-auto md:ml-0">
                  <p className="text-lg sm:text-xl md:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                    +${tx.amount.toFixed(2)}
                  </p>
                  {(() => {
                    const status = tx.status?.toLowerCase();
                    if (status === 'approved' || status === 'success' || status === 'completed') {
                      return (
                        <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00FF99]/10 text-[#00FF99] border border-[#00FF99]/20 uppercase tracking-wider">
                          Approved
                        </span>
                      );
                    } else if (status === 'pending') {
                      return (
                        <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 uppercase tracking-wider animate-pulse">
                          Pending
                        </span>
                      );
                    } else {
                      return (
                        <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-wider font-mono">
                          {tx.status || 'Failed'}
                        </span>
                      );
                    }
                  })()}
                </div>
              </motion.div>
            ))
          )}

          {/* Pagination */}
          {!loading && bonuses.length > 0 && totalPages > 1 && (
            <div className="border-t border-gray-800/50 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 relative z-10">
              <span className="text-xs text-gray-500 font-medium">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, bonuses.length)} of {bonuses.length} entries
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="bg-[#161B2A]/80 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {getPageNumbers().map((page, index) => {
                  if (page === '...') {
                    return (
                      <span key={`ellipsis-${index}`} className="px-2 text-xs text-gray-500 font-medium select-none">
                        ...
                      </span>
                    );
                  }
                  
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        currentPage === page
                          ? 'bg-gradient-to-r from-[#A020F0] to-[#FF00FF] text-white shadow-[0_0_10px_rgba(160,32,240,0.4)]'
                          : 'bg-[#161B2A]/80 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="bg-[#161B2A]/80 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromotionalBonusHistory;
