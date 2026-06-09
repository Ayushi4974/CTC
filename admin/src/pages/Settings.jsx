import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Database, ShieldAlert, Sliders, Megaphone, Upload, Trash } from 'lucide-react';
import api from '../api';
import { toast } from 'react-toastify';

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  if (apiUrl) {
    const serverUrl = apiUrl.replace(/\/api$/, '');
    return `${serverUrl}${cleanPath}`;
  }
  return cleanPath;
};

const Settings = () => {
  const [settings, setSettings] = useState({
    minWithdrawalAmount: 10,
    maxDailyWithdrawalAmount: 10000,
    withdrawalCooldownHours: 24,
    emergencyThreshold: 5000,
    treasuryReserves: 25000,
    globalRoiMultiplier: 1.0,
    manualWithdrawalApproval: true,
    announcementImage: '',
    announcementImages: [],
    announcementContent: ''
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');

  const handleAddImage = (url) => {
    const trimmed = (url || '').trim();
    if (!trimmed) return;
    setSettings(prev => ({
      ...prev,
      announcementImages: [...(prev.announcementImages || []), trimmed]
    }));
    setNewImageUrl('');
  };

  const handleRemoveImage = (indexToRemove) => {
    setSettings(prev => ({
      ...prev,
      announcementImages: (prev.announcementImages || []).filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setUploading(true);
    try {
      const res = await api.post('/admin/upload-announcement', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (res.data && res.data.imageUrl) {
        setSettings(prev => ({
          ...prev,
          announcementImages: [...(prev.announcementImages || []), res.data.imageUrl]
        }));
        toast.success('Image uploaded and added successfully!');
      }
    } catch (error) {
      toast.error('Failed to upload image');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/admin/treasury/stats');
        if (res.data.settings) {
          setSettings({
            ...res.data.settings,
            announcementImages: res.data.settings.announcementImages || []
          });
        }
      } catch (error) {
        toast.error('Failed to load system settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value)
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.put('/admin/treasury/settings', settings);
      toast.success('System parameters updated successfully!');
    } catch (error) {
      toast.error('Failed to update system parameters');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[40vh]">
        <div className="w-10 h-10 border-4 border-[#A020F0] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* settings card form */}
      <div className="bg-[#0B0F1A] border border-gray-800 rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#A020F0]/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex justify-between items-center border-b border-gray-800/50 pb-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">System Settings Control</h3>
            <p className="text-xs text-gray-500 mt-1">Configure limits, emergency reserves, and withdrawal lock cooldowns</p>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 bg-gradient-to-r from-[#A020F0] to-[#6A0DAD] hover:from-[#B026FF] text-white px-4 py-2 rounded-xl text-sm font-bold tracking-wide uppercase transition-all shadow-[0_0_15px_rgba(160,32,240,0.3)]"
          >
            <Save size={16} />
            <span>Save Parameters</span>
          </button>
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1: limits */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sliders size={14} className="text-[#FF00FF]" />
              Withdrawal Limits & Lockouts
            </h4>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Min Withdrawal ($)</label>
              <input
                type="number"
                name="minWithdrawalAmount"
                value={settings.minWithdrawalAmount}
                onChange={handleChange}
                className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#A020F0]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Max Daily Withdrawal ($)</label>
              <input
                type="number"
                name="maxDailyWithdrawalAmount"
                value={settings.maxDailyWithdrawalAmount}
                onChange={handleChange}
                className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#A020F0]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Withdrawal Lockout Period (Hours)</label>
              <input
                type="number"
                name="withdrawalCooldownHours"
                value={settings.withdrawalCooldownHours}
                onChange={handleChange}
                className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#A020F0]"
              />
              <span className="block text-[10px] text-gray-500 mt-1">Prevents withdrawals for X hours after last package purchase or payout request.</span>
            </div>

            <div className="flex items-center gap-3 bg-[#161B2A]/40 border border-gray-800/40 p-4 rounded-xl">
              <input
                type="checkbox"
                id="manualWithdrawalApproval"
                name="manualWithdrawalApproval"
                checked={settings.manualWithdrawalApproval}
                onChange={handleChange}
                className="w-4 h-4 rounded border-gray-700 text-[#A020F0] focus:ring-[#A020F0] focus:ring-offset-0 bg-[#0B0F1A]"
              />
              <label htmlFor="manualWithdrawalApproval" className="text-xs font-bold text-gray-300 uppercase cursor-pointer select-none">
                Require Manual Admin Approval
              </label>
            </div>
          </div>

          {/* Section 2: reserves */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <Database size={14} className="text-[#FF00FF]" />
              Treasury Reserve Parameters
            </h4>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Current Staking Reserves ($)</label>
              <input
                type="number"
                name="treasuryReserves"
                value={settings.treasuryReserves}
                onChange={handleChange}
                className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#A020F0]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Emergency Reserves Threshold ($)</label>
              <input
                type="number"
                name="emergencyThreshold"
                value={settings.emergencyThreshold}
                onChange={handleChange}
                className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#A020F0]"
              />
              <span className="block text-[10px] text-gray-500 mt-1">Triggers emergency mode warnings if reserves drop below this limit.</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Global ROI Scaling Multiplier</label>
              <input
                type="number"
                step="0.1"
                name="globalRoiMultiplier"
                value={settings.globalRoiMultiplier}
                onChange={handleChange}
                className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#A020F0]"
              />
            </div>
          </div>

          {/* Section 3: Announcement Settings */}
          <div className="md:col-span-2 border-t border-gray-800/30 pt-6 mt-4 space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <Megaphone size={14} className="text-[#A020F0]" />
              User Announcement Popup Settings
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Announcement Images</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="Paste image URL here..."
                      className="flex-1 bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#A020F0]"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddImage(newImageUrl)}
                        className="bg-[#A020F0] hover:bg-[#b537ff] text-white px-4 py-3 rounded-xl text-xs font-bold transition-all select-none min-w-[90px]"
                      >
                        Add URL
                      </button>
                      <label className="flex items-center justify-center gap-2 bg-[#161B2A] hover:bg-[#1f263a] border border-gray-700/50 text-gray-300 px-4 py-3 rounded-xl text-xs font-bold cursor-pointer transition-all select-none min-w-[135px]">
                        <Upload size={14} />
                        <span>{uploading ? 'Uploading...' : 'Upload Image'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={uploading}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* List of active images */}
                  {(settings.announcementImages || []).length > 0 && (
                    <div className="space-y-2 mt-3 bg-[#161B2A]/40 border border-gray-800/40 p-4 rounded-xl max-h-[200px] overflow-y-auto hide-scrollbar">
                      <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Active Images ({(settings.announcementImages || []).length})</span>
                      <div className="grid grid-cols-1 gap-2">
                        {(settings.announcementImages || []).map((imgUrl, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-3 bg-[#0B0F1A] border border-gray-800/50 p-2 rounded-xl group">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={getImageUrl(imgUrl)}
                                alt={`Thumbnail ${idx + 1}`}
                                className="w-10 h-10 object-cover rounded-lg bg-gray-900 border border-gray-800/60"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'https://placehold.co/100x100/161B2A/A020F0?text=Error';
                                }}
                              />
                              <span className="text-[10px] text-gray-400 font-mono truncate select-all">{imgUrl}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                              title="Delete Image"
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <span className="block text-[10px] text-gray-500 mt-2">
                    Add image URLs or upload files (PNG/JPG/GIF/WebP) to show in a scrollable format in the user dashboard announcement popup.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Announcement Message Content (Optional)</label>
                  <textarea
                    name="announcementContent"
                    value={settings.announcementContent || ''}
                    onChange={handleChange}
                    placeholder="Enter announcement text or description here..."
                    rows={3}
                    className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#A020F0] resize-none"
                  />
                  <span className="block text-[10px] text-gray-500 mt-1">
                    Optionally write a text announcement. Both the image and text are optional, and will render together or individually based on what is configured. Leave both blank to disable the popup.
                  </span>
                </div>
              </div>
              
              <div className="flex flex-col gap-3 bg-[#161B2A]/40 border border-gray-800/40 p-4 rounded-xl min-h-[120px] justify-center">
                {(settings.announcementImages || []).length > 0 && (
                  <div className="space-y-2">
                    <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider">Scrollable Image Preview</span>
                    <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                      {(settings.announcementImages || []).map((imgUrl, idx) => (
                        <div key={idx} className="relative shrink-0 w-24 h-20 flex items-center justify-center overflow-hidden rounded-lg bg-[#0B0F1A] border border-gray-800/30 p-1">
                          <img
                            src={getImageUrl(imgUrl)}
                            alt={`Preview ${idx + 1}`}
                            className="max-h-full max-w-full object-contain rounded"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://placehold.co/400x250/161B2A/A020F0?text=Invalid';
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {settings.announcementContent && (
                  <div className="bg-[#0B0F1A] border border-gray-800/30 rounded-lg p-2.5 max-w-full text-[10px] text-gray-300 font-medium overflow-hidden text-ellipsis line-clamp-3">
                    {settings.announcementContent}
                  </div>
                )}
                {!(settings.announcementImages || []).length && !settings.announcementContent && (
                  <div className="text-center text-xs text-gray-500 py-4">
                    <p>No Announcement Active</p>
                    <span className="text-[10px]">Configure images or text to preview</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
