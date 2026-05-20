import React, { useState, useEffect } from 'react';
import { CreditCard, Check, X, ShieldAlert, AlertTriangle, ArrowUpRight, Search, FileText } from 'lucide-react';
import api from '../api';
import { toast } from 'react-toastify';

const Withdrawals = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // all, profit, principal

  const fetchWithdrawals = async () => {
    try {
      const res = await api.get('/admin/withdrawals');
      setWithdrawals(res.data);
    } catch (error) {
      toast.error('Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this withdrawal? This will log success in the system.')) return;
    try {
      await api.put(`/admin/withdrawal/${id}/approve`);
      toast.success('Withdrawal successfully approved!');
      fetchWithdrawals();
    } catch (error) {
      toast.error('Failed to approve withdrawal request');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this withdrawal? Balances will be refunded.')) return;
    try {
      await api.put(`/admin/withdrawal/${id}/reject`);
      toast.success('Withdrawal successfully rejected and refunded.');
      fetchWithdrawals();
    } catch (error) {
      toast.error('Failed to reject withdrawal request');
    }
  };

  // Filter & Search
  const filteredWithdrawals = withdrawals.filter((w) => {
    const matchesSearch = 
      w.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.walletAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const isSos = w.isPrincipalExit || w.type === 'principal' || w.userPackageId;
    const matchesType = 
      filterType === 'all' || 
      (filterType === 'principal' && isSos) || 
      (filterType === 'profit' && !isSos);

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[#0B0F1A] border border-gray-800 p-6 rounded-3xl">
        <div>
          <h2 className="text-xl font-bold text-white">Withdrawal Controls ({filteredWithdrawals.length})</h2>
          <p className="text-xs text-gray-500 mt-1">Review pending requests, calculate exit reserves, and trigger distributions</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* Filter Switcher */}
          <div className="flex bg-[#161B2A]/50 border border-gray-800 rounded-xl p-1 shrink-0">
            {['all', 'profit', 'principal'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  filterType === type 
                    ? 'bg-[#A020F0]/10 text-[#FF00FF] border border-[#A020F0]/20' 
                    : 'text-gray-400 hover:text-white border border-transparent'
                }`}
              >
                {type === 'all' ? 'All' : type === 'principal' ? 'SOS Principal' : 'Profit Wallet'}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Search by ID, Name, Address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#A020F0]"
            />
          </div>
        </div>
      </div>

      {/* Grid List of Pending & Approved Withdrawals */}
      {loading ? (
        <div className="flex items-center justify-center h-[30vh]">
          <div className="w-10 h-10 border-4 border-[#A020F0] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredWithdrawals.length === 0 ? (
        <div className="bg-[#0B0F1A] border border-gray-800 rounded-3xl p-12 text-center text-gray-500">
          No withdrawals match the selected filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredWithdrawals.map((w) => {
            const isSos = w.isPrincipalExit || w.type === 'principal' || w.userPackageId;
            const netAmount = w.netPayable ?? (isSos ? w.amount * 0.8 : w.amount * 0.9);
            const reservePercentage = isSos ? '20% Processing Exit' : '10% Reserve Fund';

            return (
              <div 
                key={w._id} 
                className={`bg-[#0B0F1A] border rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                  w.status === 'pending' 
                    ? isSos ? 'border-rose-500/30' : 'border-amber-500/30'
                    : 'border-gray-800'
                }`}
              >
                {/* Visual Glow */}
                {w.status === 'pending' && (
                  <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl ${isSos ? 'bg-rose-500/5' : 'bg-amber-500/5'}`}></div>
                )}

                <div className="flex justify-between items-start gap-4 mb-4">
                  <div>
                    <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border mb-2.5 ${
                      isSos 
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {isSos ? 'SOS Capital Exit' : 'Profit Wallet Withdrawal'}
                    </span>
                    <h3 className="text-base font-extrabold text-white">{w.user?.fullName || 'Full Profile Loaded'}</h3>
                    <p className="text-xs text-gray-400 mt-1 font-mono uppercase tracking-wide">ID: {w.userId}</p>
                  </div>

                  <div className="text-right">
                    <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Status</span>
                    {w.status === 'pending' ? (
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Pending Admin</span>
                    ) : w.status === 'approved' ? (
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Approved</span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">Rejected</span>
                    )}
                  </div>
                </div>

                {/* Balance breakdown */}
                <div className="bg-[#161B2A]/30 border border-gray-800 rounded-2xl p-4 grid grid-cols-3 gap-2 text-center mb-6">
                  <div>
                    <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Requested</span>
                    <span className="text-sm font-extrabold text-white">${Number(w.amount).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Fee ({isSos ? '20%' : '10%'})</span>
                    <span className="text-sm font-extrabold text-red-400">${Number(w.amount - netAmount).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Net Payable</span>
                    <span className="text-sm font-extrabold text-[#00C6FF]">${Number(netAmount).toFixed(2)}</span>
                  </div>
                </div>

                {/* Recipient Details */}
                <div className="space-y-2.5 text-xs border-t border-gray-800/30 pt-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Withdrawal Destination</span>
                    <span className="font-mono text-white text-[11px] select-all bg-gray-800/50 px-2 py-0.5 rounded border border-gray-700/30">{w.walletAddress}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Deduction Method</span>
                    <span className="text-gray-400 font-bold text-[10px] uppercase tracking-wide">{reservePercentage}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Submission Date</span>
                    <span className="text-gray-400 font-medium">{new Date(w.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {/* Approve/Reject Controls */}
                {w.status === 'pending' && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleReject(w._id)}
                      className="flex items-center justify-center gap-1.5 py-3 border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs font-bold tracking-wider uppercase rounded-xl transition-all"
                    >
                      <X size={14} />
                      Reject & Refund
                    </button>
                    <button
                      onClick={() => handleApprove(w._id)}
                      className="flex items-center justify-center gap-1.5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold tracking-wider uppercase rounded-xl transition-all shadow-[0_4px_15px_rgba(16,185,129,0.2)]"
                    >
                      <Check size={14} />
                      Approve Release
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Withdrawals;
