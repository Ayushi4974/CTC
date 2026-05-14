import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Gem, Play, Calendar, DollarSign, Percent, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api';

const MiningHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/user/mining-history');
        setHistory(res.data);
      } catch (err) {
        console.error('Error fetching mining history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);
  return (
  <div className="max-w-7xl mx-auto pb-12 pt-4 px-4 sm:px-6 lg:px-8 min-h-screen">

    {/* Header */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-14 h-14 rounded-2xl bg-[#00C6FF]/10 border border-[#00C6FF]/30 flex items-center justify-center shadow-[inset_0_0_15px_rgba(0,198,255,0.2)]"
        >
          <Cpu size={28} className="text-[#00C6FF] drop-shadow-[0_0_8px_rgba(0,198,255,0.8)]" />
        </motion.div>
        <div>
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-extrabold text-white tracking-tight"
          >
            Mining History
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-gray-400"
          >
            Detailed logs of all your mining sessions
          </motion.p>
        </div>
      </div>

      <Link
        to="/package-history"
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#161B2A] border border-gray-800 text-gray-300 hover:text-[#00C6FF] hover:border-[#00C6FF]/50 transition-all font-bold text-sm shadow-lg group"
      >
        <History size={16} className="group-hover:rotate-[-20deg] transition-transform" />
        View Package History
      </Link>
    </div>

    {loading ? (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00C6FF]"></div>
      </div>
    ) : history.length === 0 ? (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#0B0F1A]/60 backdrop-blur-xl border border-gray-800/60 rounded-3xl p-16 flex flex-col items-center justify-center text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden group"
      >
        {/* Subtle Background Aura */}
        <div className="absolute inset-0 bg-[#00C6FF]/5 rounded-3xl blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000"></div>

        {/* Floating Diamond */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="w-24 h-24 rounded-full bg-[#161B2A]/80 border border-gray-700 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative z-10"
        >
          <Gem size={40} className="text-gray-600 group-hover:text-[#00C6FF] transition-colors duration-500 drop-shadow-[0_0_15px_rgba(0,198,255,0.2)]" />
        </motion.div>

        <h3 className="text-xl font-bold text-white mb-2 relative z-10 tracking-wide">
          No mining history found.
        </h3>
        <p className="text-gray-500 mb-8 max-w-sm relative z-10">
          You haven't initiated any mining sessions yet. Start your first session today to begin earning rewards!
        </p>

        <button className="relative z-10 group/btn bg-gradient-to-r from-[#00C6FF] to-[#A020F0] text-white px-8 py-3.5 rounded-xl font-bold shadow-[0_0_20px_rgba(0,198,255,0.3)] hover:shadow-[0_0_30px_rgba(160,32,240,0.5)] transition-all flex items-center gap-3 overflow-hidden">
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
          <Play size={18} fill="currentColor" className="drop-shadow-md" />
          <span className="drop-shadow-md tracking-wide">Start Mining Session</span>
        </button>
      </motion.div>
    ) : (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#0B0F1A]/60 backdrop-blur-xl border border-gray-800/60 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#161B2A]/80 border-b border-gray-800/60 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <th className="p-5 pl-6">Date</th>
                <th className="p-5">Amount Earned</th>
                <th className="p-5">Yield %</th>
                <th className="p-5">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((record, index) => (
                <tr key={index} className="border-b border-gray-800/40 hover:bg-[#161B2A]/40 transition-colors">
                  <td className="p-5 pl-6 text-sm text-gray-300 flex items-center gap-2">
                    <Calendar size={14} className="text-[#00C6FF]" />
                    {new Date(record.createdAt).toLocaleDateString()} {new Date(record.createdAt).toLocaleTimeString()}
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-[#00FF99]">
                      <DollarSign size={14} />
                      {record.amount.toFixed(2)}
                    </div>
                  </td>
                  <td className="p-5 text-sm font-medium text-gray-300 flex items-center gap-1">
                    {record.percentage.toFixed(2)} <Percent size={12} className="text-gray-500" />
                  </td>
                  <td className="p-5">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#00FF99]/10 text-[#00FF99] border border-[#00FF99]/20">
                      Credited
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    )}

  </div>
  );
};

export default MiningHistory;
