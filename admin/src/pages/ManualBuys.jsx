import React, { useState, useEffect } from 'react';
import { Clock, Check, X, ShieldAlert, AlertTriangle, ArrowUpRight, Search, Copy, CheckCheck, Wallet, RefreshCw } from 'lucide-react';
import api from '../api';
import { toast } from 'react-toastify';

const ManualBuys = () => {
  const [requests, setRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending'); // pending, approved, rejected, all
  const [filterNetwork, setFilterNetwork] = useState('all'); // all, Bep20, TRC 20
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedText, setCopiedText] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterNetwork]);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/admin/manual-buys');
      setRequests(res.data);
    } catch (error) {
      toast.error('Failed to load manual purchase requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    });
  };

  const handleApprove = async (reqObj) => {
    if (!window.confirm(`Are you sure you want to approve this package purchase of $${reqObj.amount} for User ID ${reqObj.userId}?`)) {
      return;
    }

    try {
      setIsProcessing(true);
      const res = await api.put(`/admin/manual-buys/${reqObj._id}/approve`);
      toast.success(res.data.message || 'Purchase request approved successfully!');
      fetchRequests();
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.message || 'Failed to approve request.';
      toast.error(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectClick = (reqObj) => {
    setSelectedRequest(reqObj);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please enter a reason for rejection.');
      return;
    }

    try {
      setIsProcessing(true);
      const res = await api.put(`/admin/manual-buys/${selectedRequest._id}/reject`, {
        rejectionReason: rejectionReason.trim()
      });
      toast.success(res.data.message || 'Purchase request rejected successfully.');
      setShowRejectModal(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.message || 'Failed to reject request.';
      toast.error(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter & Search
  const filteredRequests = requests.filter((r) => {
    const matchesSearch = 
      (r.userId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.txHash || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.user?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.packageId?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesNetwork = 
      filterNetwork === 'all' || 
      r.networkType === filterNetwork;

    const matchesStatus =
      filterStatus === 'all' ||
      r.status === filterStatus;

    return matchesSearch && matchesNetwork && matchesStatus;
  });

  // Pagination calculation
  const totalItems = filteredRequests.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentRequests = filteredRequests.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col gap-6 bg-[#0B0F1A] border border-gray-800 p-6 rounded-3xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Clock className="text-[#FF00FF]" size={22} />
              Manual Package Purchases ({filteredRequests.length})
            </h2>
            <p className="text-xs text-gray-500 mt-1">Review, approve or reject package buy requests paid manually via BEP20 or TRC20</p>
          </div>
          
          <div className="flex gap-3 w-full lg:w-auto">
            <div className="relative w-full lg:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="text"
                placeholder="Search by ID, Name, Tx Hash, Pkg..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#A020F0]"
              />
            </div>
            <button
              onClick={() => {
                setLoading(true);
                fetchRequests();
              }}
              className="p-3 bg-[#161B2A]/50 border border-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors"
              title="Refresh Data"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Filter controls row */}
        <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-gray-800/40">
          {/* Status Tabs */}
          <div className="flex flex-col gap-1.5 w-full sm:w-auto">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</span>
            <div className="flex bg-[#161B2A]/50 border border-gray-800 rounded-xl p-1 overflow-x-auto hide-scrollbar">
              {['pending', 'approved', 'rejected', 'all'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shrink-0 whitespace-nowrap ${
                    filterStatus === status 
                      ? 'bg-[#A020F0]/10 text-[#FF00FF] border border-[#A020F0]/20' 
                      : 'text-gray-400 hover:text-white border border-transparent'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Network Tabs */}
          <div className="flex flex-col gap-1.5 w-full sm:w-auto">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Payment Network</span>
            <div className="flex bg-[#161B2A]/50 border border-gray-800 rounded-xl p-1 overflow-x-auto hide-scrollbar">
              {['all', 'Bep20', 'TRC 20'].map((net) => (
                <button
                  key={net}
                  onClick={() => setFilterNetwork(net)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shrink-0 whitespace-nowrap ${
                    filterNetwork === net 
                      ? 'bg-[#A020F0]/10 text-[#FF00FF] border border-[#A020F0]/20' 
                      : 'text-gray-400 hover:text-white border border-transparent'
                  }`}
                >
                  {net === 'all' ? 'All Networks' : net}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid List of Requests */}
      {loading ? (
        <div className="flex items-center justify-center h-[30vh]">
          <div className="w-10 h-10 border-4 border-[#A020F0] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-[#0B0F1A] border border-gray-800 rounded-3xl p-12 text-center text-gray-500">
          No manual buy requests match the selected filters.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {currentRequests.map((r) => {
              const netColor = r.networkType === 'Bep20' 
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                : 'bg-red-500/10 text-red-500 border-red-500/20';

              return (
                <div 
                  key={r._id} 
                  className={`bg-[#0B0F1A] border rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                    r.status === 'pending' 
                      ? 'border-purple-500/30'
                      : 'border-gray-800'
                  }`}
                >
                  {/* Status Badge Top-Right */}
                  <div className="absolute top-6 right-6">
                    {r.status === 'pending' ? (
                      <span className="inline-flex px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Pending Approval</span>
                    ) : r.status === 'approved' ? (
                      <span className="inline-flex px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Approved</span>
                    ) : (
                      <span className="inline-flex px-2.5 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">Rejected</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 mb-4">
                    <span className={`inline-flex self-start px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${netColor}`}>
                      USDT - {r.networkType}
                    </span>
                    <h3 className="text-lg font-extrabold text-white mt-2">
                      {r.user?.fullName || 'User Account'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 mt-1">
                      <span className="font-mono">User ID: {r.userId}</span>
                      <span>•</span>
                      <span>Email: {r.user?.email || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Purchase details */}
                  <div className="bg-[#161B2A]/30 border border-gray-800/80 rounded-2xl p-4 grid grid-cols-2 gap-4 text-center mb-6">
                    <div className="border-r border-gray-800/50">
                      <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Package Requested</span>
                      <span className="text-sm font-extrabold text-[#FF00FF]">{r.packageId?.name || 'Standard Package'}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Amount Sent</span>
                      <span className="text-sm font-extrabold text-[#00C6FF]">${Number(r.amount).toLocaleString()} USD</span>
                    </div>
                  </div>

                  {/* Transaction Details */}
                  <div className="space-y-3 text-xs border-t border-gray-800/30 pt-4 mb-6">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-gray-400">Transaction Hash</span>
                      <div className="flex items-center gap-2 bg-gray-800/50 border border-gray-700/30 rounded-xl px-3 py-2">
                        <span className="font-mono text-white text-[11px] break-all flex-1 select-all leading-relaxed">{r.txHash}</span>
                        <button
                          onClick={() => handleCopy(r.txHash)}
                          title="Copy Tx Hash"
                          className="shrink-0 text-gray-400 hover:text-[#00FF99] transition-colors"
                        >
                          {copiedText === r.txHash ? <CheckCheck size={14} className="text-[#00FF99]" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    {r.senderAddress && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-gray-400">Sender Address</span>
                        <div className="flex items-center gap-2 bg-gray-800/50 border border-gray-700/30 rounded-xl px-3 py-2">
                          <span className="font-mono text-gray-300 text-[11px] break-all flex-1 select-all leading-relaxed">{r.senderAddress}</span>
                          <button
                            onClick={() => handleCopy(r.senderAddress)}
                            title="Copy Sender Address"
                            className="shrink-0 text-gray-400 hover:text-[#00FF99] transition-colors"
                          >
                            {copiedText === r.senderAddress ? <CheckCheck size={14} className="text-[#00FF99]" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Requested On</span>
                      <span className="text-gray-400 font-medium">{new Date(r.createdAt).toLocaleString()}</span>
                    </div>

                    {r.status === 'approved' && (
                      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 mt-3 space-y-1.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-emerald-500 font-semibold">Approved At</span>
                          <span className="text-gray-400">{r.approvedAt ? new Date(r.approvedAt).toLocaleString() : 'N/A'}</span>
                        </div>
                      </div>
                    )}

                    {r.status === 'rejected' && (
                      <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 mt-3 space-y-1.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-red-400 font-semibold">Rejected At</span>
                          <span className="text-gray-400">{r.rejectedAt ? new Date(r.rejectedAt).toLocaleString() : 'N/A'}</span>
                        </div>
                        <div className="text-[11px]">
                          <span className="text-red-400 block font-semibold">Reason:</span>
                          <p className="text-gray-400 mt-0.5 italic leading-relaxed">"{r.rejectionReason}"</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Approve/Reject Controls */}
                  {r.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-3 mt-auto">
                      <button
                        onClick={() => handleRejectClick(r)}
                        className="flex items-center justify-center gap-1.5 py-3 border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs font-bold tracking-wider uppercase rounded-xl transition-all"
                      >
                        <X size={14} />
                        Reject Request
                      </button>
                      <button
                        onClick={() => handleApprove(r)}
                        className="flex items-center justify-center gap-1.5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold tracking-wider uppercase rounded-xl transition-all shadow-[0_4px_15px_rgba(16,185,129,0.2)]"
                      >
                        <Check size={14} />
                        Verify & Approve
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-6 border border-gray-800 rounded-3xl bg-[#0B0F1A] shadow-xl">
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
                <option value={6}>6</option>
                <option value={12}>12</option>
                <option value={24}>24</option>
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

      {/* Rejection Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0B0F1A] border border-gray-800 rounded-3xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
            <button
              onClick={() => {
                if (!isProcessing) {
                  setShowRejectModal(false);
                  setSelectedRequest(null);
                }
              }}
              className="absolute top-6 right-6 text-gray-400 hover:text-white bg-[#161B2A] hover:bg-gray-800 p-2 rounded-full transition-colors border border-gray-800"
              disabled={isProcessing}
            >
              <X size={16} />
            </button>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="text-red-500" size={20} />
                  Reject Manual Purchase
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Explain to the user why their transaction hash could not be verified.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Rejection Reason</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Transaction hash not found on blockchain / Incorrect amount sent / Typos in transaction ID"
                  disabled={isProcessing}
                  rows={4}
                  className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#A020F0] placeholder:text-gray-600"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedRequest(null);
                  }}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 border border-gray-800 hover:bg-gray-800 text-gray-300 text-xs font-bold uppercase rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectSubmit}
                  disabled={isProcessing || !rejectionReason.trim()}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-gray-800 disabled:text-gray-500 text-white text-xs font-bold uppercase rounded-xl transition-all"
                >
                  {isProcessing ? 'Rejecting...' : 'Reject Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualBuys;
