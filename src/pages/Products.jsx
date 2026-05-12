import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, ShieldCheck, Zap, Star, ChevronRight, CheckCircle2, Lock, Clock, Activity, X, UploadCloud, AlertCircle } from 'lucide-react';

const packages = [
  {
    id: 1,
    name: 'Package 1',
    investment: '$100 – $1,000',
    minInvestment: 100,
    maxInvestment: 1000,
    profit: '0.5%',
    duration: 'every 12 hours',
    description: 'Good for beginners. Reinvest profits automatically (Auto-compounding) to maximize balance.',
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
    description: 'Medium investment. Reinvest profits automatically (Auto-compounding) to maximize balance.',
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
    description: 'High investment. Reinvest profits automatically (Auto-compounding) to maximize balance.',
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
    description: 'Maximum return tier. Reinvest profits automatically (Auto-compounding) to maximize balance.',
    icon: Star,
    glowClass: 'shadow-[0_0_30px_rgba(255,0,255,0.5)] hover:shadow-[0_0_60px_rgba(255,0,255,0.8)] animate-pulse',
    borderClass: 'border-[#FF00FF]/60',
    iconBgClass: 'bg-[#FF00FF]/20',
    iconTextClass: 'text-[#FF00FF]',
    isPremium: true,
  }
];

const Products = () => {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [amountError, setAmountError] = useState('');

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
        {packages.map((pkg, idx) => (
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => handleSelectPackage(pkg)}
            className={`relative rounded-3xl cursor-pointer transition-all duration-300 transform hover:-translate-y-2 group ${pkg.glowClass}`}
          >
            {/* Glassmorphism Container */}
            <div className={`h-full bg-gradient-to-br from-[#161B2A]/80 to-[#050505]/90 backdrop-blur-[15px] border border-gray-800/50 rounded-3xl p-6 md:p-8 flex flex-col justify-between overflow-hidden
              ${selectedPackage?.id === pkg.id ? 'ring-2 ring-[#A020F0]' : ''}
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
                  {selectedPackage?.id === pkg.id && (
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
                    ${pkg.isPremium || selectedPackage?.id === pkg.id
                      ? 'bg-gradient-to-r from-[#A020F0] to-[#FF00FF] shadow-[0_0_20px_rgba(160,32,240,0.5)] hover:shadow-[0_0_30px_rgba(255,0,255,0.7)] border-none'
                      : 'bg-transparent border border-gray-600 hover:border-[#A020F0] hover:bg-[#A020F0]/10 hover:shadow-[inset_0_0_15px_rgba(160,32,240,0.3)]'
                    }
                  `}
                >
                  {selectedPackage?.id === pkg.id ? 'Selected' : 'Buy Now'}
                  {selectedPackage?.id !== pkg.id && <ChevronRight size={18} />}
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
        ))}
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
              className="w-full max-w-3xl bg-[#0B0F1A] border border-[#A020F0]/50 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(160,32,240,0.2)] relative overflow-hidden z-10"
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
                        className={`w-full bg-[#161B2A]/80 border rounded-xl pl-8 pr-4 py-3 text-white font-semibold focus:outline-none transition-all ${
                          amountError 
                            ? 'border-red-500 focus:border-red-500 focus:shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
                            : 'border-gray-700 focus:border-[#A020F0] focus:shadow-[0_0_15px_rgba(160,32,240,0.3)]'
                        }`}
                      />
                    </div>
                    {amountError ? (
                      <p className="text-xs text-red-500 mt-2 flex items-center gap-1 font-medium"><AlertCircle size={12} /> {amountError}</p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-2">Allowed Range: ${selectedPackage.minInvestment.toLocaleString()} - ${selectedPackage.maxInvestment.toLocaleString()}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Wallet Address Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Sender Wallet Address</label>
                    <input 
                      type="text" 
                      placeholder="Enter your BEP-20 address..."
                      className="w-full bg-[#161B2A]/80 border border-gray-700 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-[#00C6FF] focus:shadow-[0_0_15px_rgba(0,198,255,0.3)] transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-2">The address you are sending the USDT from.</p>
                  </div>

                  {/* Upload Proof Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Payment Proof (Screenshot)</label>
                    <div className="relative group/upload cursor-pointer w-full bg-[#161B2A]/80 border border-dashed border-gray-700 hover:border-[#00FF99] rounded-xl px-4 py-3 flex items-center gap-3 transition-all">
                      <input 
                        type="file" 
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="w-8 h-8 rounded-full bg-[#00FF99]/10 flex items-center justify-center text-[#00FF99] group-hover/upload:shadow-[0_0_10px_rgba(0,255,153,0.4)] transition-all">
                        <UploadCloud size={16} />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-white group-hover/upload:text-[#00FF99] transition-colors">Click to upload</span>
                        <p className="text-[10px] text-gray-500 mt-0.5">JPG, PNG up to 5MB</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-8 flex gap-4 backdrop-blur-sm">
                  <div className="mt-1">
                    <Star className="text-yellow-500" size={20} />
                  </div>
                  <div>
                    <h4 className="text-yellow-500 font-semibold mb-1">Important Reality Check</h4>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      These returns are high-risk. Always verify the platform, check withdrawal proofs, and avoid investing large amounts blindly.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <button 
                    onClick={() => setSelectedPackage(null)}
                    className="px-6 py-4 rounded-xl font-bold text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={!!amountError || !investmentAmount}
                    onClick={() => {
                      alert('Purchase Submitted! Pending verification.');
                      setSelectedPackage(null);
                    }}
                    className={`px-10 py-4 rounded-xl font-bold transition-all text-lg flex items-center gap-2 ${
                      amountError || !investmentAmount
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                        : 'bg-gradient-to-r from-[#A020F0] to-[#FF00FF] text-white shadow-[0_0_20px_rgba(160,32,240,0.4)] hover:shadow-[0_0_40px_rgba(255,0,255,0.6)] hover:-translate-y-0.5'
                    }`}
                  >
                    Submit Purchase <ChevronRight />
                  </button>
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
