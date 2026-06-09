import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Coins, TrendingUp, Users, RefreshCw, Layers, Plus, X, Copy } from 'lucide-react';
import api from '../api';
import { toast } from 'react-toastify';

const PackageHistory = () => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [packageFilter, setPackageFilter] = useState('all');
  const [packages, setPackages] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ userId: '', packageId: '', amount: '', stakingDuration: 0 });
  const [assigning, setAssigning] = useState(false);
  const [users, setUsers] = useState([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, packageFilter]);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const [purchasesRes, usersRes] = await Promise.all([
        api.get('/admin/user-packages'),
        api.get('/admin/users')
      ]);
      setPurchases(purchasesRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      toast.error('Failed to load package purchase history');
    } finally {
      setLoading(false);
    }
  };

  const fetchPackages = async () => {
    try {
      const res = await api.get('/admin/packages');
      setPackages(res.data.filter(p => p.status === true));
    } catch (error) {
      console.error('Failed to load packages for assignment', error);
    }
  };

  useEffect(() => {
    fetchPurchases();
    fetchPackages();
  }, []);

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignForm.userId || !assignForm.packageId || !assignForm.amount) {
      return toast.error('Please fill in all fields.');
    }
    
    try {
      setAssigning(true);
      const res = await api.post('/admin/package/assign', {
        userId: assignForm.userId,
        packageId: assignForm.packageId,
        amount: Number(assignForm.amount),
        stakingDuration: Number(assignForm.stakingDuration || 0)
      });
      toast.success(res.data.message || 'Package manually assigned successfully!');
      setShowAssignModal(false);
      setAssignForm({ userId: '', packageId: '', amount: '', stakingDuration: 0 });
      fetchPurchases();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign package manually.');
    } finally {
      setAssigning(false);
    }
  };

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    toast.success(`${type} copied to clipboard!`);
  };

  const noPackagePurchases = users
    .filter((user) => {
      const hasPurchase = purchases.some((p) => p.userId === user.userId);
      return !hasPurchase;
    })
    .map((user) => ({
      _id: user._id,
      userId: user.userId,
      user: {
        fullName: user.fullName,
        email: user.email,
      },
      packageId: {
        name: 'No Active Package',
      },
      amount: 0,
      compoundingBalance: 0,
      dailyProfitPercent: 0,
      totalEarned: 0,
      createdAt: user.createdAt,
      status: 'no_package',
    }));

  // Filter logic
  const sourceList = statusFilter === 'no_package' ? noPackagePurchases : purchases;
  const filteredPurchases = sourceList.filter((p) => {
    const matchesSearch =
      p.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || statusFilter === 'no_package' || p.status === statusFilter;

    const matchesPackage = packageFilter === 'all' || p.packageId?._id === packageFilter;

    return matchesSearch && matchesStatus && matchesPackage;
  });

  // Pagination calculation
  const totalItems = filteredPurchases.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentPurchases = filteredPurchases.slice(startIndex, endIndex);

  // Extract unique packages for filter dropdown
  const uniquePackages = Array.from(
    new Map(
      purchases
        .filter(p => p.packageId)
        .map(p => [p.packageId._id, p.packageId])
    ).values()
  );

  // Statistics calculation
  const totalStaked = purchases
    .filter(p => p.status === 'active')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalROI = purchases
    .reduce((sum, p) => sum + (p.totalEarned || 0), 0);

  const activeCount = purchases.filter(p => p.status === 'active').length;

  const uniqueUsersCount = new Set(purchases.map(p => p.userId)).size;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Card 1: Active Stakes */}
        <div className="bg-[#0B0F1A] border border-gray-800 rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-[#A020F0]/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Stakes</span>
            <div className="w-10 h-10 rounded-xl bg-[#A020F0]/10 border border-[#A020F0]/20 flex items-center justify-center text-[#FF00FF]">
              <Layers size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-white">{activeCount} Purchases</h3>
          <p className="text-xs text-gray-400 mt-1">Out of {purchases.length} total sales</p>
        </div>

        {/* Card 2: Active Capital Staked */}
        <div className="bg-[#0B0F1A] border border-gray-800 rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Capital Staked</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Coins size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-white">${totalStaked.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          <p className="text-xs text-gray-400 mt-1">Currently earning daily profit</p>
        </div>

        {/* Card 3: Total ROI Paid */}
        <div className="bg-[#0B0F1A] border border-gray-800 rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total ROI Paid</span>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <TrendingUp size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-white">${totalROI.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          <p className="text-xs text-gray-400 mt-1">Accumulated daily distribution</p>
        </div>

        {/* Card 4: Staking Users */}
        <div className="bg-[#0B0F1A] border border-gray-800 rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Staking Users</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Users size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-white">{uniqueUsersCount} Users</h3>
          <p className="text-xs text-gray-400 mt-1">Unique active participants</p>
        </div>
      </div>

      {/* Header controls & Filters */}
      <div className="flex flex-col gap-6 bg-[#0B0F1A] border border-gray-800 p-6 rounded-3xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Package Purchase History ({filteredPurchases.length})</h2>
            <p className="text-xs text-gray-500 mt-1">Monitor user staking allocations, compounding growth, and active status rules</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="text"
                placeholder="Search User ID, Name, Email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#A020F0]"
              />
            </div>

            <button
              onClick={() => setShowAssignModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#A020F0] to-[#FF00FF] hover:shadow-[0_0_20px_rgba(160,32,240,0.4)] text-white rounded-xl text-xs font-bold uppercase transition-all active:scale-95 shrink-0"
            >
              <Plus size={14} />
              Assign Package
            </button>

            <button
              onClick={fetchPurchases}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#161B2A] border border-gray-800 text-gray-300 hover:text-white rounded-xl text-xs font-bold uppercase transition-all"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-800/40">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Filter By Status</span>
            <div className="flex bg-[#161B2A]/50 border border-gray-800 rounded-xl p-1 flex-wrap gap-1">
              {['all', 'active', 'completed', 'cancelled', 'expired', 'no_package'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${statusFilter === status
                      ? 'bg-[#A020F0]/10 text-[#FF00FF] border border-[#A020F0]/20'
                      : 'text-gray-400 hover:text-white border border-transparent'
                    }`}
                >
                  {status === 'no_package' ? 'No Purchase' : status}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 min-w-[200px]">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Filter By Package Tier</span>
            <select
              value={packageFilter}
              onChange={(e) => setPackageFilter(e.target.value)}
              className="bg-[#161B2A] border border-gray-800 rounded-xl px-3 py-2 text-xs font-bold text-gray-400 focus:outline-none focus:border-[#A020F0] h-[38px]"
            >
              <option value="all">ALL PACKAGES</option>
              {uniquePackages.map((pkg) => (
                <option key={pkg._id} value={pkg._id}>
                  {pkg.name.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table card */}
      <div className="bg-[#0B0F1A] border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center h-[30vh]">
            <div className="w-10 h-10 border-4 border-[#A020F0] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No package purchases found matching the selected filters.
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 bg-[#070A12]/50 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-4 px-6">User Details</th>
                    <th className="py-4 px-6">Package Name</th>
                    <th className="py-4 px-6">Principal Amount</th>
                    <th className="py-4 px-6">Compounding Balance</th>
                    <th className="py-4 px-6">Daily ROI Rate</th>
                    <th className="py-4 px-6">Total ROI Earned</th>
                    <th className="py-4 px-6">Purchase Date</th>
                    <th className="py-4 px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-850 text-xs text-gray-350">
                  {currentPurchases.map((p) => {
                    return (
                      <tr key={p._id} className="hover:bg-[#161B2A]/10 transition-colors text-xs text-white">
                        <td className="py-4.5 px-6">
                          <div className="font-bold text-sm text-white">{p.user?.fullName || 'Unknown User'}</div>
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5 uppercase tracking-wider flex items-center gap-1.5">
                            <span>ID: {p.userId}</span>
                            <button
                              onClick={() => handleCopy(p.userId, 'User ID')}
                              className="text-gray-500 hover:text-white transition-colors p-0.5 rounded hover:bg-gray-800"
                              title="Copy ID"
                            >
                              <Copy size={10} />
                            </button>
                          </div>
                          {p.user?.email && (
                            <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                              <span className="truncate max-w-[150px]" title={p.user.email}>{p.user.email}</span>
                              <button
                                onClick={() => handleCopy(p.user.email, 'Email')}
                                className="text-gray-500 hover:text-white transition-colors p-0.5 rounded hover:bg-gray-800"
                                title="Copy Email"
                              >
                                <Copy size={10} />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="py-4.5 px-6 font-semibold">
                          <div className="text-white text-sm">{p.packageId?.name || 'SOS Capital Tier'}</div>
                          {p.isStaked ? (
                            <span className="inline-flex mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#00C6FF]/10 text-[#00C6FF] border border-[#00C6FF]/20 uppercase tracking-wider">
                              Staked ({p.stakingDuration}d)
                            </span>
                          ) : p.packageId && (
                            <span className="inline-flex mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-800 text-gray-400 border border-gray-700 uppercase tracking-wider">
                              Standard
                            </span>
                          )}
                        </td>
                        <td className="py-4.5 px-6 font-mono font-extrabold text-sm text-white">
                          ${Number(p.amount || 0).toFixed(2)}
                        </td>
                        <td className="py-4.5 px-6 font-mono font-bold text-[#00C6FF]">
                          ${Number(p.compoundingBalance || 0).toFixed(2)}
                        </td>
                        <td className="py-4.5 px-6 font-bold text-emerald-400">
                          {p.dailyProfitPercent}% / day
                        </td>
                        <td className="py-4.5 px-6 font-mono font-extrabold text-[#FF00FF]">
                          ${Number(p.totalEarned || 0).toFixed(2)}
                        </td>
                        <td className="py-4.5 px-6 text-gray-400">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-gray-500" />
                            {new Date(p.startDate || p.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-[9px] text-gray-500 font-mono mt-0.5">
                            {new Date(p.startDate || p.createdAt).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="py-4.5 px-6">
                          {p.status === 'active' ? (
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">Active</span>
                          ) : p.status === 'completed' ? (
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">Completed</span>
                          ) : p.status === 'expired' ? (
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-gray-400 border border-gray-700 uppercase tracking-wider">Expired</span>
                          ) : p.status === 'cancelled' ? (
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-wider">Cancelled</span>
                          ) : p.status === 'no_package' ? (
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-gray-500 border border-gray-700 uppercase tracking-wider">No Purchase</span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider">{p.status}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-6 border-t border-gray-800 bg-[#161B2A]/10">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Show</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-[#161B2A] border border-gray-800 rounded-lg px-2 py-1 text-gray-300 focus:outline-none focus:border-[#A020F0]"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>entries</span>
                <span className="mx-2">|</span>
                <span>Showing {totalItems === 0 ? 0 : startIndex + 1} to {endIndex} of {totalItems} entries</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1.5 rounded-lg border border-gray-850 text-xs font-bold transition-all duration-300 ${currentPage === 1
                      ? 'text-gray-600 bg-gray-900/10 cursor-not-allowed border-transparent'
                      : 'text-gray-300 hover:text-white hover:border-gray-700 bg-[#161B2A]/30 hover:bg-[#161B2A]/60'
                    }`}
                >
                  Previous
                </button>

                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => {
                    return p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1;
                  })
                  .map((p, idx, arr) => {
                    const isPageActive = currentPage === p;
                    const prevPage = arr[idx - 1];
                    const showEllipsis = prevPage && p - prevPage > 1;

                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && <span className="px-2 text-gray-600 text-xs">...</span>}
                        <button
                          onClick={() => setCurrentPage(p)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-300 ${isPageActive
                              ? 'bg-gradient-to-r from-[#A020F0] to-[#FF00FF] text-white shadow-[0_0_10px_rgba(160,32,240,0.3)]'
                              : 'text-gray-400 hover:text-white hover:bg-[#161B2A]/50 border border-transparent'
                            }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className={`px-3 py-1.5 rounded-lg border border-gray-855 text-xs font-bold transition-all duration-300 ${currentPage === totalPages || totalPages === 0
                      ? 'text-gray-600 bg-gray-900/10 cursor-not-allowed border-transparent'
                      : 'text-gray-300 hover:text-white hover:border-gray-700 bg-[#161B2A]/30 hover:bg-[#161B2A]/60'
                    }`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0B0F1A] border border-[#A020F0]/30 rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#A020F0]/10 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#161B2A]/30">
              <div>
                <h3 className="text-lg font-bold text-white">Manual Package Assignment</h3>
                <p className="text-xs text-gray-500">Instantly activate staking packages for users</p>
              </div>
              <button 
                onClick={() => setShowAssignModal(false)}
                className="p-1.5 text-gray-400 hover:text-white bg-gray-800 rounded-lg transition-colors border border-gray-700"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1.5">User ID or Email</label>
                <input
                  type="text"
                  placeholder="e.g. CTC123456 or user@email.com"
                  value={assignForm.userId}
                  onChange={(e) => setAssignForm({ ...assignForm, userId: e.target.value })}
                  className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#A020F0]"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1.5">Select Staking Package</label>
                <select
                  value={assignForm.packageId}
                  onChange={(e) => {
                    const pkgId = e.target.value;
                    const pkg = packages.find(p => p._id === pkgId);
                    setAssignForm({
                      ...assignForm,
                      packageId: pkgId,
                      amount: pkg ? pkg.minAmount.toString() : ''
                    });
                  }}
                  className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#A020F0]"
                  required
                >
                  <option value="">-- Choose Package --</option>
                  {packages.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.name} (${p.minAmount} - ${p.maxAmount}) [{p.dailyProfit}% Daily]
                    </option>
                  ))}
                </select>
              </div>

              {assignForm.packageId && (() => {
                const pkg = packages.find(p => p._id === assignForm.packageId);
                return (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider">Investment Amount ($)</label>
                        {pkg && (
                          <span className="text-[10px] text-[#00C6FF] font-semibold">
                            Range: ${pkg.minAmount} - ${pkg.maxAmount}
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        placeholder="e.g. 500"
                        min={pkg ? pkg.minAmount : undefined}
                        max={pkg ? pkg.maxAmount : undefined}
                        value={assignForm.amount}
                        onChange={(e) => setAssignForm({ ...assignForm, amount: e.target.value })}
                        className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#A020F0] font-mono font-bold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1.5">Staking Duration (Auto-Compounding)</label>
                      <select
                        value={assignForm.stakingDuration}
                        onChange={(e) => setAssignForm({ ...assignForm, stakingDuration: Number(e.target.value) })}
                        className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#A020F0]"
                        required
                      >
                        <option value={0}>No Staking (Daily Available Payouts)</option>
                        <option value={30}>30 Days Stake (Auto-Compound, Locked)</option>
                        <option value={90}>90 Days Stake (Auto-Compound, Locked)</option>
                        <option value={180}>180 Days Stake (Auto-Compound, Locked)</option>
                        <option value={360}>360 Days Stake (Auto-Compound, Locked)</option>
                      </select>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 bg-gray-800 text-gray-400 hover:text-white rounded-xl transition-colors text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  className="px-6 py-2 bg-gradient-to-r from-[#A020F0] to-[#FF00FF] hover:shadow-[0_0_15px_rgba(160,32,240,0.4)] text-white rounded-xl transition-colors text-xs font-bold disabled:opacity-50"
                >
                  {assigning ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackageHistory;
