import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ArrowUpRight, ArrowDownRight, Package, Users, Gift,
  CheckCircle2, Clock, XCircle, Copy, Check, Filter, Layers
} from 'lucide-react';
import api from '../api';
import { useEffect } from 'react';


const filters = ['All', 'Deposit', 'Withdrawal', 'Investment', 'Level Income', 'Bonus'];

const Transactions = () => {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedHash, setCopiedHash] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await api.get('/transaction/history');
        setTransactions(res.data);
      } catch (err) {
        console.error('Error fetching transactions:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  const handleCopy = (hash) => {
    if (hash === 'System') return;
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredTransactions = transactions.filter(txn => {
    const txnTypeMatch = txn.type ? txn.type.toLowerCase() : '';
    const activeFilterMatch = activeFilter.toLowerCase();

    // Map backend transaction types to UI tabs if necessary
    // Because backend uses 'bonus'/'salary', but UI tab is 'Bonus'
    // 'investment', 'referral' might not exist in the Transaction collection, 
    // but this ensures at least Deposit, Withdrawal, and Bonus work perfectly.
    const matchesFilter = activeFilter === 'All' ||
      txnTypeMatch === activeFilterMatch ||
      (activeFilter === 'Bonus' && (txnTypeMatch === 'bonus' || txnTypeMatch === 'salary'));

    const matchesSearch =
      (txn._id && txn._id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (txn.description && txn.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (txn.txHash && txn.txHash.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  const getTypeIcon = (type) => {
    const lowerType = type ? type.toLowerCase() : '';
    switch (lowerType) {
      case 'deposit': return <ArrowDownRight size={16} className="text-[#00FF99]" />;
      case 'withdrawal': return <ArrowUpRight size={16} className="text-[#FF00FF]" />;
      case 'investment': return <Package size={16} className="text-[#00C6FF]" />;
      case 'referral': return <Users size={16} className="text-[#A020F0]" />;
      case 'level income': return <Layers size={16} className="text-amber-500" />;
      case 'bonus': return <Gift size={16} className="text-yellow-500" />;
      default: return <ArrowUpRight size={16} />;
    }
  };

  const getStatusBadge = (status) => {
    const lowerStatus = status?.toLowerCase() || '';
    if (lowerStatus === 'completed' || lowerStatus === 'approved' || lowerStatus === 'success') {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#00FF99]/10 text-[#00FF99] border border-[#00FF99]/20 shadow-[0_0_10px_rgba(0,255,153,0.1)]"><CheckCircle2 size={12} /> Completed</span>;
    } else if (lowerStatus === 'pending') {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.1)] animate-pulse"><Clock size={12} /> Pending</span>;
    } else if (lowerStatus === 'failed' || lowerStatus === 'rejected') {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]"><XCircle size={12} /> Failed</span>;
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 pt-4 px-4 sm:px-6 lg:px-8">

      {/* Header */}
      <div className="mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-extrabold text-white mb-2"
        >
          Transaction History
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-gray-400"
        >
          View and track all your financial activities, deposits, and withdrawals.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#0B0F1A]/80 backdrop-blur-xl border border-gray-800/60 rounded-3xl p-6 shadow-lg flex flex-col gap-6"
      >
        {/* Filter & Search Bar */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-[#161B2A]/50 p-2 rounded-2xl border border-gray-800/50">

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${activeFilter === filter
                    ? 'bg-gradient-to-r from-[#A020F0] to-[#FF00FF] text-white shadow-[0_0_15px_rgba(160,32,240,0.4)]'
                    : 'bg-[#0B0F1A] text-gray-400 border border-gray-800 hover:border-gray-600 hover:text-white'
                  }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full xl:w-[350px]">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0B0F1A] border border-gray-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#A020F0] focus:ring-1 focus:ring-[#A020F0] transition-all"
            />
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-full">
            <thead>
              <tr className="bg-[#161B2A]/80 border-b border-gray-800/60 text-[9px] md:text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                <th className="p-3 md:p-4 rounded-tl-2xl">Type</th>
                <th className="p-3 md:p-4 hidden md:table-cell">Description</th>
                <th className="p-3 md:p-4 text-right">Amount</th>
                <th className="p-3 md:p-4 text-center hidden sm:table-cell">Date</th>
                <th className="p-3 md:p-4 text-center">Status</th>
                <th className="p-3 md:p-4 text-right hidden md:table-cell rounded-tr-2xl">Hash / ID</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="py-20 text-center text-gray-500">Loading transactions...</td>
                  </tr>
                ) : filteredTransactions.length > 0 ? (
                  filteredTransactions.map((txn, idx) => (
                    <motion.tr
                      key={txn._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
                      className="border-b border-gray-800/30 hover:bg-[#161B2A]/40 transition-colors group"
                    >
                      {/* Type */}
                      <td className="p-3 md:p-4">
                        <div className="flex items-center gap-2 md:gap-3">
                          <div className="w-6 h-6 md:w-8 md:h-8 shrink-0 rounded-full bg-[#161B2A] border border-gray-800 flex items-center justify-center group-hover:border-[#A020F0]/50 transition-colors">
                            {getTypeIcon(txn.type)}
                          </div>
                          <div className="truncate pr-1 md:pr-2">
                            <p className="text-xs md:text-sm font-bold text-white capitalize truncate">{txn.type}</p>
                            <p className="text-[9px] md:text-[10px] text-gray-500 truncate max-w-[80px] md:max-w-[150px]" title={txn._id}>{txn._id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="p-3 md:p-4 hidden md:table-cell">
                        <p className="text-sm font-medium text-gray-300 truncate max-w-[200px]">{txn.description}</p>
                      </td>

                      {/* Amount */}
                      <td className="p-3 md:p-4 text-right">
                        <p className={`text-[11px] md:text-sm font-bold tracking-wide whitespace-nowrap ${txn.type.toLowerCase() !== 'withdrawal' && txn.type.toLowerCase() !== 'investment' ? 'text-[#00FF99] drop-shadow-[0_0_5px_rgba(0,255,153,0.3)]' : 'text-white'}`}>
                          {txn.type.toLowerCase() !== 'withdrawal' && txn.type.toLowerCase() !== 'investment' ? '+' : '-'} ${txn.amount}
                        </p>
                      </td>

                      {/* Date */}
                      <td className="p-3 md:p-4 text-center hidden sm:table-cell">
                        <p className="text-[10px] md:text-xs text-gray-400 font-medium whitespace-nowrap">{new Date(txn.createdAt).toLocaleDateString()}</p>
                      </td>

                      {/* Status */}
                      <td className="p-3 md:p-4 text-center">
                        <div className="flex justify-center">
                          {getStatusBadge(txn.status)}
                        </div>
                      </td>

                      {/* Hash / ID */}
                      <td className="p-3 md:p-4 hidden md:table-cell text-right">
                        <div className="flex justify-end items-center gap-2">
                          <span className="text-[11px] font-mono text-gray-400 bg-[#161B2A] px-2 py-1 rounded border border-gray-800 truncate max-w-[120px]" title={txn.txHash || 'System'}>
                            {txn.txHash || 'System'}
                          </span>
                          {txn.txHash && txn.txHash !== 'System' && (
                            <button
                              onClick={() => handleCopy(txn.txHash)}
                              className="text-gray-500 hover:text-[#00C6FF] transition-colors p-1"
                              title="Copy Hash"
                            >
                              {copiedHash === txn.txHash ? <Check size={14} className="text-[#00FF99]" /> : <Copy size={14} />}
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="py-20 flex flex-col items-center justify-center text-center"
                      >
                        <div className="w-16 h-16 rounded-full bg-[#161B2A] border border-gray-800 flex items-center justify-center mb-4">
                          <Filter size={24} className="text-gray-600" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">No transactions found</h3>
                        <p className="text-sm text-gray-500">We couldn't find any activities matching your criteria.</p>
                      </motion.div>
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>

    </div>
  );
};

export default Transactions;
