import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Mail, Phone, MapPin, Calendar, Link as LinkIcon, 
  Copy, Check, Shield, KeyRound, Wallet, Edit3, ShieldCheck, QrCode
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProfile } from '../redux/slices/authSlice';
import { useEffect } from 'react';
import api from '../api';
import { toast } from 'react-toastify';

const InputField = ({ label, value, icon: Icon, fullWidth = false, colorClass = "text-[#A020F0]", editable = false, type = "text", name, onChange }) => (
  <div className={`group relative bg-[#161B2A]/40 backdrop-blur-[12px] rounded-xl p-4 transition-all duration-300 ${!editable ? 'hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(160,32,240,0.1)]' : ''} overflow-hidden ${fullWidth ? 'col-span-1 md:col-span-2' : 'col-span-1'}`}>
    <div className="absolute inset-0 rounded-xl border border-transparent bg-gradient-to-br from-[#A020F0]/30 via-transparent to-transparent pointer-events-none" style={{ WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude', padding: '1px' }}></div>
    <div className="flex flex-col relative z-10 w-full">
      <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
        <Icon size={12} className={`${colorClass} drop-shadow-[0_0_5px_currentColor]`} /> {label}
      </label>
      {editable ? (
        type === "textarea" ? (
          <textarea
            name={name}
            value={value}
            onChange={onChange}
            rows={2}
            className="bg-[#0B0F1A]/60 border border-gray-800 focus:border-[#A020F0] focus:ring-1 focus:ring-[#A020F0] rounded-lg px-3 py-2 text-sm text-white focus:outline-none w-full transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
          />
        ) : (
          <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            className="bg-[#0B0F1A]/60 border border-gray-800 focus:border-[#A020F0] focus:ring-1 focus:ring-[#A020F0] rounded-lg px-3 py-2 text-sm text-white focus:outline-none w-full transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
          />
        )
      ) : (
        <div className="text-sm md:text-base font-bold text-white tracking-wide break-all w-full">{value}</div>
      )}
    </div>
  </div>
);

const Profile = () => {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const dispatch = useDispatch();
  const { profile, user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  const currentUser = profile || user;

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    address: ''
  });

  // Password Change State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setEditData({
        fullName: currentUser.fullName || '',
        email: currentUser.email || '',
        mobile: currentUser.mobile || '',
        address: currentUser.address || ''
      });
    }
  }, [currentUser]);

  const handleEditChange = (e) => {
    setEditData({
      ...editData,
      [e.target.name]: e.target.value
    });
  };

  const handleSaveProfile = async () => {
    if (!editData.fullName || !editData.email) {
      toast.error('Name and Email are required');
      return;
    }
    try {
      const response = await api.put('/user/profile', editData);
      toast.success(response.data.message || 'Profile updated successfully!');
      dispatch(fetchProfile());
      setIsEditing(false);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to update profile');
    }
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('All fields are required');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setIsSavingPassword(true);
      await api.put('/user/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      toast.success('Password updated successfully!');
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to change password');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const profileData = {
    initial: currentUser?.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U',
    name: currentUser?.fullName || 'User',
    email: currentUser?.email || 'N/A',
    mobile: currentUser?.mobile || 'Not set',
    address: currentUser?.address || 'Not set',
    memberSince: currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : 'N/A',
    referralLink: currentUser?.userId ? `${window.location.origin}/register?ref=${currentUser.userId}` : 'N/A',
    isKYCVerified: currentUser?.isKYCVerified || false
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileData.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-12 pt-4 px-4 sm:px-6 lg:px-8 box-border">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 md:gap-6 mb-8 w-full">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-3xl font-extrabold text-white tracking-tight"
        >
          Profile
        </motion.h1>
        
        {isEditing ? (
          <div className="flex gap-3 w-full md:w-auto">
            <motion.button 
              onClick={handleSaveProfile}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 md:flex-none bg-gradient-to-r from-[#00FF99] to-[#00C6FF] text-black px-5 py-2.5 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(0,255,153,0.4)] hover:shadow-[0_0_25px_rgba(0,198,255,0.6)] transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
            >
              Save Changes
            </motion.button>
            <motion.button 
              onClick={() => {
                setIsEditing(false);
                setEditData({
                  fullName: currentUser?.fullName || '',
                  email: currentUser?.email || '',
                  mobile: currentUser?.mobile || '',
                  address: currentUser?.address || ''
                });
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 md:flex-none bg-gray-800 text-white border border-gray-700 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-700 transition-all flex items-center justify-center gap-2"
            >
              Cancel
            </motion.button>
          </div>
        ) : (
          <motion.button 
            onClick={() => setIsEditing(true)}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full md:w-auto bg-gradient-to-r from-[#00C6FF] to-[#A020F0] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(0,198,255,0.4)] hover:shadow-[0_0_25px_rgba(160,32,240,0.6)] transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
          >
            <Edit3 size={16} /> Edit Profile
          </motion.button>
        )}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#0B0F1A]/80 backdrop-blur-xl border border-gray-800/60 rounded-3xl p-6 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
      >
        {/* User Top Section */}
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 mb-10 w-full">
          <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4 sm:gap-6">
            
            {/* Dynamic Avatar with Glowing Outer Ring */}
            <div className="relative shrink-0">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#A020F0] to-[#FF00FF] rounded-full blur-sm opacity-70 animate-pulse"></div>
              <div className="w-20 h-20 rounded-full bg-[#050505] p-[3px] relative z-10">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-[#00C6FF] to-[#A020F0] flex items-center justify-center text-3xl font-black text-white shadow-[inset_0_0_20px_rgba(255,255,255,0.2)]">
                  {profileData.initial}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center sm:items-start">
              <h2 className="text-2xl font-black text-white mb-2 flex items-center gap-2 tracking-tight">
                {profileData.name}
                {profileData.isKYCVerified && (
                  <div className="bg-[#00FF99]/10 border border-[#00FF99]/30 rounded-full p-1" title="Verified KYC">
                    <ShieldCheck size={14} className="text-[#00FF99] drop-shadow-[0_0_5px_rgba(0,255,153,0.5)]" />
                  </div>
                )}
              </h2>
              
              {/* Wallet Connected Status */}
              <div className="inline-flex items-center gap-2 bg-[#161B2A] border border-[#A020F0]/30 px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-[0_0_10px_rgba(160,32,240,0.1)]">
                <span className="text-[#A020F0]">User ID:</span>
                <span className="text-gray-300 font-mono">{currentUser?.userId || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section Divider */}
        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-gray-700 to-transparent my-8"></div>

        {/* Personal Information */}
        <div className="mb-10 relative">
          {/* Subtle background aura */}
          <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-[#00C6FF]/5 rounded-full blur-3xl -translate-y-1/2 pointer-events-none"></div>

          <h3 className="text-[#00C6FF] font-bold text-sm mb-6 drop-shadow-[0_0_5px_rgba(0,198,255,0.4)] flex items-center gap-2 relative z-10 uppercase tracking-widest">
            <User size={16} /> Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
            <InputField 
              label="Full Name" 
              value={isEditing ? editData.fullName : profileData.name} 
              icon={User} 
              colorClass="text-[#00C6FF]" 
              editable={isEditing}
              name="fullName"
              onChange={handleEditChange}
            />
            <InputField 
              label="Email" 
              value={isEditing ? editData.email : profileData.email} 
              icon={Mail} 
              colorClass="text-[#A020F0]" 
              editable={isEditing}
              name="email"
              onChange={handleEditChange}
            />
            <InputField 
              label="Mobile" 
              value={isEditing ? editData.mobile : profileData.mobile} 
              icon={Phone} 
              colorClass="text-[#FF00FF]" 
              editable={isEditing}
              name="mobile"
              onChange={handleEditChange}
            />
            <InputField 
              label="Address" 
              value={isEditing ? editData.address : profileData.address} 
              icon={MapPin} 
              colorClass="text-[#00FF99]" 
              fullWidth 
              editable={isEditing}
              type="textarea"
              name="address"
              onChange={handleEditChange}
            />
            <InputField 
              label="Member Since" 
              value={profileData.memberSince} 
              icon={Calendar} 
              colorClass="text-yellow-500" 
            />
          </div>
        </div>

        {/* Section Divider */}
        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#A020F0]/30 to-transparent my-8 shadow-[0_0_15px_rgba(160,32,240,0.3)]"></div>

        {/* Referral Link */}
        <div className="mb-12 relative">
          {/* High-Impact Aura Glow */}
          <div className="absolute inset-0 bg-[#A020F0]/5 rounded-2xl blur-2xl pointer-events-none"></div>

          <h3 className="text-[#A020F0] font-bold text-sm mb-6 drop-shadow-[0_0_5px_rgba(160,32,240,0.4)] flex items-center gap-2 relative z-10 uppercase tracking-widest">
            <LinkIcon size={16} /> Referral Link
          </h3>
          
          <div className="bg-[#161B2A]/60 backdrop-blur-[12px] border border-[#A020F0]/40 rounded-xl p-3 pl-4 md:pl-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 group hover:border-[#A020F0]/80 hover:shadow-[0_0_20px_rgba(160,32,240,0.15)] transition-all relative z-10 w-full overflow-hidden box-border">
            <div className="flex-1 w-full">
              <label className="block text-[10px] font-bold text-[#A020F0] uppercase tracking-widest mb-1 mt-1 md:mt-0">Your Unique Link</label>
              <div className="text-xs sm:text-sm font-mono text-gray-200 break-all pb-1 md:pb-0 tracking-wide w-full">{profileData.referralLink}</div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
              <button 
                onClick={() => setShowQr(!showQr)}
                className="flex-1 sm:flex-none bg-[#050505] text-[#00C6FF] border border-[#00C6FF]/40 px-4 py-3 rounded-lg text-sm font-bold hover:bg-[#00C6FF]/10 hover:shadow-[0_0_10px_rgba(0,198,255,0.2)] transition-all flex items-center justify-center"
                title="Generate QR Code"
              >
                <QrCode size={18} />
              </button>
              
              <button 
                onClick={handleCopyLink}
                className="flex-[2] sm:flex-none bg-gradient-to-r from-[#00C6FF] to-[#A020F0] text-white px-6 py-3 rounded-lg text-sm font-bold shadow-md hover:shadow-[0_0_20px_rgba(160,32,240,0.5)] transition-all flex items-center justify-center gap-2 relative overflow-hidden"
              >
                {copied && <div className="absolute inset-0 bg-[#00FF99]/20 animate-pulse"></div>}
                {copied ? <Check size={16} className="text-[#00FF99] drop-shadow-[0_0_5px_currentColor] relative z-10" /> : <Copy size={16} className="relative z-10" />} 
                <span className="relative z-10">{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
          
          {/* Mock QR Code Dropdown */}
          <AnimatePresence>
            {showQr && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-4 flex justify-center md:justify-end relative z-10"
              >
                <div className="bg-white p-3 rounded-xl border border-gray-700 shadow-[0_0_30px_rgba(0,198,255,0.2)]">
                  <div className="w-32 h-32 bg-white rounded flex items-center justify-center">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${encodeURIComponent(profileData.referralLink)}`} 
                      alt="Referral QR Code" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Security Actions */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 relative z-10 w-full">
          
          <button 
            onClick={() => setShowPasswordModal(true)}
            className="flex-1 group bg-gradient-to-r from-[#A020F0] to-[#00C6FF] text-white py-3.5 sm:py-4 rounded-xl font-bold shadow-[0_0_15px_rgba(160,32,240,0.3)] hover:shadow-[0_0_30px_rgba(0,198,255,0.5)] hover:-translate-y-1 transition-all flex items-center justify-center gap-3 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <KeyRound size={20} className="relative z-10 drop-shadow-md" /> 
            <span className="relative z-10 text-sm sm:text-base">Change Password</span>
          </button>
          
          <button className="flex-1 group bg-[#161B2A]/80 backdrop-blur-md border border-[#00FF99]/40 py-3.5 sm:py-4 rounded-xl font-bold hover:bg-[#00FF99]/10 hover:border-[#00FF99] transition-all duration-300 flex items-center justify-between px-5 sm:px-6 shadow-[inset_0_0_15px_rgba(0,255,153,0.05)] hover:shadow-[0_0_20px_rgba(0,255,153,0.2)] hover:-translate-y-1">
            <div className="flex items-center gap-3 text-[#00FF99]">
              <Shield size={20} className="drop-shadow-[0_0_5px_currentColor]" />
              <span className="text-white text-sm sm:text-base">2FA</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-[#00FF99] font-black drop-shadow-[0_0_5px_rgba(0,255,153,0.5)]">Enabled</span>
              <div className="w-2 h-2 rounded-full bg-[#00FF99] animate-pulse"></div>
            </div>
          </button>
          
        </div>

      </motion.div>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#0B0F1A] border border-gray-800/80 rounded-3xl p-6 md:p-8 shadow-[0_20px_50px_rgba(160,32,240,0.2)] overflow-hidden"
            >
              {/* Decorative aura */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#A020F0]/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <h3 className="text-xl font-extrabold text-white mb-6 flex items-center gap-2">
                <KeyRound size={20} className="text-[#A020F0]" /> Change Password
              </h3>

              <form onSubmit={handleSavePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Current Password</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className="bg-[#161B2A]/60 border border-gray-800 focus:border-[#A020F0] focus:ring-1 focus:ring-[#A020F0] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none w-full transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="bg-[#161B2A]/60 border border-gray-800 focus:border-[#A020F0] focus:ring-1 focus:ring-[#A020F0] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none w-full transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="bg-[#161B2A]/60 border border-gray-800 focus:border-[#A020F0] focus:ring-1 focus:ring-[#A020F0] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none w-full transition-all"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSavingPassword}
                    className="flex-1 bg-gradient-to-r from-[#A020F0] to-[#00C6FF] text-white py-2.5 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(160,32,240,0.3)] hover:shadow-[0_0_20px_rgba(0,198,255,0.4)] transition-all disabled:opacity-50"
                  >
                    {isSavingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                    className="flex-1 bg-gray-800 text-white border border-gray-700 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-700 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
