import React, { useState, useEffect } from 'react';
import { Network, Search, User, ChevronRight, Zap, ArrowLeft } from 'lucide-react';
import api from '../api';
import { toast } from 'react-toastify';

const Referrals = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [directs, setDirects] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/admin/users');
        setUsers(res.data);
        // Default to showing the first user's tree if available
        if (res.data.length > 0) {
          const first = res.data[0];
          setSelectedUser(first);
          setDirects(res.data.filter(u => u.sponsorId === first.userId));
        }
      } catch (error) {
        toast.error('Failed to load MLM user profiles');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchId) return;
    const found = users.find(u => u.userId?.toUpperCase() === searchId.trim().toUpperCase());
    if (found) {
      setSelectedUser(found);
      setDirects(users.filter(u => u.sponsorId === found.userId));
      setHistory([]);
      setSearchId('');
    } else {
      toast.error('No user found with that ID');
    }
  };

  const handleSelectUser = (user) => {
    if (selectedUser) {
      setHistory(prev => [...prev, selectedUser]);
    }
    setSelectedUser(user);
    setDirects(users.filter(u => u.sponsorId === user.userId));
  };

  const handleGoBack = () => {
    if (history.length === 0) return;
    const newHistory = [...history];
    const prevUser = newHistory.pop();
    setHistory(newHistory);
    setSelectedUser(prevUser);
    setDirects(users.filter(u => u.sponsorId === prevUser.userId));
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0B0F1A] border border-gray-800 p-6 rounded-3xl">
        <div>
          <h2 className="text-xl font-bold text-white">Referral Tree & Level Audits</h2>
          <p className="text-xs text-gray-500 mt-1">Audit sponsor trees, direct teams, and MLM hierarchy networks</p>
        </div>
        <form onSubmit={handleSearch} className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search User ID (e.g. CTCXXXX)..."
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#A020F0]"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-gradient-to-r from-[#A020F0] to-[#6A0DAD] hover:from-[#B026FF] text-white text-xs font-bold rounded-lg uppercase transition-all"
          >
            Search
          </button>
        </form>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[30vh]">
          <div className="w-10 h-10 border-4 border-[#A020F0] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : selectedUser ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Selected User details */}
          <div className="lg:col-span-1 bg-[#0B0F1A] border border-gray-800 rounded-3xl p-6 space-y-6">
            {history.length > 0 && (
              <button
                onClick={handleGoBack}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#FF00FF] font-bold transition-all pb-2 border-b border-gray-800/40 w-full"
              >
                <ArrowLeft size={14} /> Back to {history[history.length - 1].fullName}
              </button>
            )}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#A020F0]/10 border border-[#A020F0]/30 flex items-center justify-center text-[#FF00FF] font-bold text-lg uppercase">
                {selectedUser.fullName[0]}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">{selectedUser.fullName}</h3>
                <span className="block text-xs font-mono text-emerald-400 font-bold">{selectedUser.userId}</span>
              </div>
            </div>

            <div className="space-y-4 border-t border-gray-800/50 pt-4">
              <div>
                <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Direct Sponsor</span>
                <span className="text-xs font-semibold text-white font-mono">{selectedUser.sponsorId || 'None'}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Active Directs</span>
                  <span className="text-sm font-extrabold text-white">{selectedUser.directTeam || 0} users</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Total Team Size</span>
                  <span className="text-sm font-extrabold text-white">{selectedUser.totalTeam || 0} users</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Current Level</span>
                  <span className="text-sm font-extrabold text-white">L{selectedUser.level || 1}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Rank Title</span>
                  <span className="text-sm font-extrabold text-[#FF00FF] font-mono">{selectedUser.rank || 'L1'}</span>
                </div>
              </div>

              {/* Fastrack Details */}
              <div className="flex items-center justify-between p-3 bg-[#161B2A]/50 border border-gray-850 rounded-xl">
                <div>
                  <span className="block text-xs font-bold text-white flex items-center gap-1"><Zap size={14} className="text-amber-400" /> Fastrack Double ROI</span>
                  <span className="text-[10px] text-gray-500">Requires 5 directs of equal/larger size</span>
                </div>
                {selectedUser.fastrackQualified ? (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">Qualified</span>
                ) : (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-gray-800 text-gray-500 border border-gray-700 uppercase">Unqualified</span>
                )}
              </div>
            </div>
          </div>

          {/* Direct Referrals Network View */}
          <div className="lg:col-span-2 bg-[#0B0F1A] border border-gray-800 rounded-3xl p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <Network size={16} className="text-[#FF00FF]" />
              Downline Tree (Level 1 Referrals: {directs.length})
            </h3>
            {directs.length === 0 ? (
              <div className="h-[30vh] flex flex-col items-center justify-center text-center text-gray-500">
                <Network size={32} className="mb-2 text-[#A020F0]/50" />
                <p className="text-sm">No downline referrals found for this user.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800 max-h-[50vh] overflow-y-auto hide-scrollbar">
                {directs.map((d) => (
                  <div key={d._id} className="flex justify-between items-center py-3 hover:bg-[#161B2A]/20 px-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold text-xs uppercase">
                        {d.fullName[0]}
                      </div>
                      <div>
                        <span className="block text-sm font-semibold text-white">{d.fullName}</span>
                        <span className="block text-[10px] text-gray-500 font-mono">{d.userId}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="block text-[10px] text-gray-500 font-bold uppercase">Staked</span>
                        <span className="text-xs font-bold text-white">${Number(d.totalInvestment || 0).toLocaleString()}</span>
                      </div>
                      <button
                        onClick={() => handleSelectUser(d)}
                        className="p-1.5 bg-gray-850 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg border border-gray-750 transition-all"
                        title="Explore downline tree"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Referrals;
