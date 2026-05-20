import React, { useState, useEffect } from 'react';
import { Search, Eye, ShieldAlert, ShieldCheck, Mail, Phone, Calendar, ArrowRight } from 'lucide-react';
import api from '../api';
import { toast } from 'react-toastify';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);

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

  const filteredUsers = users.filter(user => 
    user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.userId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0B0F1A] border border-gray-800 p-6 rounded-3xl">
        <div>
          <h2 className="text-xl font-bold text-white">Registered Users ({filteredUsers.length})</h2>
          <p className="text-xs text-gray-500 mt-1">Audit profile settings, balances, and block statuses</p>
        </div>
        <div className="relative w-full sm:w-80">
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
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-[#161B2A]/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{user.fullName}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-emerald-400">{user.userId}</td>
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
                        onClick={() => setSelectedUser(user)}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#0B0F1A] border border-[#A020F0]/30 rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#A020F0]/10 rounded-full blur-2xl"></div>
            
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#161B2A]/30">
              <div>
                <h3 className="text-lg font-bold text-white">Detailed User Profile</h3>
                <p className="text-xs text-gray-500">ID: {selectedUser.userId}</p>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="px-3 py-1 bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto hide-scrollbar">
              {/* Profile Card Summary */}
              <div className="flex items-center gap-4 bg-[#161B2A]/50 border border-gray-800 p-4 rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-[#A020F0]/10 flex items-center justify-center text-[#FF00FF] font-bold text-lg">
                  {selectedUser.fullName[0]}
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
                </div>
              </div>

              {/* Account Status Settings */}
              <div className="flex justify-between items-center bg-[#161B2A]/30 border border-gray-800 p-4 rounded-xl">
                <div>
                  <span className="block text-xs font-bold text-white">Status controls</span>
                  <span className="text-[10px] text-gray-500">Block or unblock account from login and staking.</span>
                </div>
                <button
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
