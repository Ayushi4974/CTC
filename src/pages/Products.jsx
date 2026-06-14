import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, ShieldCheck, Zap, Star, ChevronRight, CheckCircle2, Lock, Clock, Activity, X, AlertCircle, CreditCard, Copy, Check } from 'lucide-react';
import { ethers } from 'ethers';
import api from '../api';
import { toast } from 'react-toastify';
import { useDispatch } from 'react-redux';
import { fetchProfile } from '../redux/slices/authSlice';

const packages = [
  {
    id: 1,
    name: 'Package 1',
    investment: '$100 – $1,000',
    minInvestment: 100,
    maxInvestment: 1000,
    profit: '0.5%',
    duration: 'every 12 hours',
    description: 'You will receive as long as your live account remains active.',
    icon: TrendingUp,
    glowClass: 'shadow-[0_0_20px_rgba(0,198,255,0.2)] hover:shadow-[0_0_30px_rgba(0,198,255,0.4)]',
    borderClass: 'border-[#00C6FF]/30',
    iconBgClass: 'bg-[#00C6FF]/10',
    iconTextClass: 'text-[#00C6FF]',
    isPremium: false,
  },
  {
    id: 2,
    name: 'Package 2',
    investment: '$1,500 – $5,000',
    minInvestment: 1500,
    maxInvestment: 5000,
    profit: '0.6%',
    duration: 'every 12 hours',
    description: 'You will receive as long as your live account remains active.',
    icon: ShieldCheck,
    glowClass: 'shadow-[0_0_20px_rgba(127,0,255,0.2)] hover:shadow-[0_0_30px_rgba(127,0,255,0.4)]',
    borderClass: 'border-[#7F00FF]/30',
    iconBgClass: 'bg-[#7F00FF]/10',
    iconTextClass: 'text-[#7F00FF]',
    isPremium: false,
  },
  {
    id: 3,
    name: 'Package 3',
    investment: '$10,000 – $25,000',
    minInvestment: 10000,
    maxInvestment: 25000,
    profit: '0.7%',
    duration: 'every 12 hours',
    description: 'You will receive as long as your live account remains active.',
    icon: Zap,
    glowClass: 'shadow-[0_0_30px_rgba(160,32,240,0.4)] hover:shadow-[0_0_50px_rgba(255,0,255,0.6)] animate-pulse-slow',
    borderClass: 'border-[#FF00FF]/50',
    iconBgClass: 'bg-[#FF00FF]/10',
    iconTextClass: 'text-[#FF00FF]',
    isPremium: true,
  },
  {
    id: 4,
    name: 'Package 4',
    investment: '$50,000',
    minInvestment: 50000,
    maxInvestment: 50000,
    profit: '0.8%',
    duration: 'every 12 hours',
    description: 'You will receive as long as your live account remains active.',
    icon: Star,
    glowClass: 'shadow-[0_0_30px_rgba(255,0,255,0.5)] hover:shadow-[0_0_60px_rgba(255,0,255,0.8)] animate-pulse',
    borderClass: 'border-[#FF00FF]/60',
    iconBgClass: 'bg-[#FF00FF]/20',
    iconTextClass: 'text-[#FF00FF]',
    isPremium: true,
  },
  {
    id: 5,
    name: 'Referral Package',
    investment: '$20',
    minInvestment: 20,
    maxInvestment: 20,
    profit: '0.25%',
    duration: 'daily',
    description: 'Exclusive package for referred members. (Monday–Friday active earnings).',
    icon: Star,
    glowClass: 'shadow-[0_0_20px_rgba(255,165,0,0.4)] hover:shadow-[0_0_40px_rgba(255,165,0,0.6)] animate-pulse-slow',
    borderClass: 'border-orange-500/50',
    iconBgClass: 'bg-orange-500/10',
    iconTextClass: 'text-orange-500',
    isPremium: false,
  },
  {
    id: 6,
    name: 'Land Security Package',
    investment: '$5,000 – $50,000',
    minInvestment: 5000,
    maxInvestment: 50000,
    profit: '0.25%',
    duration: 'every 12 hours',
    description: 'Special premium package designed for higher capital growth with stable returns.',
    icon: ShieldCheck,
    glowClass: 'shadow-[0_0_30px_rgba(251,191,36,0.3)] hover:shadow-[0_0_50px_rgba(251,191,36,0.5)] animate-pulse-slow',
    borderClass: 'border-amber-500/40',
    iconBgClass: 'bg-amber-500/10',
    iconTextClass: 'text-amber-500',
    isPremium: true,
  }
];

