import React, { useState, useEffect } from 'react';
import { UserCheck, ShieldAlert, FileText, Check, X, Search, Clock, CheckCircle2, XCircle } from 'lucide-react';
import api from '../api';
import { toast } from 'react-toastify';

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    const serverUrl = apiUrl.replace(/\/api$/, '');
    return `${serverUrl}${cleanPath}`;
  }
  return cleanPath;
};

const STATUS_TABS = [
  { key: 'pending',  label: 'Pending',  icon: Clock,          color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  activeBg: 'bg-amber-500/20'  },
  { key: 'approved', label: 'Approved', icon: CheckCircle2,   color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', activeBg: 'bg-emerald-500/20' },
  { key: 'rejected', label: 'Rejected', icon: XCircle,        color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    activeBg: 'bg-red-500/20'    },
];

const Kyc = () => {
  const [kycs, setKycs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeKyc, setActiveKyc] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Reset page + selection when tab or search changes
  useEffect(() => {
    setCurrentPage(1);
    setActiveKyc(null);
  }, [activeTab, searchTerm]);

  const fetchKycs = async () => {
    try {
      const res = await api.get('/admin/kycs');
      setKycs(res.data);
    } catch (error) {
      toast.error('Failed to load KYC lists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKycs();
  }, []);

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this KYC verification?')) return;
    try {
      const res = await api.put(`/admin/kyc/${id}/approve`);
      toast.success('KYC Approved successfully!');
      fetchKycs();
      if (res.data && res.data.kyc) {
        setActiveKyc(prev => prev ? { ...prev, status: 'approved' } : null);
      } else {
        setActiveKyc(null);
      }
    } catch (error) {
      toast.error('Failed to approve KYC');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Reject this KYC verification?')) return;
    try {
      const res = await api.put(`/admin/kyc/${id}/reject`);
      toast.success('KYC Rejected successfully');
      fetchKycs();
      if (res.data && res.data.kyc) {
        setActiveKyc(prev => prev ? { ...prev, status: 'rejected' } : null);
      } else {
        setActiveKyc(null);
      }
    } catch (error) {
      toast.error('Failed to reject KYC');
    }
  };

  // Tab counts
  const tabCounts = {
    pending:  kycs.filter(k => k.status === 'pending').length,
    approved: kycs.filter(k => k.status === 'approved').length,
    rejected: kycs.filter(k => k.status === 'rejected').length,
  };

  // Filter by active tab + search term
  const filteredKycs = kycs.filter(k =>
    k.status === activeTab &&
    (
      (k.userId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (k.user?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (k.bankName || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Pagination calculation
  const totalItems = filteredKycs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentKycs = filteredKycs.slice(startIndex, endIndex);

  const activeTabMeta = STATUS_TABS.find(t => t.key === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0B0F1A] border border-gray-800 p-6 rounded-3xl">
        <div>
          <h2 className="text-xl font-bold text-white">KYC Verification Inbox</h2>
          <p className="text-xs text-gray-500 mt-1">Verify user-submitted IDs, address bills, and bank accounts</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            placeholder="Search by ID, name, or document..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#A020F0]"
          />
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-2 bg-[#0B0F1A] border border-gray-800 p-2 rounded-2xl overflow-x-auto hide-scrollbar">
        {STATUS_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 shrink-0 whitespace-nowrap flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                isActive
                  ? `${tab.activeBg} ${tab.color} border ${tab.border} shadow-inner`
                  : 'text-gray-500 hover:text-gray-300 hover:bg-[#161B2A]/40'
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black min-w-[20px] text-center ${
                isActive ? `${tab.bg} ${tab.color}` : 'bg-gray-800/60 text-gray-500'
              }`}>
                {tabCounts[tab.key]}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[30vh]">
          <div className="w-10 h-10 border-4 border-[#A020F0] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* KYC List */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
              {activeTabMeta?.label} Applications
              <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-black ${activeTabMeta?.bg} ${activeTabMeta?.color}`}>
                {totalItems}
              </span>
            </h3>
            {filteredKycs.length === 0 ? (
              <div className="bg-[#0B0F1A] border border-gray-800 rounded-3xl p-8 text-center">
                <div className={`w-12 h-12 rounded-full ${activeTabMeta?.bg} flex items-center justify-center mx-auto mb-3`}>
                  {activeTabMeta && <activeTabMeta.icon size={20} className={activeTabMeta.color} />}
                </div>
                <p className="text-gray-500 text-sm font-medium">No {activeTab} KYC requests</p>
                <p className="text-gray-600 text-xs mt-1">
                  {activeTab === 'pending' ? 'All applications have been reviewed.' : `No ${activeTab} applications yet.`}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {currentKycs.map((k) => {
                    const isActive = activeKyc?._id === k._id;
                    return (
                      <button
                        key={k._id}
                        onClick={() => setActiveKyc(k)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 ${
                          isActive
                            ? 'bg-[#161B2A] border-[#A020F0]/50 shadow-[0_0_15px_rgba(160,32,240,0.1)]'
                            : 'bg-[#0B0F1A] border-gray-800 hover:border-gray-700 hover:bg-[#161B2A]/20'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-extrabold text-white text-sm truncate pr-2">{k.user?.fullName || 'User Profile'}</span>
                          <span className={`shrink-0 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            k.status === 'pending'
                              ? 'bg-amber-500/10 text-amber-400'
                              : k.status === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}>
                            {k.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 font-mono tracking-wider mb-1">ID: {k.userId || 'N/A'}</div>
                        <div className="text-[10px] text-gray-500">{new Date(k.createdAt).toLocaleDateString()}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Left Panel Sidebar Pagination */}
                <div className="bg-[#0B0F1A] border border-gray-800 rounded-3xl p-4 space-y-3 shadow-xl">
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <span>Show</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="bg-[#161B2A] border border-gray-800 rounded-lg px-2 py-0.5 text-gray-300 focus:outline-none focus:border-[#A020F0]"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                      </select>
                      <span>entries</span>
                    </div>
                    <span>
                      {totalItems === 0 ? 0 : startIndex + 1}-{endIndex} of {totalItems}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1 pt-2 border-t border-gray-800/40">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className={`px-2.5 py-1 rounded-lg border border-gray-850 text-[11px] font-bold transition-all duration-300 ${
                        currentPage === 1
                          ? 'text-gray-600 bg-gray-900/10 cursor-not-allowed border-transparent'
                          : 'text-gray-300 hover:text-white hover:border-gray-700 bg-[#161B2A]/30 hover:bg-[#161B2A]/60'
                      }`}
                    >
                      Prev
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                        .map((p, idx, arr) => {
                          const isPageActive = currentPage === p;
                          const prevPage = arr[idx - 1];
                          const showEllipsis = prevPage && p - prevPage > 1;
                          return (
                            <React.Fragment key={p}>
                              {showEllipsis && <span className="px-1 text-gray-600 text-xs">...</span>}
                              <button
                                onClick={() => setCurrentPage(p)}
                                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all duration-300 ${
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
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className={`px-2.5 py-1 rounded-lg border border-gray-850 text-[11px] font-bold transition-all duration-300 ${
                        currentPage === totalPages || totalPages === 0
                          ? 'text-gray-600 bg-gray-900/10 cursor-not-allowed border-transparent'
                          : 'text-gray-300 hover:text-white hover:border-gray-700 bg-[#161B2A]/30 hover:bg-[#161B2A]/60'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* KYC Details Viewer */}
          <div className="lg:col-span-2">
            {activeKyc ? (
              <div className="bg-[#0B0F1A] border border-gray-800 rounded-3xl p-6 space-y-6 relative overflow-hidden">
                {/* Subtle glow */}
                <div className="absolute top-[-30%] right-[-10%] w-72 h-72 bg-[#A020F0]/5 rounded-full blur-[80px] pointer-events-none" />

                <div className="flex justify-between items-start border-b border-gray-800/50 pb-4 relative">
                  <div className="flex items-center gap-4">
                    {activeKyc.user?.profilePic && (
                      <img
                        src={getImageUrl(activeKyc.user.profilePic)}
                        alt="Profile"
                        className="w-12 h-12 rounded-full object-cover border border-[#A020F0]/40"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <div>
                      <h3 className="text-base font-extrabold text-white">{activeKyc.user?.fullName}</h3>
                      <p className="text-xs text-gray-400 font-mono">User ID: {activeKyc.userId}</p>
                      {/* Current status badge */}
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        activeKyc.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-400'
                          : activeKyc.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}>
                        {activeKyc.status}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons — always visible */}
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleReject(activeKyc._id)}
                      disabled={activeKyc.status === 'rejected'}
                      className={`flex items-center gap-1.5 px-4 py-2 border text-xs font-bold rounded-xl transition-all uppercase tracking-wider ${
                        activeKyc.status === 'rejected'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20 opacity-50 cursor-not-allowed'
                          : 'border-red-500/40 bg-red-500/5 hover:bg-red-500/15 text-red-400 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)] cursor-pointer'
                      }`}
                    >
                      <X size={13} /> Reject
                    </button>
                    <button
                      onClick={() => handleApprove(activeKyc._id)}
                      disabled={activeKyc.status === 'approved'}
                      className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all uppercase tracking-wider ${
                        activeKyc.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 opacity-50 cursor-not-allowed'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_4px_10px_rgba(16,185,129,0.2)] hover:shadow-[0_4px_20px_rgba(16,185,129,0.35)] cursor-pointer'
                      }`}
                    >
                      <Check size={13} /> Approve
                    </button>
                  </div>
                </div>

                {/* Details Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#161B2A]/30 border border-gray-800/50 p-4 rounded-2xl space-y-2">
                    <span className="block text-[10px] text-[#A020F0] font-black uppercase tracking-wider">Step 1: Profile Info</span>
                    <div className="text-xs space-y-1.5">
                      <div className="flex justify-between"><span className="text-gray-500">Full Name:</span> <span className="font-semibold text-white">{activeKyc.user?.fullName}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Phone:</span> <span className="font-semibold text-white">{activeKyc.user?.phone || activeKyc.user?.mobile || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Email:</span> <span className="font-semibold text-white">{activeKyc.user?.email || 'N/A'}</span></div>
                    </div>
                  </div>

                  <div className="bg-[#161B2A]/30 border border-gray-800/50 p-4 rounded-2xl space-y-2">
                    <span className="block text-[10px] text-[#A020F0] font-black uppercase tracking-wider">Step 2: ID Details</span>
                    <div className="text-xs space-y-1.5">
                      <div className="flex justify-between"><span className="text-gray-500">ID Type:</span> <span className="font-semibold text-white uppercase">National ID / Passport</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Status:</span> <span className={`font-semibold uppercase ${activeKyc.aadhaarFront ? 'text-emerald-400' : 'text-amber-400'}`}>{activeKyc.aadhaarFront ? 'Uploaded' : 'Pending'}</span></div>
                    </div>
                  </div>

                  <div className="bg-[#161B2A]/30 border border-gray-800/50 p-4 rounded-2xl space-y-2">
                    <span className="block text-[10px] text-[#A020F0] font-black uppercase tracking-wider">Step 3: Address Verification</span>
                    <div className="text-xs space-y-1.5">
                      <div className="flex justify-between"><span className="text-gray-500">Document:</span> <span className="font-semibold text-white uppercase">Address Proof / Utility Bill</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Status:</span> <span className={`font-semibold uppercase ${activeKyc.panCard ? 'text-emerald-400' : 'text-amber-400'}`}>{activeKyc.panCard ? 'Uploaded' : 'Pending'}</span></div>
                    </div>
                  </div>

                  <div className="bg-[#161B2A]/30 border border-gray-800/50 p-4 rounded-2xl space-y-2">
                    <span className="block text-[10px] text-[#A020F0] font-black uppercase tracking-wider">Step 4: Bank Account Details</span>
                    <div className="text-xs space-y-1.5">
                      <div className="flex justify-between"><span className="text-gray-500">Account Holder:</span> <span className="font-semibold text-white">{activeKyc.user?.fullName}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Bank Name:</span> <span className="font-semibold text-white">{activeKyc.bankName || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Account No:</span> <span className="font-semibold text-white font-mono">{activeKyc.accountNumber || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">IFSC Code:</span> <span className="font-semibold text-white font-mono uppercase">{activeKyc.ifscCode || 'N/A'}</span></div>
                    </div>
                  </div>
                </div>

                {/* Uploaded Documents */}
                <div className="space-y-4">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Submitted Verification Files</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeKyc.aadhaarFront && (
                      <div className="bg-[#161B2A]/50 border border-gray-800 p-3 rounded-2xl flex flex-col items-center">
                        <span className="text-[10px] text-gray-500 font-bold uppercase mb-2">Primary ID (Front)</span>
                        <a href={getImageUrl(activeKyc.aadhaarFront)} target="_blank" rel="noreferrer" className="w-full flex justify-center">
                          <img
                            src={getImageUrl(activeKyc.aadhaarFront)}
                            alt="ID Front"
                            className="max-h-40 rounded-lg object-contain bg-gray-900 border border-gray-800 cursor-zoom-in hover:opacity-90 transition-opacity"
                            onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/300x180/161b2a/ffffff?text=ID+Front+View'; }}
                          />
                        </a>
                      </div>
                    )}

                    {activeKyc.aadhaarBack && (
                      <div className="bg-[#161B2A]/50 border border-gray-800 p-3 rounded-2xl flex flex-col items-center">
                        <span className="text-[10px] text-gray-500 font-bold uppercase mb-2">Primary ID (Back)</span>
                        <a href={getImageUrl(activeKyc.aadhaarBack)} target="_blank" rel="noreferrer" className="w-full flex justify-center">
                          <img
                            src={getImageUrl(activeKyc.aadhaarBack)}
                            alt="ID Back"
                            className="max-h-40 rounded-lg object-contain bg-gray-900 border border-gray-800 cursor-zoom-in hover:opacity-90 transition-opacity"
                            onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/300x180/161b2a/ffffff?text=ID+Back+View'; }}
                          />
                        </a>
                      </div>
                    )}

                    {activeKyc.panCard && (
                      <div className="bg-[#161B2A]/50 border border-gray-800 p-3 rounded-2xl flex flex-col items-center col-span-1 sm:col-span-2">
                        <span className="text-[10px] text-gray-500 font-bold uppercase mb-2">Address Proof / Utility Bill</span>
                        <a href={getImageUrl(activeKyc.panCard)} target="_blank" rel="noreferrer" className="w-full flex justify-center">
                          <img
                            src={getImageUrl(activeKyc.panCard)}
                            alt="Address Proof"
                            className="max-h-52 rounded-lg object-contain bg-gray-900 border border-gray-800 w-full cursor-zoom-in hover:opacity-90 transition-opacity"
                            onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/600x300/161b2a/ffffff?text=Address+Proof+Document'; }}
                          />
                        </a>
                      </div>
                    )}

                    {!activeKyc.aadhaarFront && !activeKyc.aadhaarBack && !activeKyc.panCard && (
                      <div className="col-span-2 py-8 text-center text-gray-500 text-sm border border-dashed border-gray-800 rounded-2xl">
                        No documents uploaded yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[50vh] bg-[#0B0F1A] border border-gray-800 rounded-3xl flex flex-col items-center justify-center text-center text-gray-500 gap-3">
                <div className="w-14 h-14 rounded-full bg-[#A020F0]/10 flex items-center justify-center">
                  <FileText className="text-[#A020F0]/50" size={26} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-400">No application selected</p>
                  <p className="text-xs text-gray-600 mt-1">Select a KYC application from the left panel to review</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Kyc;
