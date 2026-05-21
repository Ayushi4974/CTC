import React, { useState, useEffect } from 'react';
import { CreditCard, Check, X, ShieldAlert, AlertTriangle, ArrowUpRight, Search, FileText } from 'lucide-react';
import api from '../api';
import { toast } from 'react-toastify';
import { ethers } from 'ethers';

const Withdrawals = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // all, profit, principal
  const [filterStatus, setFilterStatus] = useState('pending'); // pending, approved, rejected, all
  const [selectedWithdrawalForApproval, setSelectedWithdrawalForApproval] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualTxHash, setManualTxHash] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterStatus]);

  const fetchWithdrawals = async () => {
    try {
      const res = await api.get('/admin/withdrawals');
      setWithdrawals(res.data);
    } catch (error) {
      toast.error('Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const executeMetaMaskPayout = async (withdrawal) => {
    if (!window.ethereum) {
      toast.error('Please install MetaMask to perform Web3 payout!');
      return;
    }

    try {
      setIsProcessing(true);
      const isSos = withdrawal.isPrincipalExit || withdrawal.type === 'principal' || withdrawal.userPackageId;
      const netAmount = withdrawal.netPayable ?? (isSos ? withdrawal.amount * 0.8 : withdrawal.amount * 0.9);

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();

      const targetChainId = '0x38'; // BSC Mainnet
      const chainId = await provider.send('eth_chainId', []);

      if (chainId !== targetChainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: targetChainId }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: targetChainId,
                  chainName: 'Binance Smart Chain',
                  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                  rpcUrls: ['https://bsc-dataseed.binance.org/'],
                  blockExplorerUrls: ['https://bscscan.com/'],
                },
              ],
            });
          } else {
            throw switchError;
          }
        }
      }

      const USDT_CONTRACT = "0x55d398326f99059fF775485246999027B3197955";
      const abi = [
        "function transfer(address to, uint256 amount) public returns (bool)",
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)"
      ];

      const usdtContract = new ethers.Contract(USDT_CONTRACT, abi, signer);
      const adminAddress = await signer.getAddress();

      const [balance, decimals, bnbBalance] = await Promise.all([
        usdtContract.balanceOf(adminAddress),
        usdtContract.decimals(),
        provider.getBalance(adminAddress)
      ]);

      const payAmount = ethers.parseUnits(netAmount.toFixed(4), decimals);

      if (bnbBalance === 0n) {
        throw new Error("Insufficient BNB for gas fees in your admin wallet.");
      }

      if (balance < payAmount) {
        const readableBalance = ethers.formatUnits(balance, decimals);
        throw new Error(`Insufficient USDT balance in admin wallet. You have ${Number(readableBalance).toFixed(4)} USDT, but need ${netAmount.toFixed(4)} USDT.`);
      }

      toast.info(`Please sign the transaction to transfer ${netAmount.toFixed(4)} USDT to ${withdrawal.walletAddress}...`);
      const tx = await usdtContract.transfer(withdrawal.walletAddress, payAmount);

      toast.info("Transaction sent! Waiting for confirmation on-chain...");
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        const res = await api.put(`/admin/withdrawal/${withdrawal._id}/approve`, { txHash: tx.hash });
        toast.success(res.data.message || 'Withdrawal successfully approved and completed!');
        setSelectedWithdrawalForApproval(null);
        fetchWithdrawals();
      } else {
        throw new Error("Blockchain transaction failed.");
      }
    } catch (error) {
      console.error(error);
      const errorMsg = error.reason || error.message || "Payout transaction failed.";
      toast.error(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeManualPayout = async (withdrawal) => {
    if (!manualTxHash.trim()) {
      toast.error('Please enter a transaction hash.');
      return;
    }

    try {
      setIsProcessing(true);
      const res = await api.put(`/admin/withdrawal/${withdrawal._id}/approve`, { txHash: manualTxHash.trim() });
      toast.success(res.data.message || 'Withdrawal successfully approved!');
      setSelectedWithdrawalForApproval(null);
      setManualTxHash('');
      fetchWithdrawals();
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.message || 'Failed to verify transaction hash.';
      toast.error(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeMockPayout = async (withdrawal) => {
    try {
      setIsProcessing(true);
      const mockHash = 'mock_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const res = await api.put(`/admin/withdrawal/${withdrawal._id}/approve`, { txHash: mockHash });
      toast.success('Mock approval processed successfully (Bypassed blockchain)!');
      setSelectedWithdrawalForApproval(null);
      fetchWithdrawals();
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.message || 'Failed mock approval.';
      toast.error(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this withdrawal? Balances will be refunded.')) return;
    try {
      await api.put(`/admin/withdrawal/${id}/reject`);
      toast.success('Withdrawal successfully rejected and refunded.');
      fetchWithdrawals();
    } catch (error) {
      toast.error('Failed to reject withdrawal request');
    }
  };

  // Filter & Search
  const filteredWithdrawals = withdrawals.filter((w) => {
    const matchesSearch = 
      w.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.walletAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const isSos = w.isPrincipalExit || w.type === 'principal' || w.userPackageId;
    const matchesType = 
      filterType === 'all' || 
      (filterType === 'principal' && isSos) || 
      (filterType === 'profit' && !isSos);

    const matchesStatus =
      filterStatus === 'all' ||
      w.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Pagination calculation
  const totalItems = filteredWithdrawals.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentWithdrawals = filteredWithdrawals.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col gap-6 bg-[#0B0F1A] border border-gray-800 p-6 rounded-3xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Withdrawal Controls ({filteredWithdrawals.length})</h2>
            <p className="text-xs text-gray-500 mt-1">Review pending requests, calculate exit reserves, and trigger distributions</p>
          </div>
          
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Search by ID, Name, Address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#161B2A]/80 border border-gray-700/50 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#A020F0]"
            />
          </div>
        </div>

        {/* Filter controls row */}
        <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-gray-800/40">
          {/* Status Tabs */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</span>
            <div className="flex bg-[#161B2A]/50 border border-gray-800 rounded-xl p-1 shrink-0">
              {['pending', 'approved', 'rejected', 'all'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
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

          {/* Type Tabs */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Wallet Type</span>
            <div className="flex bg-[#161B2A]/50 border border-gray-800 rounded-xl p-1 shrink-0">
              {['all', 'profit', 'principal'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    filterType === type 
                      ? 'bg-[#A020F0]/10 text-[#FF00FF] border border-[#A020F0]/20' 
                      : 'text-gray-400 hover:text-white border border-transparent'
                  }`}
                >
                  {type === 'all' ? 'All' : type === 'principal' ? 'SOS Principal' : 'Profit Wallet'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid List of Pending & Approved Withdrawals */}
      {loading ? (
        <div className="flex items-center justify-center h-[30vh]">
          <div className="w-10 h-10 border-4 border-[#A020F0] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredWithdrawals.length === 0 ? (
        <div className="bg-[#0B0F1A] border border-gray-800 rounded-3xl p-12 text-center text-gray-500">
          No withdrawals match the selected filters.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {currentWithdrawals.map((w) => {
              const isSos = w.isPrincipalExit || w.type === 'principal' || w.userPackageId;
              const netAmount = w.netPayable ?? (isSos ? w.amount * 0.8 : w.amount * 0.9);
              const reservePercentage = isSos ? '20% Processing Exit' : '10% Reserve Fund';

              return (
                <div 
                  key={w._id} 
                  className={`bg-[#0B0F1A] border rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                    w.status === 'pending' 
                      ? isSos ? 'border-rose-500/30' : 'border-amber-500/30'
                      : 'border-gray-800'
                  }`}
                >
                  {/* Visual Glow */}
                  {w.status === 'pending' && (
                    <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl ${isSos ? 'bg-rose-500/5' : 'bg-amber-500/5'} pointer-events-none`}></div>
                  )}

                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div>
                      <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border mb-2.5 ${
                        isSos 
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {isSos ? 'SOS Capital Exit' : 'Profit Wallet Withdrawal'}
                      </span>
                      <h3 className="text-base font-extrabold text-white">{w.user?.fullName || 'Full Profile Loaded'}</h3>
                      <p className="text-xs text-gray-400 mt-1 font-mono uppercase tracking-wide">ID: {w.userId}</p>
                    </div>

                    <div className="text-right">
                      <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Status</span>
                      {w.status === 'pending' ? (
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Pending Admin</span>
                      ) : w.status === 'approved' ? (
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Approved</span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">Rejected</span>
                      )}
                    </div>
                  </div>

                  {/* Balance breakdown */}
                  <div className="bg-[#161B2A]/30 border border-gray-800 rounded-2xl p-4 grid grid-cols-3 gap-2 text-center mb-6">
                    <div>
                      <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Requested</span>
                      <span className="text-sm font-extrabold text-white">${Number(w.amount).toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Fee ({isSos ? '20%' : '10%'})</span>
                      <span className="text-sm font-extrabold text-red-400">${Number(w.amount - netAmount).toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Net Payable</span>
                      <span className="text-sm font-extrabold text-[#00C6FF]">${Number(netAmount).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Recipient Details */}
                  <div className="space-y-2.5 text-xs border-t border-gray-800/30 pt-4 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Withdrawal Destination</span>
                      <span className="font-mono text-white text-[11px] select-all bg-gray-800/50 px-2 py-0.5 rounded border border-gray-700/30">{w.walletAddress}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Deduction Method</span>
                      <span className="text-gray-400 font-bold text-[10px] uppercase tracking-wide">{reservePercentage}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Submission Date</span>
                      <span className="text-gray-400 font-medium">{new Date(w.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Approve/Reject Controls */}
                  {w.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleReject(w._id)}
                        className="flex items-center justify-center gap-1.5 py-3 border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs font-bold tracking-wider uppercase rounded-xl transition-all"
                      >
                        <X size={14} />
                        Reject & Refund
                      </button>
                      <button
                        onClick={() => setSelectedWithdrawalForApproval(w)}
                        className="flex items-center justify-center gap-1.5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold tracking-wider uppercase rounded-xl transition-all shadow-[0_4px_15px_rgba(16,185,129,0.2)]"
                      >
                        <Check size={14} />
                        Approve Release
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
                <option value={48}>48</option>
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
      {/* Payout Approval Modal */}
      {selectedWithdrawalForApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#0B0F1A] border border-gray-800 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
            {/* Close button */}
            <button
              onClick={() => {
                if (!isProcessing) {
                  setSelectedWithdrawalForApproval(null);
                  setManualTxHash('');
                }
              }}
              className="absolute top-6 right-6 text-gray-400 hover:text-white bg-[#161B2A] hover:bg-gray-800 p-2 rounded-full transition-colors border border-gray-800"
              disabled={isProcessing}
            >
              <X size={18} />
            </button>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CreditCard className="text-[#FF00FF]" size={20} />
                  Approve Withdrawal & Release Funds
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Choose a release method. This will transfer real USDT to the user's wallet address.
                </p>
              </div>

              {/* Recipient info card */}
              <div className="bg-[#161B2A]/50 border border-gray-800/80 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Recipient Name</span>
                  <span className="font-semibold text-white">{selectedWithdrawalForApproval.user?.fullName || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Withdrawal Type</span>
                  <span className="font-bold text-[10px] uppercase text-emerald-400">
                    {selectedWithdrawalForApproval.type === 'principal' ? 'SOS Capital Exit' : 'Profit Wallet Withdrawal'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Destination Address</span>
                  <span className="font-mono text-white select-all bg-gray-800/50 px-2 py-0.5 rounded border border-gray-700/30">
                    {selectedWithdrawalForApproval.walletAddress}
                  </span>
                </div>
                <div className="border-t border-gray-800/50 my-2 pt-2 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="block text-[9px] text-gray-500 font-bold uppercase">Requested</span>
                    <span className="text-sm font-extrabold text-white">${Number(selectedWithdrawalForApproval.amount).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-gray-500 font-bold uppercase">Fee</span>
                    <span className="text-sm font-extrabold text-red-400">
                      ${Number(selectedWithdrawalForApproval.amount - (selectedWithdrawalForApproval.netPayable ?? (selectedWithdrawalForApproval.type === 'principal' ? selectedWithdrawalForApproval.amount * 0.8 : selectedWithdrawalForApproval.amount * 0.9))).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-gray-500 font-bold uppercase">Net Payout</span>
                    <span className="text-sm font-extrabold text-[#00C6FF]">
                      ${Number(selectedWithdrawalForApproval.netPayable ?? (selectedWithdrawalForApproval.type === 'principal' ? selectedWithdrawalForApproval.amount * 0.8 : selectedWithdrawalForApproval.amount * 0.9)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Method Choices */}
              <div className="space-y-4">
                {/* Method 1: MetaMask */}
                <div className="border border-gray-800 bg-[#161B2A]/20 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div className="space-y-1">
                    <span className="block text-xs font-bold text-white">Option 1: Release via MetaMask (BSC Mainnet)</span>
                    <span className="block text-[11px] text-gray-400">Automatically connect, switch to BSC, and sign USDT transfer to recipient's address.</span>
                  </div>
                  <button
                    disabled={isProcessing}
                    onClick={() => executeMetaMaskPayout(selectedWithdrawalForApproval)}
                    className="w-full md:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-800 disabled:text-gray-500 text-white text-xs font-bold tracking-wider uppercase rounded-xl transition-all shadow-[0_4px_15px_rgba(16,185,129,0.2)] shrink-0 flex items-center justify-center gap-2"
                  >
                    {isProcessing ? 'Processing...' : 'Pay via MetaMask'}
                  </button>
                </div>

                {/* Method 2: Manual Hash */}
                <div className="border border-gray-800 bg-[#161B2A]/20 p-4 rounded-2xl space-y-3">
                  <div className="space-y-1">
                    <span className="block text-xs font-bold text-white">Option 2: Submit Manual Transaction Hash</span>
                    <span className="block text-[11px] text-gray-400">If you sent the USDT transfer manually using external wallet, paste the transaction hash below.</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="0x..."
                      value={manualTxHash}
                      onChange={(e) => setManualTxHash(e.target.value)}
                      disabled={isProcessing}
                      className="flex-1 bg-[#161B2A]/80 border border-gray-700/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#A020F0]"
                    />
                    <button
                      disabled={isProcessing || !manualTxHash.trim()}
                      onClick={() => executeManualPayout(selectedWithdrawalForApproval)}
                      className="px-4 py-2 bg-[#A020F0] hover:bg-[#b83efc] disabled:bg-gray-800 disabled:text-gray-500 text-white text-xs font-bold tracking-wider uppercase rounded-xl transition-all shrink-0"
                    >
                      Submit Hash
                    </button>
                  </div>
                </div>

                {/* Method 3: Mock Bypass */}
                <div className="flex justify-between items-center text-xs border-t border-gray-800/30 pt-4">
                  <span className="text-gray-500">Local Testing / Development Bypass:</span>
                  <button
                    disabled={isProcessing}
                    onClick={() => executeMockPayout(selectedWithdrawalForApproval)}
                    className="text-gray-400 hover:text-white underline text-[11px]"
                  >
                    Mock Approval (Skip Tx)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Withdrawals;
