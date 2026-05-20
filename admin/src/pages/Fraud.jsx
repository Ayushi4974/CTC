import React, { useState, useEffect } from 'react';
import { ShieldAlert, User, Database, AlertCircle, ShieldCheck } from 'lucide-react';
import api from '../api';
import { toast } from 'react-toastify';

const Fraud = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (error) {
      toast.error('Failed to load user records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleBlockUser = async (id, currentBlocked) => {
    try {
      await api.put(`/admin/user/${id}/block`);
      toast.success(`User block status updated successfully`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user block status');
    }
  };

  // Fraud detection helper: find matching wallet addresses or matching IP addresses
  const duplicateWallets = users.reduce((acc, user) => {
    if (!user.walletAddress) return acc;
    const key = user.walletAddress.toLowerCase().trim();
    if (!acc[key]) acc[key] = [];
    acc[key].push(user);
    return acc;
  }, {});

  const duplicateIps = users.reduce((acc, user) => {
    if (!user.ipAddress) return acc;
    const key = user.ipAddress.trim();
    if (!acc[key]) acc[key] = [];
    acc[key].push(user);
    return acc;
  }, {});

  const flaggedWallets = Object.keys(duplicateWallets).filter(k => duplicateWallets[k].length > 1);
  const flaggedIps = Object.keys(duplicateIps).filter(k => duplicateIps[k].length > 1);

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-[#0B0F1A] border border-gray-800 p-6 rounded-3xl">
        <h2 className="text-xl font-bold text-white">Fraud & Risk Control Center</h2>
        <p className="text-xs text-gray-500 mt-1">Identifies matching device fingerprints, wallet reuse, and circular referrals</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[30vh]">
          <div className="w-10 h-10 border-4 border-[#A020F0] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section 1: Wallet Address Reuse */}
          <div className="bg-[#0B0F1A] border border-gray-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <AlertCircle className="text-[#FF00FF]" size={16} />
              Reused Wallet Addresses ({flaggedWallets.length})
            </h3>

            {flaggedWallets.length === 0 ? (
              <div className="text-sm text-gray-500 py-6 text-center">No wallet reuse flags found. Accounts look safe.</div>
            ) : (
              <div className="space-y-4 max-h-[50vh] overflow-y-auto hide-scrollbar">
                {flaggedWallets.map((wallet) => (
                  <div key={wallet} className="bg-[#161B2A]/50 border border-gray-850 p-4 rounded-2xl space-y-3">
                    <div className="text-xs text-gray-400 font-mono select-all bg-gray-800/50 px-2 py-0.5 rounded inline-block">{wallet}</div>
                    <div className="space-y-2">
                      {duplicateWallets[wallet].map((u) => (
                        <div key={u._id} className="flex justify-between items-center text-xs">
                          <div>
                            <span className="font-semibold text-white block">{u.fullName}</span>
                            <span className="text-[10px] text-gray-500 font-mono">{u.userId}</span>
                          </div>
                          <button
                            onClick={() => handleBlockUser(u._id, u.isBlocked)}
                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase border transition-all ${
                              u.isBlocked 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' 
                                : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'
                            }`}
                          >
                            {u.isBlocked ? 'Unblock' : 'Block User'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Shared IP Addresses */}
          <div className="bg-[#0B0F1A] border border-gray-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <AlertCircle className="text-[#FF00FF]" size={16} />
              Reused Network IPs ({flaggedIps.length})
            </h3>

            {flaggedIps.length === 0 ? (
              <div className="text-sm text-gray-500 py-6 text-center">No shared network IP addresses flagged.</div>
            ) : (
              <div className="space-y-4 max-h-[50vh] overflow-y-auto hide-scrollbar">
                {flaggedIps.map((ip) => (
                  <div key={ip} className="bg-[#161B2A]/50 border border-gray-850 p-4 rounded-2xl space-y-3">
                    <div className="text-xs text-gray-400 font-mono select-all bg-gray-800/50 px-2 py-0.5 rounded inline-block">IP: {ip}</div>
                    <div className="space-y-2">
                      {duplicateIps[ip].map((u) => (
                        <div key={u._id} className="flex justify-between items-center text-xs">
                          <div>
                            <span className="font-semibold text-white block">{u.fullName}</span>
                            <span className="text-[10px] text-gray-500 font-mono">{u.userId}</span>
                          </div>
                          <button
                            onClick={() => handleBlockUser(u._id, u.isBlocked)}
                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase border transition-all ${
                              u.isBlocked 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' 
                                : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'
                            }`}
                          >
                            {u.isBlocked ? 'Unblock' : 'Block User'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Fraud;
