import React, { useState, useEffect } from 'react';
import { Search, Eye, ShieldAlert, ShieldCheck, Mail, Phone, Calendar, ArrowRight, Copy, Trash2 } from 'lucide-react';
import api from '../api';
import { toast } from 'react-toastify';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset page when search or date filters change
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    isActive: false,
    availableBalance: 0,
    miningIncome: 0,
    referralIncome: 0,
    levelIncome: 0,
    promotionalIncome: 0,
    sponsorId: '',
    rank: '',
    pins: 1
  });

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (error) {
      toast.error('Failed to load user directories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleImpersonate = async () => {
    if (!selectedUser) return;
    try {
      const res = await api.post(`/admin/user/${selectedUser._id}/impersonate`);
      const data = res.data;
      
      const origin = window.location.origin;
      const clientBaseUrl = origin.includes('5174') ? 'http://localhost:5173' : origin;
      
      const queryParams = new URLSearchParams({
        _id: data._id,
        userId: data.userId,
        fullName: data.fullName,
        email: data.email,
        role: data.role,
        isKYCVerified: data.isKYCVerified ? 'true' : 'false',
        token: data.token
      }).toString();
      
      window.open(`${clientBaseUrl}/login?${queryParams}`, '_blank');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to impersonate user');
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setIsEditing(false);
    setEditForm({
      fullName: user.fullName || '',
      email: user.email || '',
      isActive: user.isActive || false,
      availableBalance: user.availableBalance || 0,
      miningIncome: user.miningIncome || 0,
      referralIncome: user.referralIncome || 0,
      levelIncome: user.levelIncome || 0,
      promotionalIncome: user.promotionalIncome || 0,
      sponsorId: user.sponsorId || '',
      rank: user.rank || 'L1',
      pins: user.pins !== undefined ? user.pins : 1
    });
  };

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    toast.success(`${type} copied to clipboard!`);
  };

  const handleBlockToggle = async (userId, isBlocked) => {
    try {
      const action = isBlocked ? 'unblock' : 'block';
      await api.put(`/admin/user/${userId}/block`);
      toast.success(`User ${action}ed successfully`);
      fetchUsers();
      if (selectedUser && selectedUser._id === userId) {
        setSelectedUser(prev => ({ ...prev, isBlocked: !prev.isBlocked }));
      }
    } catch (error) {
      toast.error('Failed to update user block status');
    }
  };

  const handleActiveToggle = async (userId, currentActive) => {
    try {
      const newActive = !currentActive;
      const action = newActive ? 'activate' : 'deactivate';
      await api.put(`/admin/user/${userId}`, { isActive: newActive });
      toast.success(`User ${action}d successfully`);
      fetchUsers();
      if (selectedUser && selectedUser._id === userId) {
        setSelectedUser(prev => ({ ...prev, isActive: newActive }));
        setEditForm(prev => ({ ...prev, isActive: newActive }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user active status');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!user) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete user ${user.userId} (${user.fullName})?\n\n` +
      `WARNING: This will cascade delete their packages, transaction logs, mining records, KYC details, and all MLM incomes. Direct referrals of this user will bypass them and link directly to their sponsor. This action CANNOT be undone.`
    );
    if (!confirmDelete) return;

    try {
      const res = await api.delete(`/admin/user/${user._id}`);
      toast.success(res.data.message || 'User deleted successfully');
      fetchUsers();
      if (selectedUser && selectedUser._id === user._id) {
        setSelectedUser(null);
        setIsEditing(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/admin/user/${selectedUser._id}`, editForm);
      toast.success('User profile updated successfully');
      fetchUsers();
      setSelectedUser(res.data.user);
      setIsEditing(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user profile');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      (user.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.userId || '').toLowerCase().includes(searchTerm.toLowerCase());

    let matchesDate = true;
    if (user.createdAt) {
      const userDate = new Date(user.createdAt);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (userDate < start) matchesDate = false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (userDate > end) matchesDate = false;
      }
    } else if (startDate || endDate) {
      matchesDate = false;
    }

    return matchesSearch && matchesDate;
  });

  // Pagination calculation
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[#0B0F1A] border border-gray-800 p-6 rounded-3xl">
        <div>
          <h2 className="text-xl font-bold text-white">Registered Users ({filteredUsers.length})</h2>
          <p className="text-xs text-gray-500 mt-1">Audit profile settings, balances, and block statuses</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {/* Date range filters */}
          <div className="flex items-center gap-2 bg-[#161B2A]/50 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Reg Date:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none text-white focus:outline-none text-xs w-28 cursor-pointer"
            />
            <span className="text-gray-600">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none text-white focus:outline-none text-xs w-28 cursor-pointer"
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-[#FF00FF] hover:underline ml-1 font-bold text-xs"
              >
                Clear
              </button>
            )}
          </div>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Search by ID, name, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#A020F0]"
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center h-[40vh]">
          <div className="w-10 h-10 border-4 border-[#A020F0] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-[#0B0F1A] border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-800 bg-[#161B2A]/30 text-xs font-bold text-gray-400 uppercase tracking-widest">
                  <th className="px-6 py-4">User Details</th>
                  <th className="px-6 py-4">User ID</th>
                  <th className="px-6 py-4">Sponsor</th>
                  <th className="px-6 py-4">Total Staked</th>
                  <th className="px-6 py-4">Wallet Balance</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm text-gray-300">
                {currentUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-[#161B2A]/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{user.fullName}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <span>{user.email}</span>
                        <button
                          onClick={() => handleCopy(user.email, 'Email')}
                          className="text-gray-500 hover:text-white transition-colors p-0.5 rounded hover:bg-gray-800"
                          title="Copy Email"
                        >
                          <Copy size={10} />
                        </button>
                        <span className="text-[10px] bg-[#A020F0]/10 text-[#FF00FF] px-1.5 py-0.5 rounded border border-[#A020F0]/20 font-bold ml-1">{user.pins ?? 1} Pins</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-emerald-400">
                      <div className="flex items-center gap-1.5">
                        <span>{user.userId}</span>
                        <button
                          onClick={() => handleCopy(user.userId, 'User ID')}
                          className="text-gray-500 hover:text-white transition-colors p-0.5 rounded hover:bg-gray-800"
                          title="Copy ID"
                        >
                          <Copy size={10} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-400">{user.sponsorId || 'None'}</td>
                    <td className="px-6 py-4 font-bold text-white">${Number(user.totalInvestment || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 font-bold text-[#00C6FF]">${Number(user.availableBalance || 0).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      {user.isBlocked ? (
                        <span className="inline-flex px-2 py-1 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">Blocked</span>
                      ) : user.isActive ? (
                        <span className="inline-flex px-2 py-1 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>
                      ) : (
                        <span className="inline-flex px-2 py-1 rounded text-[10px] font-bold bg-gray-800 text-gray-500 border border-gray-700">Inactive</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleSelectUser(user)}
                        className="p-2 bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors border border-gray-750"
                        title="View Profile"
                      >
                        <Eye size={15} />
                      </button>
                      <button 
                        onClick={() => handleBlockToggle(user._id, user.isBlocked)}
                        className={`p-2 rounded-lg transition-colors border ${
                          user.isBlocked 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' 
                            : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'
                        }`}
                        title={user.isBlocked ? 'Unblock User' : 'Block User'}
                      >
                        {user.isBlocked ? <ShieldCheck size={15} /> : <ShieldAlert size={15} />}
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user)}
                        className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20"
                        title="Delete User"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {currentUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500 text-sm">
                      No users matched the active filters.
                    </td>
                  </tr>
                )}
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
                className={`px-3 py-1.5 rounded-lg border border-gray-850 text-xs font-bold transition-all duration-300 ${
                  currentPage === 1 
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
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-300 ${
                          isPageActive 
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
                className={`px-3 py-1.5 rounded-lg border border-gray-855 text-xs font-bold transition-all duration-300 ${
                  currentPage === totalPages || totalPages === 0
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

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form 
            onSubmit={isEditing ? handleEditSubmit : (e) => e.preventDefault()}
            className="w-full max-w-2xl bg-[#0B0F1A] border border-[#A020F0]/30 rounded-3xl overflow-hidden shadow-2xl relative"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#A020F0]/10 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#161B2A]/30">
              <div>
                <h3 className="text-lg font-bold text-white">{isEditing ? 'Edit User Profile' : 'Detailed User Profile'}</h3>
                <p className="text-xs text-gray-500">ID: {selectedUser.userId}</p>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <>
                    <button 
                      type="button"
                      onClick={handleImpersonate}
                      className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg transition-colors text-xs font-bold shadow-md"
                    >
                      View user dashboard without Login
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleDeleteUser(selectedUser)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-xs font-bold shadow-md"
                    >
                      Delete User
                    </button>
                  </>
                )}
                {!isEditing ? (
                  <button 
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1 bg-[#A020F0] hover:bg-[#A020F0]/80 text-white rounded-lg transition-colors text-xs font-bold"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1 bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors text-xs font-bold"
                  >
                    Cancel
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-3 py-1 bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto hide-scrollbar">
              {isEditing ? (
                // Edit Mode Form Fields
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Full Name</label>
                      <input
                        type="text"
                        value={editForm.fullName}
                        onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                        className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#A020F0]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Email</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#A020F0]"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Available Balance ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.availableBalance}
                        onChange={(e) => setEditForm({ ...editForm, availableBalance: e.target.value })}
                        className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#A020F0]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Copy Trade ROI ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.miningIncome}
                        onChange={(e) => setEditForm({ ...editForm, miningIncome: e.target.value })}
                        className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#A020F0]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Referral Income ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.referralIncome}
                        onChange={(e) => setEditForm({ ...editForm, referralIncome: e.target.value })}
                        className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#A020F0]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Level Income ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.levelIncome}
                        onChange={(e) => setEditForm({ ...editForm, levelIncome: e.target.value })}
                        className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#A020F0]"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Promotional Income ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.promotionalIncome}
                        onChange={(e) => setEditForm({ ...editForm, promotionalIncome: e.target.value })}
                        className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#A020F0]"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Network & MLM Hierarchy</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Sponsor ID</label>
                        <input
                          type="text"
                          value={editForm.sponsorId}
                          onChange={(e) => setEditForm({ ...editForm, sponsorId: e.target.value })}
                          className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#A020F0] font-mono"
                          placeholder="None"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">MLM Rank</label>
                        <select
                          value={editForm.rank}
                          onChange={(e) => setEditForm({ ...editForm, rank: e.target.value })}
                          className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#A020F0] font-mono"
                        >
                          <option value="L1">L1</option>
                          <option value="L2">L2</option>
                          <option value="L3">L3</option>
                          <option value="L4">L4</option>
                          <option value="L5">L5</option>
                          <option value="L6">L6</option>
                          <option value="L7">L7</option>
                          <option value="L8">L8</option>
                          <option value="L9">L9</option>
                          <option value="L10">L10</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Pins</label>
                        <select
                          value={editForm.pins}
                          onChange={(e) => setEditForm({ ...editForm, pins: Number(e.target.value) })}
                          className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#A020F0] font-mono"
                        >
                          <option value={1}>1</option>
                          <option value={0}>0</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-[#161B2A]/30 border border-gray-800 p-4 rounded-xl">
                    <div>
                      <span className="block text-xs font-bold text-white">Activation Status</span>
                      <span className="text-[10px] text-gray-500">Toggle whether the user is Active or Inactive.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, isActive: !editForm.isActive })}
                      className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-colors border ${
                        editForm.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/30'
                          : 'bg-gray-800 text-gray-500 border-gray-750 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      {editForm.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 bg-gray-800 text-gray-400 hover:text-white rounded-xl transition-colors text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#A020F0] hover:bg-[#A020F0]/80 text-white rounded-xl transition-colors text-xs font-bold"
                    >
                      Save Changes
                    </button>
                  </div>
                </>
              ) : (
                // View Mode
                <>
                  {/* Profile Card Summary */}
                  <div className="flex items-center gap-4 bg-[#161B2A]/50 border border-gray-800 p-4 rounded-2xl">
                    <div className="w-12 h-12 rounded-full bg-[#A020F0]/10 flex items-center justify-center text-[#FF00FF] font-bold text-lg">
                      {selectedUser.fullName?.[0] || 'U'}
                    </div>
                    <div>
                      <h4 className="font-bold text-white">{selectedUser.fullName}</h4>
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center text-xs text-gray-400 mt-1">
                        <span className="flex items-center gap-1"><Mail size={12}/> {selectedUser.email}</span>
                        {selectedUser.phone && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="flex items-center gap-1"><Phone size={12}/> {selectedUser.phone}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financial Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { title: 'Total Investment Staked', value: `$${Number(selectedUser.totalInvestment || 0).toFixed(2)}`, color: 'text-emerald-400' },
                      { title: 'Available Balance', value: `$${Number(selectedUser.availableBalance || 0).toFixed(2)}`, color: 'text-[#00C6FF]' },
                      { title: 'Copy Trade ROI', value: `$${Number(selectedUser.miningIncome || 0).toFixed(2)}`, color: 'text-[#A020F0]' },
                      { title: 'Referral & Level Income', value: `$${Number((selectedUser.referralIncome || 0) + (selectedUser.levelIncome || 0)).toFixed(2)}`, color: 'text-[#FF00FF]' },
                    ].map((stat, idx) => (
                      <div key={idx} className="bg-[#161B2A]/30 border border-gray-800 p-4 rounded-xl">
                        <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">{stat.title}</span>
                        <span className={`text-lg font-extrabold ${stat.color}`}>{stat.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* MLM Hierarchy Details */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Network & MLM Hierarchy</h4>
                    <div className="grid grid-cols-2 gap-4 bg-[#161B2A]/30 border border-gray-800 p-4 rounded-xl">
                      <div>
                        <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider">Sponsor ID</span>
                        <span className="text-sm font-semibold text-white font-mono">{selectedUser.sponsorId || 'None'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider">Current MLM Rank</span>
                        <span className="text-sm font-extrabold text-[#FF00FF] font-mono">{selectedUser.rank || 'L1'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider">Direct Referrals</span>
                        <span className="text-sm font-semibold text-white">{selectedUser.directTeam || 0} active</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Downline Team</span>
                        <span className="text-sm font-semibold text-white">{selectedUser.totalTeam || 0} users</span>
                      </div>
                      <div className="col-span-2 border-t border-gray-800 pt-3 mt-1">
                        <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider">Pins Count</span>
                        <span className="text-sm font-bold text-[#00C6FF]">{selectedUser.pins ?? 1} Pins</span>
                      </div>
                    </div>
                  </div>

                  {/* Account Status Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex justify-between items-center bg-[#161B2A]/30 border border-gray-800 p-4 rounded-xl">
                      <div>
                        <span className="block text-xs font-bold text-white">Login / Block Status</span>
                        <span className="text-[10px] text-gray-500">Block or unblock account.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleBlockToggle(selectedUser._id, selectedUser.isBlocked)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-colors border ${
                          selectedUser.isBlocked
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'
                        }`}
                      >
                        {selectedUser.isBlocked ? 'Unblock User' : 'Block User'}
                      </button>
                    </div>

                    <div className="flex justify-between items-center bg-[#161B2A]/30 border border-gray-800 p-4 rounded-xl">
                      <div>
                        <span className="block text-xs font-bold text-white">Activation Status</span>
                        <span className="text-[10px] text-gray-500">Toggle active or inactive status.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleActiveToggle(selectedUser._id, selectedUser.isActive)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-colors border ${
                          selectedUser.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/30'
                            : 'bg-gray-800 text-gray-400 border-gray-750 hover:bg-gray-700 hover:text-white'
                        }`}
                      >
                        {selectedUser.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Users;
