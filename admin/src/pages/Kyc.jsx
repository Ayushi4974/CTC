import React, { useState, useEffect } from 'react';
import { UserCheck, ShieldAlert, FileText, Check, X, Search, Image as ImageIcon } from 'lucide-react';
import api from '../api';
import { toast } from 'react-toastify';

const Kyc = () => {
  const [kycs, setKycs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeKyc, setActiveKyc] = useState(null);

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
      await api.put(`/admin/kyc/${id}/approve`);
      toast.success('KYC Approved successfully!');
      fetchKycs();
      setActiveKyc(null);
    } catch (error) {
      toast.error('Failed to approve KYC');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Reject this KYC verification?')) return;
    try {
      await api.put(`/admin/kyc/${id}/reject`);
      toast.success('KYC Rejected successfully');
      fetchKycs();
      setActiveKyc(null);
    } catch (error) {
      toast.error('Failed to reject KYC');
    }
  };

  const filteredKycs = kycs.filter((k) => 
    k.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.documentNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0B0F1A] border border-gray-800 p-6 rounded-3xl">
        <div>
          <h2 className="text-xl font-bold text-white">KYC Verification Inbox ({filteredKycs.length})</h2>
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

      {loading ? (
        <div className="flex items-center justify-center h-[30vh]">
          <div className="w-10 h-10 border-4 border-[#A020F0] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* KYC List */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">KYC Applications</h3>
            {filteredKycs.length === 0 ? (
              <div className="bg-[#0B0F1A] border border-gray-800 rounded-3xl p-6 text-center text-gray-500 text-sm">
                No KYC requests found.
              </div>
            ) : (
              filteredKycs.map((k) => {
                const isActive = activeKyc?._id === k._id;
                return (
                  <button
                    key={k._id}
                    onClick={() => setActiveKyc(k)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 ${
                      isActive 
                        ? 'bg-[#161B2A] border-[#A020F0]/50 shadow-[0_0_15px_rgba(160,32,240,0.1)]' 
                        : 'bg-[#0B0F1A] border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-extrabold text-white text-sm">{k.user?.fullName || 'User Profile'}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
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
              })
            )}
          </div>

          {/* KYC Details Viewer */}
          <div className="lg:col-span-2">
            {activeKyc ? (
              <div className="bg-[#0B0F1A] border border-gray-800 rounded-3xl p-6 space-y-6 relative overflow-hidden">
                <div className="flex justify-between items-start border-b border-gray-800/50 pb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-white">{activeKyc.user?.fullName}</h3>
                    <p className="text-xs text-gray-400 font-mono">User ID: {activeKyc.userId}</p>
                  </div>
                  {activeKyc.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReject(activeKyc._id)}
                        className="flex items-center gap-1 px-3 py-1.5 border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs font-bold rounded-lg transition-colors uppercase tracking-wider"
                      >
                        <X size={12} /> Reject
                      </button>
                      <button
                        onClick={() => handleApprove(activeKyc._id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors uppercase tracking-wider shadow-[0_4px_10px_rgba(16,185,129,0.15)]"
                      >
                        <Check size={12} /> Approve
                      </button>
                    </div>
                  )}
                </div>

                {/* Details Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Step 1: Personal Details */}
                  <div className="bg-[#161B2A]/30 border border-gray-800/50 p-4 rounded-2xl space-y-2">
                    <span className="block text-[10px] text-[#A020F0] font-black uppercase tracking-wider">Step 1: Profile Info</span>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between"><span className="text-gray-500">FullName:</span> <span className="font-semibold text-white">{activeKyc.fullName || activeKyc.user?.fullName}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Phone:</span> <span className="font-semibold text-white">{activeKyc.phone || 'N/A'}</span></div>
                    </div>
                  </div>

                  {/* Step 2: Primary ID details */}
                  <div className="bg-[#161B2A]/30 border border-gray-800/50 p-4 rounded-2xl space-y-2">
                    <span className="block text-[10px] text-[#A020F0] font-black uppercase tracking-wider">Step 2: ID Details</span>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between"><span className="text-gray-500">ID Type:</span> <span className="font-semibold text-white uppercase">{activeKyc.documentType || 'Passport/National ID'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Document No:</span> <span className="font-semibold text-white font-mono uppercase">{activeKyc.documentNumber || 'N/A'}</span></div>
                    </div>
                  </div>

                  {/* Step 3: Address Proof details */}
                  <div className="bg-[#161B2A]/30 border border-gray-800/50 p-4 rounded-2xl space-y-2">
                    <span className="block text-[10px] text-[#A020F0] font-black uppercase tracking-wider">Step 3: Address Verification</span>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between"><span className="text-gray-500">Document:</span> <span className="font-semibold text-white uppercase">{activeKyc.addressProofType || 'Utility Bill / Bank Statement'}</span></div>
                    </div>
                  </div>

                  {/* Step 4: Bank Details */}
                  <div className="bg-[#161B2A]/30 border border-gray-800/50 p-4 rounded-2xl space-y-2">
                    <span className="block text-[10px] text-[#A020F0] font-black uppercase tracking-wider">Step 4: Bank Account Details</span>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between"><span className="text-gray-500">Account Holder:</span> <span className="font-semibold text-white">{activeKyc.bankDetails?.accountHolderName || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Bank Name:</span> <span className="font-semibold text-white">{activeKyc.bankDetails?.bankName || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Account No:</span> <span className="font-semibold text-white font-mono">{activeKyc.bankDetails?.accountNumber || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">SWIFT/IBAN:</span> <span className="font-semibold text-white font-mono uppercase">{activeKyc.bankDetails?.ifscCode || 'N/A'}</span></div>
                    </div>
                  </div>
                </div>

                {/* Uploaded Documents Attachments */}
                <div className="space-y-4">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Submitted Verification Files</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Primary ID Front */}
                    {activeKyc.idFrontPath && (
                      <div className="bg-[#161B2A]/50 border border-gray-850 p-3 rounded-2xl flex flex-col items-center">
                        <span className="text-[10px] text-gray-500 font-bold uppercase mb-2">Primary ID (Front)</span>
                        <img 
                          src={`/uploads/${activeKyc.idFrontPath}`} 
                          alt="ID Front" 
                          className="max-h-40 rounded-lg object-contain bg-gray-900 border border-gray-800"
                          onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/300x180/161b2a/ffffff?text=ID+Front+View'; }}
                        />
                      </div>
                    )}

                    {/* Primary ID Back */}
                    {activeKyc.idBackPath && (
                      <div className="bg-[#161B2A]/50 border border-gray-850 p-3 rounded-2xl flex flex-col items-center">
                        <span className="text-[10px] text-gray-500 font-bold uppercase mb-2">Primary ID (Back)</span>
                        <img 
                          src={`/uploads/${activeKyc.idBackPath}`} 
                          alt="ID Back" 
                          className="max-h-40 rounded-lg object-contain bg-gray-900 border border-gray-800"
                          onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/300x180/161b2a/ffffff?text=ID+Back+View'; }}
                        />
                      </div>
                    )}

                    {/* Address Proof */}
                    {activeKyc.addressProofPath && (
                      <div className="bg-[#161B2A]/50 border border-gray-850 p-3 rounded-2xl flex flex-col items-center col-span-1 sm:col-span-2">
                        <span className="text-[10px] text-gray-500 font-bold uppercase mb-2">Utility Bill / Address Proof</span>
                        <img 
                          src={`/uploads/${activeKyc.addressProofPath}`} 
                          alt="Address Proof" 
                          className="max-h-52 rounded-lg object-contain bg-gray-900 border border-gray-800 w-full"
                          onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/600x300/161b2a/ffffff?text=Address+Proof+Document'; }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[45vh] bg-[#0B0F1A] border border-gray-800 rounded-3xl flex flex-col items-center justify-center text-center text-gray-500">
                <FileText className="mb-2 text-[#A020F0]/50" size={32} />
                <p className="text-sm">Select a user's KYC application from the left panel to review files</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Kyc;