const Products = () => {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [dbPackages, setDbPackages] = useState([]);
  const [txHash, setTxHash] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('metamask'); // 'metamask' or 'manual'
  const [networkType, setNetworkType] = useState('Bep20'); // 'Bep20' or 'TRC 20'
  const [senderAddress, setSenderAddress] = useState('');
  const [depositAddresses, setDepositAddresses] = useState({
    depositAddressMetaMask: '0x185018c5f26B2cE105e0B80b231178CE5913b621',
    depositAddressBep20: '0x8e4143b46eb1e1a6cbd71b5d57da95b985219f0b',
    depositAddressTrc20: 'TWJjGZJ73Q9x2hWpLRRreaxyvR9Eveoiv5'
  });
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchDepositAddresses = async () => {
      try {
        const res = await api.get('/user/deposit-addresses');
        setDepositAddresses(res.data);
      } catch (err) {
        console.error('Failed to fetch deposit addresses:', err);
      }
    };
    fetchDepositAddresses();
  }, []);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const res = await api.get('/package/all');
        if (res.data.length > 0) {
          setDbPackages(res.data);
        } else {
          setDbPackages(packages.map((p, i) => ({ ...p, _id: `temp_${i}` }))); // Fallback for UI if db empty
        }
      } catch (err) {
        console.error('Failed to fetch packages:', err);
        setDbPackages(packages.map((p, i) => ({ ...p, _id: `temp_${i}` })));
      }
    };
    fetchPackages();
  }, []);

  const connectWalletAndPay = async () => {
    if (!window.ethereum) {
      toast.error('Please install MetaMask!');
      return;
    }

    try {
      setIsProcessing(true);

      // 1. Connect to MetaMask
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();

      // 2. Switch to Binance Smart Chain (Mainnet: 56, Testnet: 97)
      const targetChainId = '0x38'; // 56 in hex
      const chainId = await provider.send('eth_chainId', []);

      if (chainId !== targetChainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: targetChainId }],
          });
        } catch (switchError) {
          // This error code indicates that the chain has not been added to MetaMask.
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

      // 3. Send USDT
      const USDT_CONTRACT = "0x55d398326f99059fF775485246999027B3197955";
      const ADMIN_WALLET = depositAddresses.depositAddressMetaMask || "0x185018c5f26B2cE105e0B80b231178CE5913b621"; 

      const abi = [
        "function transfer(address to, uint256 amount) public returns (bool)",
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)"
      ];
      const usdtContract = new ethers.Contract(USDT_CONTRACT, abi, signer);

      // Check USDT balance and BNB balance (for gas)
      const userAddress = await signer.getAddress();
      const [balance, decimals, bnbBalance] = await Promise.all([
        usdtContract.balanceOf(userAddress),
        usdtContract.decimals(),
        provider.getBalance(userAddress)
      ]);

      const amount = ethers.parseUnits(investmentAmount.toString(), decimals);

      // Require at least a tiny bit of BNB for gas (e.g., 0.0005 BNB is usually enough for a simple transfer, but we'll check if it's strictly > 0)
      if (bnbBalance === 0n) {
        throw new Error("Insufficient BNB for gas fees. You must have some BNB in your wallet to cover the Binance Smart Chain transaction fee.");
      }

      if (balance < amount) {
        const readableBalance = ethers.formatUnits(balance, decimals);
        throw new Error(`Insufficient USDT balance. You have ${readableBalance} USDT, but need ${investmentAmount} USDT.`);
      }

      toast.info("Please confirm the transaction in MetaMask...");
      const tx = await usdtContract.transfer(ADMIN_WALLET, amount);

      toast.info("Transaction sent! Waiting for confirmation...");
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        // 4. Send TxHash to Backend
        const response = await api.post('/package/buy', {
          packageId: selectedPackage._id || selectedPackage.id,
          amount: Number(investmentAmount),
          txHash: tx.hash,
          senderAddress: userAddress, // Security requirement: matching sender
        });

        toast.success(response.data.message || 'Package Activated Successfully!');
        dispatch(fetchProfile());
        setSelectedPackage(null);
      } else {
        throw new Error("Transaction failed on-chain");
      }
    } catch (error) {
      console.error(error);
      const errorMsg = error.reason || error.message || "Payment failed. Please try again.";
      toast.error(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const submitManualPurchase = async () => {
    if (!txHash) {
      toast.error('Transaction Hash is required for manual purchase verification.');
      return;
    }

    try {
      setIsProcessing(true);
      const response = await api.post('/package/manual-buy', {
        packageId: selectedPackage._id || selectedPackage.id,
        amount: Number(investmentAmount),
        txHash,
        networkType,
        senderAddress,
      });

      toast.success(response.data.message || 'Manual purchase request submitted successfully!');
      setSelectedPackage(null);
      setTxHash('');
      setSenderAddress('');
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to submit request. Please try again.';
      toast.error(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectPackage = (pkg) => {
    setSelectedPackage(pkg);
    setInvestmentAmount(pkg.minInvestment);
    setAmountError('');
  };

  const handleAmountChange = (e) => {
    const val = e.target.value;
    setInvestmentAmount(val);
    const num = Number(val);

    if (!val) {
      setAmountError('Investment amount is required');
    } else if (num < selectedPackage.minInvestment) {
      setAmountError(`Minimum investment is $${selectedPackage.minInvestment.toLocaleString()}`);
    } else if (num > selectedPackage.maxInvestment) {
      setAmountError(`Maximum investment is $${selectedPackage.maxInvestment.toLocaleString()}`);
    } else {
      setAmountError('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 pt-4">
      {/* Header Section */}
      <div className="text-center mb-12">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#A020F0] to-[#FF00FF]"
        >
          Premium Trading Packages
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-gray-400 text-lg max-w-2xl mx-auto"
        >
          Select a structured financial growth opportunity that aligns with your goals.
        </motion.p>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 mb-16">
        {[...dbPackages]
          .sort((a, b) => {
            const getOrder = (name) => {
              const lower = name.toLowerCase();
              if (lower === 'package') return 0;
              if (lower.includes('package 1') || lower.includes('100 package')) return 1;
              if (lower.includes('package 2') || lower.includes('500 package')) return 2;
              if (lower.includes('package 3')) return 3;
              if (lower.includes('package 4')) return 4;
              if (lower.includes('land security')) return 5;
              if (lower.includes('referral')) return 6;
              return 99;
            };
            return getOrder(a.name) - getOrder(b.name);
          })
          .map((pkgDb, idx) => {
            // Merge db package with UI config
            let uiConfig = packages.find(p => p.name.toLowerCase() === pkgDb.name.toLowerCase());
            if (!uiConfig) {
              if (pkgDb.name.toLowerCase() === 'package') {
                uiConfig = {
                  name: 'Package',
                  icon: TrendingUp,
                  glowClass: 'shadow-[0_0_20px_rgba(0,198,255,0.2)] hover:shadow-[0_0_30px_rgba(0,198,255,0.4)]',
                  borderClass: 'border-[#00C6FF]/30',
                  iconBgClass: 'bg-[#00C6FF]/10',
                  iconTextClass: 'text-[#00C6FF]',
                  isPremium: false,
                  description: 'Investment package for 0-Pin members.'
                };
              } else {
                uiConfig = packages[idx % packages.length];
              }
            }
          
          const isReferral = pkgDb.isReferralOnly || pkgDb.name.toLowerCase().includes('referral');
          const profitDisplay = isReferral 
            ? `${pkgDb.dailyProfit}%` 
            : `${(pkgDb.dailyProfit / 2)}%`;
          const durationDisplay = isReferral 
            ? 'daily' 
            : 'every 12 hours';

          const minAmtStr = pkgDb.minAmount ? pkgDb.minAmount.toLocaleString() : '0';
          const maxAmtStr = pkgDb.maxAmount ? pkgDb.maxAmount.toLocaleString() : '0';
          const investmentDisplay = pkgDb.minAmount === pkgDb.maxAmount 
            ? `$${minAmtStr}` 
            : `$${minAmtStr} – $${maxAmtStr}`;

          const pkg = { 
            ...uiConfig, 
            ...pkgDb,
            minInvestment: pkgDb.minAmount ?? uiConfig?.minInvestment ?? 0,
            maxInvestment: pkgDb.maxAmount ?? uiConfig?.maxInvestment ?? 0,
            profit: profitDisplay,
            duration: durationDisplay,
            investment: investmentDisplay
          };

          const isLastItem = idx === dbPackages.length - 1;
          const isOddCount = dbPackages.length % 2 !== 0;

          return (
            <motion.div
              key={pkg._id || pkg.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => handleSelectPackage(pkg)}
              className={`relative rounded-3xl cursor-pointer transition-all duration-300 transform hover:-translate-y-2 group ${pkg.glowClass}
                ${isLastItem && isOddCount ? 'md:col-span-2 md:w-[calc(50%-16px)] md:mx-auto' : ''}
              `}
            >
              {/* Glassmorphism Container */}
              <div className={`h-full bg-gradient-to-br from-[#161B2A]/80 to-[#050505]/90 backdrop-blur-[15px] border border-gray-800/50 rounded-3xl p-6 md:p-8 flex flex-col justify-between overflow-hidden
              ${(selectedPackage?._id === pkg._id) ? 'ring-2 ring-[#A020F0]' : ''}
            `}>
                {/* Top-Edge Highlight mimicking light source */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent"></div>

                <div className="relative z-10">
                  {/* Top Row: Icon & Selection */}
                  <div className="flex justify-between items-start mb-6">
                    {/* Hex/Circle Icon Badge */}
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center border ${pkg.borderClass} ${pkg.iconBgClass} ${pkg.iconTextClass} shadow-[inset_0_0_15px_rgba(255,255,255,0.05)]`}>
                      <pkg.icon size={26} />
                    </div>
                    {selectedPackage?._id === pkg._id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-[#00FF99]"
                      >
                        <CheckCircle2 size={28} className="drop-shadow-[0_0_8px_rgba(0,255,153,0.8)]" />
                      </motion.div>
                    )}
                  </div>

                  {/* Content */}
                  <h2 className="text-2xl font-bold text-white mb-2 tracking-wide">
                    {pkg.name}
                  </h2>

                  <div className="mb-6">
                    <p className="text-xs text-gray-400 font-bold mb-1 uppercase tracking-widest opacity-80">Investment Range</p>
                    <p className="text-2xl text-white font-semibold">{pkg.investment}</p>
                  </div>

                  {/* Profit Rate Box (Information Hierarchy Focus) */}
                  <div className="bg-[#050505]/50 border border-gray-700 hover:border-[#FF00FF]/50 rounded-2xl p-5 mb-6 relative overflow-hidden group-hover:shadow-[inset_0_0_20px_rgba(255,0,255,0.05)] transition-all">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#A020F0] to-[#FF00FF]"></div>
                    <p className="text-xs text-gray-400 font-bold mb-1 uppercase tracking-widest">Profit Rate</p>
                    <p className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#A020F0] via-[#D800FF] to-[#FF00FF]">
                      {pkg.profit} <span className="text-sm font-semibold text-gray-300 ml-1">{pkg.duration}</span>
                    </p>
                  </div>

                  <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                    {pkg.description}
                  </p>
                </div>

                {/* Bottom Actions & Trust Indicators */}
                <div className="relative z-10 mt-auto">
                  <button
                    className={`w-full py-4 rounded-xl font-bold text-white transition-all duration-300 flex items-center justify-center gap-2 mb-5
                    ${pkg.isPremium || selectedPackage?._id === pkg._id
                        ? 'bg-gradient-to-r from-[#A020F0] to-[#FF00FF] shadow-[0_0_20px_rgba(160,32,240,0.5)] hover:shadow-[0_0_30px_rgba(255,0,255,0.7)] border-none'
                        : 'bg-transparent border border-gray-600 hover:border-[#A020F0] hover:bg-[#A020F0]/10 hover:shadow-[inset_0_0_15px_rgba(160,32,240,0.3)]'
                      }
                  `}
                  >
                    {selectedPackage?._id === pkg._id ? 'Selected' : 'Buy Now'}
                    {selectedPackage?._id !== pkg._id && <ChevronRight size={18} />}
                  </button>

                  {/* Trust & Transparency Indicators */}
                  <div className="flex items-center justify-between border-t border-gray-800/60 pt-4">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                      <Activity size={12} className="text-emerald-400" />
                      <span>Real-time Secure</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium cursor-help" title="Withdraw your funds anytime">
                      <Clock size={12} className="text-[#00C6FF]" />
                      <span>Withdraw anytime</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Purchase Modal Overlay */}
      <AnimatePresence>
        {selectedPackage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            {/* Dark Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPackage(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            ></motion.div>

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-3xl bg-[#0B0F1A] border border-[#A020F0]/50 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(160,32,240,0.2)] relative overflow-y-auto max-h-[90vh] z-10"
            >
              {/* Decorative Blur Orbs */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF00FF]/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#A020F0]/15 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none"></div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedPackage(null)}
                className="absolute top-6 right-6 text-gray-400 hover:text-white bg-[#161B2A] hover:bg-gray-800 p-2 rounded-full transition-colors z-20 border border-gray-800"
              >
                <X size={20} />
              </button>

              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                  <Zap className="text-[#FF00FF]" /> Complete Purchase: {selectedPackage.name}
                </h3>

                {/* Payment Method Selector */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-400 mb-3">Payment Method</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('metamask')}
                      className={`py-3 px-4 rounded-xl font-bold border transition-all text-sm flex items-center justify-center gap-2 ${
                        paymentMethod === 'metamask'
                          ? 'bg-[#A020F0]/10 border-[#A020F0] text-[#FF00FF] shadow-[0_0_15px_rgba(160,32,240,0.15)]'
                          : 'bg-[#161B2A]/50 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200'
                      }`}
                    >
                      <Zap size={16} /> Pay via MetaMask
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('manual')}
                      className={`py-3 px-4 rounded-xl font-bold border transition-all text-sm flex items-center justify-center gap-2 ${
                        paymentMethod === 'manual'
                          ? 'bg-[#A020F0]/10 border-[#A020F0] text-[#FF00FF] shadow-[0_0_15px_rgba(160,32,240,0.15)]'
                          : 'bg-[#161B2A]/50 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200'
                      }`}
                    >
                      <CreditCard size={16} /> Manual Deposit
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Selected Package Display */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Selected Package</label>
                    <div className="w-full bg-[#161B2A]/80 border border-gray-700 rounded-xl px-4 py-3 text-white font-semibold">
                      {selectedPackage.name} ({selectedPackage.profit} {selectedPackage.duration})
                    </div>
                  </div>

                  {/* Investment Amount Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Investment Amount (USD)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={investmentAmount}
                        onChange={handleAmountChange}
                        className={`w-full bg-[#161B2A]/80 border rounded-xl pl-8 pr-4 py-3 text-white font-semibold focus:outline-none transition-all ${amountError
                          ? 'border-red-500 focus:border-red-500 focus:shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                          : 'border-gray-700 focus:border-[#A020F0] focus:shadow-[0_0_15px_rgba(160,32,240,0.3)]'
                          }`}
                      />
                    </div>
                    {amountError ? (
                      <p className="text-xs text-red-500 mt-2 flex items-center gap-1 font-medium"><AlertCircle size={12} /> {amountError}</p>
                    ) : (
                      selectedPackage.minInvestment === selectedPackage.maxInvestment ? (
                        <p className="text-xs text-gray-500 mt-2">Required Investment: ${selectedPackage.minInvestment.toLocaleString()}</p>
                      ) : (
                        <p className="text-xs text-gray-500 mt-2">Allowed Range: ${selectedPackage.minInvestment.toLocaleString()} - ${selectedPackage.maxInvestment.toLocaleString()}</p>
                      )
                    )}
                  </div>
                </div>

                {/* Manual Payment Fields */}
                {paymentMethod === 'manual' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6 mb-6"
                  >
                    {/* Network Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Select Network</label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => setNetworkType('Bep20')}
                          className={`py-2 px-3 rounded-lg font-semibold border transition-all text-xs flex items-center justify-center gap-1.5 ${
                            networkType === 'Bep20'
                              ? 'bg-amber-500/10 border-amber-500/50 text-amber-500'
                              : 'bg-[#161B2A]/80 border-gray-700 text-gray-400 hover:border-gray-600'
                          }`}
                        >
                          BEP20 (Binance Smart Chain)
                        </button>
                        <button
                          type="button"
                          onClick={() => setNetworkType('TRC 20')}
                          className={`py-2 px-3 rounded-lg font-semibold border transition-all text-xs flex items-center justify-center gap-1.5 ${
                            networkType === 'TRC 20'
                              ? 'bg-red-500/10 border-red-500/50 text-red-500'
                              : 'bg-[#161B2A]/80 border-gray-700 text-gray-400 hover:border-gray-600'
                          }`}
                        >
                          TRC20 (TRON Network)
                        </button>
                      </div>
                    </div>

                    {/* Deposit Address Box */}
                    <div className="bg-[#161B2A]/80 border border-gray-700 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-gray-400">USDT Deposit Address ({networkType})</span>
                        <button
                          type="button"
                          onClick={() => {
                            const addr = networkType === 'Bep20' 
                              ? depositAddresses.depositAddressBep20 
                              : depositAddresses.depositAddressTrc20;
                            navigator.clipboard.writeText(addr);
                            toast.success('Address copied to clipboard!');
                          }}
                          className="text-xs text-[#FF00FF] hover:underline flex items-center gap-1 font-bold"
                        >
                          <Copy size={12} /> Copy Address
                        </button>
                      </div>
                      <div className="text-sm font-mono text-white select-all break-all bg-[#0B0F1A] border border-gray-800 p-2.5 rounded-lg text-center mb-4">
                        {networkType === 'Bep20' 
                          ? depositAddresses.depositAddressBep20 
                          : depositAddresses.depositAddressTrc20}
                      </div>
                      
                      {/* QR Code Container */}
                      <div className="flex flex-col items-center justify-center bg-[#070A12] border border-gray-800 rounded-lg p-4 mb-3">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2.5">Scan to Pay</span>
                        <div className="bg-white p-2.5 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${
                              networkType === 'Bep20' 
                                ? depositAddresses.depositAddressBep20 
                                : depositAddresses.depositAddressTrc20
                            }`} 
                            alt="Payment QR Code" 
                            className="w-[130px] h-[130px]"
                          />
                        </div>
                      </div>

                      <p className="text-[11px] text-gray-500">
                        ⚠️ Send only USDT ({networkType}) to this address. Sending other tokens or using the wrong network may result in permanent loss.
                      </p>
                    </div>

                    {/* Sender Wallet Address */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Sender Wallet Address (Optional)</label>
                      <input
                        type="text"
                        value={senderAddress}
                        onChange={(e) => setSenderAddress(e.target.value)}
                        placeholder="Your wallet address from which payment is sent"
                        className="w-full bg-[#161B2A]/80 border border-gray-700 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-[#A020F0] focus:shadow-[0_0_15px_rgba(160,32,240,0.3)] transition-all"
                      />
                    </div>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 gap-6 mb-6">
                  {/* TxHash Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Transaction Hash {paymentMethod === 'manual' ? '(Required)' : '(Optional if using MetaMask)'}
                    </label>
                    <input
                      type="text"
                      value={txHash}
                      onChange={(e) => setTxHash(e.target.value)}
                      placeholder="0x... or TRON transaction ID"
                      className="w-full bg-[#161B2A]/80 border border-gray-700 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-[#A020F0] focus:shadow-[0_0_15px_rgba(160,32,240,0.3)] transition-all"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 mb-8">
                  <p className="text-xs text-gray-500">
                    {paymentMethod === 'manual'
                      ? 'Enter the transaction hash/id of your USDT transfer to submit for verification.'
                      : 'Enter transaction hash manually if you paid outside of this browser session.'}
                  </p>
                </div>

                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => {
                      setSelectedPackage(null);
                      setTxHash('');
                      setSenderAddress('');
                    }}
                    className="px-6 py-4 rounded-xl font-bold text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  {paymentMethod === 'metamask' ? (
                    <button
                      disabled={!!amountError || !investmentAmount || isProcessing}
                      onClick={connectWalletAndPay}
                      className={`px-10 py-4 rounded-xl font-bold transition-all text-lg flex items-center gap-2 ${amountError || !investmentAmount || isProcessing
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                        : 'bg-gradient-to-r from-[#A020F0] to-[#FF00FF] text-white shadow-[0_0_20px_rgba(160,32,240,0.4)] hover:shadow-[0_0_40px_rgba(255,0,255,0.6)] hover:-translate-y-0.5'
                        }`}
                    >
                      {isProcessing ? 'Processing...' : 'Pay via MetaMask'} <ChevronRight />
                    </button>
                  ) : (
                    <button
                      disabled={!!amountError || !investmentAmount || !txHash || isProcessing}
                      onClick={submitManualPurchase}
                      className={`px-10 py-4 rounded-xl font-bold transition-all text-lg flex items-center gap-2 ${amountError || !investmentAmount || !txHash || isProcessing
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                        : 'bg-gradient-to-r from-[#A020F0] to-[#FF00FF] text-white shadow-[0_0_20px_rgba(160,32,240,0.4)] hover:shadow-[0_0_40px_rgba(255,0,255,0.6)] hover:-translate-y-0.5'
                        }`}
                    >
                      {isProcessing ? 'Submitting...' : 'Submit Manual Purchase'} <ChevronRight />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Products;
