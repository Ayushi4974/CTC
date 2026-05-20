import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Save, Trash, AlertTriangle, Eye, ShieldCheck, Zap } from 'lucide-react';
import api from '../api';
import { toast } from 'react-toastify';

const Packages = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(null); // packageId being edited
  const [isCreating, setIsCreating] = useState(false);
  
  const [newPackage, setNewPackage] = useState({
    name: '',
    minAmount: '',
    maxAmount: '',
    dailyProfitPercent: '',
    isReferralOnly: false,
    status: true
  });

  const [editPackage, setEditPackage] = useState({});

  const fetchPackages = async () => {
    try {
      const res = await api.get('/admin/packages');
      setPackages(res.data);
    } catch (error) {
      toast.error('Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newPackage.name || !newPackage.minAmount || !newPackage.maxAmount || !newPackage.dailyProfitPercent) {
      return toast.error('Please fill in all details');
    }
    try {
      await api.post('/admin/package/create', {
        ...newPackage,
        minAmount: Number(newPackage.minAmount),
        maxAmount: Number(newPackage.maxAmount),
        dailyProfitPercent: Number(newPackage.dailyProfitPercent),
      });
      toast.success('Staking package created successfully');
      setIsCreating(false);
      setNewPackage({ name: '', minAmount: '', maxAmount: '', dailyProfitPercent: '', isReferralOnly: false, status: true });
      fetchPackages();
    } catch (error) {
      toast.error('Failed to create package');
    }
  };

  const handleEditClick = (pkg) => {
    setIsEditing(pkg._id);
    setEditPackage({ ...pkg });
  };

  const handleSaveEdit = async () => {
    try {
      await api.put(`/admin/package/${editPackage._id}`, {
        ...editPackage,
        minAmount: Number(editPackage.minAmount),
        maxAmount: Number(editPackage.maxAmount),
        dailyProfitPercent: Number(editPackage.dailyProfitPercent),
      });
      toast.success('Package updated successfully');
      setIsEditing(null);
      fetchPackages();
    } catch (error) {
      toast.error('Failed to update package');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header card with Create button */}
      <div className="flex justify-between items-center bg-[#0B0F1A] border border-gray-800 p-6 rounded-3xl">
        <div>
          <h2 className="text-xl font-bold text-white">Staking Packages ({packages.length})</h2>
          <p className="text-xs text-gray-500 mt-1">Configure entry thresholds, profit rates, and referral locks</p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 bg-gradient-to-r from-[#A020F0] to-[#6A0DAD] hover:from-[#B026FF] text-white px-4 py-2.5 rounded-xl text-sm font-bold tracking-wide uppercase shadow-[0_0_15px_rgba(160,32,240,0.3)] transition-all active:scale-95"
        >
          <Plus size={16} />
          <span>{isCreating ? 'Cancel' : 'Create Package'}</span>
        </button>
      </div>

      {/* Package Creation Form */}
      {isCreating && (
        <form onSubmit={handleCreate} className="bg-[#0B0F1A] border border-[#A020F0]/30 p-6 rounded-3xl grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Create Staking Package</h3>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Package Name</label>
            <input
              type="text"
              placeholder="e.g. SOS Package 1"
              value={newPackage.name}
              onChange={e => setNewPackage({ ...newPackage, name: e.target.value })}
              className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#A020F0]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Min Amount ($)</label>
            <input
              type="number"
              placeholder="e.g. 100"
              value={newPackage.minAmount}
              onChange={e => setNewPackage({ ...newPackage, minAmount: e.target.value })}
              className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#A020F0]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Max Amount ($)</label>
            <input
              type="number"
              placeholder="e.g. 1000"
              value={newPackage.maxAmount}
              onChange={e => setNewPackage({ ...newPackage, maxAmount: e.target.value })}
              className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#A020F0]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Daily Profit Rate (%)</label>
            <input
              type="number"
              step="0.01"
              placeholder="e.g. 0.50"
              value={newPackage.dailyProfitPercent}
              onChange={e => setNewPackage({ ...newPackage, dailyProfitPercent: e.target.value })}
              className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#A020F0]"
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="isReferralOnly"
              checked={newPackage.isReferralOnly}
              onChange={e => setNewPackage({ ...newPackage, isReferralOnly: e.target.checked })}
              className="w-4 h-4 text-[#A020F0] border-gray-700 bg-gray-900 rounded focus:ring-0 focus:ring-offset-0"
            />
            <label htmlFor="isReferralOnly" className="text-xs font-bold text-gray-400 uppercase cursor-pointer">Sponsor Referral Lock ($20 entry)</label>
          </div>
          <div className="flex items-end justify-end">
            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl text-sm uppercase tracking-wide transition-colors"
            >
              Confirm Creation
            </button>
          </div>
        </form>
      )}

      {/* Packages List Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-[30vh]">
          <div className="w-10 h-10 border-4 border-[#A020F0] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => {
            const isEditingThis = isEditing === pkg._id;
            return (
              <div
                key={pkg._id}
                className={`bg-[#0B0F1A] border rounded-3xl p-6 relative overflow-hidden transition-all duration-300 ${
                  isEditingThis ? 'border-[#A020F0]' : 'border-gray-800'
                }`}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-transparent to-white/[0.005] pointer-events-none"></div>

                <div className="flex justify-between items-start mb-6">
                  <div>
                    {isEditingThis ? (
                      <input
                        type="text"
                        value={editPackage.name}
                        onChange={e => setEditPackage({ ...editPackage, name: e.target.value })}
                        className="bg-gray-800 text-white text-base font-bold rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#A020F0] w-full"
                      />
                    ) : (
                      <h3 className="text-lg font-extrabold text-white">{pkg.name}</h3>
                    )}
                    <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Staking Tier</span>
                  </div>
                  <div className="flex gap-1.5">
                    {isEditingThis ? (
                      <button 
                        onClick={handleSaveEdit}
                        className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors"
                      >
                        <Save size={14} />
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleEditClick(pkg)}
                        className="p-2 bg-gray-800 text-gray-400 border border-gray-700/50 rounded-lg hover:text-white transition-colors"
                      >
                        <Edit3 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center py-2 border-b border-gray-800/30">
                    <span className="text-xs text-gray-400 font-medium">Staking Thresholds</span>
                    {isEditingThis ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={editPackage.minAmount}
                          onChange={e => setEditPackage({ ...editPackage, minAmount: e.target.value })}
                          className="w-16 bg-gray-800 text-white text-xs font-bold text-center rounded py-0.5 focus:outline-none"
                        />
                        <span className="text-xs text-gray-500">-</span>
                        <input
                          type="number"
                          value={editPackage.maxAmount}
                          onChange={e => setEditPackage({ ...editPackage, maxAmount: e.target.value })}
                          className="w-16 bg-gray-800 text-white text-xs font-bold text-center rounded py-0.5 focus:outline-none"
                        />
                      </div>
                    ) : (
                      <span className="text-sm font-black text-white font-mono">${pkg.minAmount} - ${pkg.maxAmount}</span>
                    )}
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-gray-800/30">
                    <span className="text-xs text-gray-400 font-medium">Daily ROI Earning</span>
                    {isEditingThis ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editPackage.dailyProfitPercent}
                        onChange={e => setEditPackage({ ...editPackage, dailyProfitPercent: e.target.value })}
                        className="w-16 bg-gray-800 text-white text-xs font-bold text-center rounded py-0.5 focus:outline-none"
                      />
                    ) : (
                      <span className="text-sm font-black text-emerald-400 font-mono">+{pkg.dailyProfitPercent}%</span>
                    )}
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-gray-800/30">
                    <span className="text-xs text-gray-400 font-medium">Cap Multiplier</span>
                    <span className="text-xs font-bold text-[#FF00FF] uppercase tracking-wider">4.0x Global Cap</span>
                  </div>
                </div>

                {/* Flags */}
                <div className="flex flex-wrap gap-2">
                  {pkg.isReferralOnly && (
                    <div className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
                      <Zap size={10} /> Referral Only ($20 Entry)
                    </div>
                  )}
                  {pkg.status ? (
                    <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
                      <ShieldCheck size={10} /> Available
                    </div>
                  ) : (
                    <div className="px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
                      <AlertTriangle size={10} /> Suspended
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Packages;
