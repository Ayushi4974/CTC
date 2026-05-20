import React, { useEffect, useState } from 'react';
import api from '../api';
import { motion } from 'framer-motion';
import { Award, DollarSign, Calendar, Clock, Trophy } from 'lucide-react';

const PromotionalBonusHistory = () => {
  const [bonuses, setBonuses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const [txRes, levelRes] = await Promise.all([
          api.get('/transaction/history'),
          api.get('/user/level-income')
        ]);
        
        // Filter only promotional bonuses (rank bonuses and salary)
        const promoData = txRes.data.filter(tx => tx.type === 'bonus' || tx.type === 'salary');
        
        // The dashboard promotional balance includes the 50% split from level income
        // We map level income to match the transaction shape for the UI
        const levelData = levelRes.data.map(li => ({
          _id: li._id,
          type: 'level_split',
          amount: li.amount * 0.50, // 50% reserved split
          status: li.status,
          createdAt: li.createdAt,
          level: li.level
        }));

        const combined = [...promoData, ...levelData].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
          className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#A020F0] to-[#FF00FF] mb-4 drop-shadow-[0_0_15px_rgba(255,0,255,0.4)]"
        >
          Promotion Bonus History
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-gray-400 text-lg max-w-2xl"
        >
          Track your rank achievement rewards and bi-monthly salary payouts.
        </motion.p>
      </div>

      {/* History List */}
      <div className="bg-[#0a0a0a] rounded-3xl border border-gray-800 p-6 md:p-8 relative overflow-hidden shadow-[0_0_40px_rgba(160,32,240,0.1)]">
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
            bonuses.map((tx, idx) => (
              <motion.div 
                key={tx._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-5 hover:border-[#FF00FF]/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
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
                    <h3 className="text-white font-bold text-lg">
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
                  <p className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                    +${tx.amount.toFixed(2)}
                  </p>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 uppercase tracking-wider">
                    {tx.status}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PromotionalBonusHistory;
