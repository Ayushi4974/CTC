import React, { useState, useEffect } from 'react';
import { History, Search, Download, Calendar, Filter } from 'lucide-react';
import api from '../api';
import { toast } from 'react-toastify';

const Transactions = () => {
  const [txs, setTxs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  const fetchTxs = async () => {
    try {
      const res = await api.get('/admin/transactions');
      setTxs(res.data);
    } catch (error) {
      toast.error('Failed to load transaction timeline logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTxs();
  }, []);

  const handleExportCSV = () => {
    if (txs.length === 0) return toast.info('No transactions to export');
    
    const headers = ['Date', 'User ID', 'Type', 'Description', 'Amount', 'Status', 'TxHash'];
    const rows = txs.map(t => [
      new Date(t.createdAt).toLocaleString(),
      t.userId || 'System',
      t.type,
      t.description || '',
      t.amount,
      t.status,
      t.txHash || ''
    ]);

    let csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CTC_System_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Export initiated!');
  };

  const filteredTxs = Array.isArray(txs) ? txs.filter((t) => {
    const matchesSearch = 
      t.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.txHash?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = 
      filterType === 'all' || 
      t.type === filterType;

    return matchesSearch && matchesType;
  }) : [];

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[#0B0F1A] border border-gray-800 p-6 rounded-3xl">
        <div>
          <h2 className="text-xl font-bold text-white">Unified Transactions Audit ({filteredTxs.length})</h2>
          <p className="text-xs text-gray-500 mt-1">Timeline auditing across deposits, ROI mining payouts, MLM commissions, and cancellations</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* CSV Export Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-1.5 bg-[#161B2A] border border-gray-800 hover:border-gray-600 hover:bg-[#161B2A] text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
          >
            <Download size={14} />
            Export CSV
          </button>

          {/* Type Filter Select */}
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-[#161B2A] border border-gray-800 text-xs font-bold text-gray-300 rounded-xl px-4 py-2.5 uppercase tracking-wide focus:outline-none focus:border-[#A020F0] appearance-none pr-8 cursor-pointer w-full"
            >
              <option value="all">All Types</option>
              <option value="deposit">Deposits</option>
              <option value="withdrawal">Withdrawals</option>
              <option value="investment">Investments</option>
              <option value="referral">MLM Referral</option>
              <option value="bonus">Rank Bonus</option>
              <option value="salary">Salaries</option>
            </select>
            <Filter size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Search by ID, Hash, Description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#A020F0]"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table List */}
      {loading ? (
        <div className="flex items-center justify-center h-[30vh]">
          <div className="w-10 h-10 border-4 border-[#A020F0] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-[#0B0F1A] border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-800 bg-[#161B2A]/30 text-xs font-bold text-gray-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">User ID</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Details / Description</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Blockchain Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm text-gray-300">
                {filteredTxs.map((t) => (
                  <tr key={t._id} className="hover:bg-[#161B2A]/20 transition-colors">
                    <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-emerald-400">{t.userId || 'System'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${
                        t.type === 'deposit' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : t.type === 'withdrawal' 
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : t.type === 'investment'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-[#A020F0]/10 text-[#FF00FF] border-[#A020F0]/20'
                      }`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-medium">{t.description}</td>
                    <td className="px-6 py-4 font-extrabold text-white font-mono">${Number(t.amount || 0).toFixed(3)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold ${t.status === 'success' || t.status === 'approved' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs select-all text-gray-500 max-w-[150px] truncate">
                      {t.txHash === 'System' ? 'System Internal' : t.txHash || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
