import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, Users, AlertTriangle, CheckCircle2, 
  DollarSign, Lock, Coins, ArrowRight,
  Info, ShieldCheck, Database, XCircle, Clock
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProfile } from '../redux/slices/authSlice';
import api from '../api';
import { toast } from 'react-toastify';

const statCards = [
  { title: 'Mining Commission', subtitle: 'Return on Investment', value: '1,245.50', hidden: true, icon: TrendingUp, color: 'text-[#A020F0]', aura: 'bg-[#A020F0]/10', progressColor: 'from-[#A020F0] to-[#FF00FF]', progress: 30 },
  { title: 'Level Income', subtitle: 'Level Earnings', value: '1,570.71', hidden: false, icon: Users, color: 'text-[#00C6FF]', aura: 'bg-[#00C6FF]/10', progressColor: 'from-[#00C6FF] to-[#00FF99]', progress: 65 },
  { title: 'SOS Withdrawal', subtitle: 'Emergency Fund', value: '0.00', hidden: false, icon: AlertTriangle, color: 'text-red-500', aura: 'bg-red-500/10', progressColor: 'from-red-500 to-orange-500', progress: 10 },
  { title: 'Total Withdrawal', subtitle: 'Lifetime Withdrawn', value: '0.00', hidden: false, icon: CheckCircle2, color: 'text-[#FF00FF]', aura: 'bg-[#FF00FF]/10', progressColor: 'from-[#FF00FF] to-[#A020F0]', progress: 80 },
  { title: 'Total Income', subtitle: 'Total Earnings', value: '5,730.71', hidden: false, icon: DollarSign, color: 'text-yellow-500', aura: 'bg-yellow-500/10', progressColor: 'from-yellow-400 to-orange-500', progress: 45 },
  { title: 'Stake Token', subtitle: 'Staked Balance', value: '0.00', hidden: false, icon: Lock, color: 'text-orange-500', aura: 'bg-orange-500/10', progressColor: 'from-orange-500 to-red-500', progress: 20 },
];

const withdrawalSources = [
  { id: 'level', name: 'Level Income', balance: '65.45', icon: TrendingUp, color: '#00C6FF' },
  { id: 'mining', name: 'Mining Bonus', balance: '0.00', icon: Coins, color: '#A020F0' },
  { id: 'annual', name: 'Annual Bonus', balance: '0.00', icon: DollarSign, color: '#FF00FF' },
];

const mockHistory = [
  { id: 'TX1029', source: 'Level Income', amount: '65.45', date: '2026-05-12', method: 'USDT (BEP-20)', status: 'Pending' },
  { id: 'TX1028', source: 'Mining Bonus', amount: '120.00', date: '2026-05-10', method: 'USDT (BEP-20)', status: 'Completed' },
  { id: 'TX1027', source: 'Annual Bonus', amount: '50.00', date: '2026-05-01', method: 'USDT (BEP-20)', status: 'Rejected' },
];

const Withdrawal = () => {
  const dispatch = useDispatch();
  const { profile, user } = useSelector(state => state.auth);
  const currentUser = profile || user;

  const dynamicSources = [
    { id: 'balance', name: 'Available Balance', balance: currentUser?.availableBalance || 0, icon: TrendingUp, color: '#00C6FF' },
  ];

  const [selectedSource, setSelectedSource] = useState(dynamicSources[0]);
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(true);

  useEffect(() => {
    dispatch(fetchProfile());
    fetchHistory();
  }, [dispatch]);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/withdrawal/history');
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUseMax = () => {
    setAmount(currentUser?.availableBalance || 0);
  };

  const handleWithdraw = async () => {
    if (!amount || amount < 10) return toast.error('Minimum withdrawal is 10');
    if (!walletAddress) return toast.error('Please enter your receiving wallet address');
    
    try {
      await api.post('/withdrawal/request', { amount: Number(amount), walletAddress });
      toast.success('Withdrawal requested successfully!');
      setAmount('');
      setWalletAddress('');
      dispatch(fetchProfile());
      fetchHistory();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Withdrawal failed');
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Pending':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.2)] animate-pulse"><Clock size={12} /> Pending</span>;
      case 'Completed':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#A020F0]/20 text-[#FF00FF] border border-[#A020F0]/30 shadow-[0_0_10px_rgba(160,32,240,0.3)]"><CheckCircle2 size={12} /> Completed</span>;
      case 'Rejected':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]"><XCircle size={12} /> Rejected</span>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 pt-4 px-4 sm:px-6 lg:px-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-extrabold text-white mb-2"
          >
            Withdrawal Center
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-gray-400"
          >
            Welcome, <span className="text-[#A020F0] font-bold drop-shadow-[0_0_5px_rgba(160,32,240,0.5)]">{currentUser?.fullName}!</span> Manage your earnings and withdraw funds securely via USDT (BEP-20).
          </motion.p>
        </div>
        <motion.button 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 bg-[#00C6FF]/10 border border-[#00C6FF]/30 text-[#00C6FF] px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#00C6FF]/20 transition-colors shadow-[0_0_15px_rgba(0,198,255,0.2)]"
        >
          <div className="w-2 h-2 rounded-full bg-[#00C6FF] animate-pulse"></div>
          Available Balance
        </motion.button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Withdrawal Request Form */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-1 bg-[#0B0F1A]/80 backdrop-blur-xl border border-[#A020F0]/30 rounded-3xl p-6 relative overflow-hidden shadow-[0_0_40px_rgba(160,32,240,0.1)]"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#A020F0]/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10">
            <h2 className="text-xl font-bold text-white mb-1">Initial Withdrawal Request</h2>
            <p className="text-sm text-gray-400 mb-6">Request withdrawal from your available wallets</p>
            
            {/* Source Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-300 mb-3">Select Source</label>
              <div className="grid grid-cols-1 gap-3">
                {dynamicSources.map((source) => {
                  const isSelected = selectedSource.id === source.id;
                  const Icon = source.icon;
                  return (
                    <button
                      key={source.id}
                      onClick={() => setSelectedSource(source)}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 overflow-hidden ${
                        isSelected 
                          ? 'bg-[#161B2A] border border-transparent shadow-[0_0_20px_rgba(160,32,240,0.3)] scale-105' 
                          : 'bg-[#161B2A]/50 border border-gray-800 hover:border-gray-600'
                      }`}
                    >
                      {isSelected && <div className="absolute inset-0 rounded-xl p-[1px] bg-gradient-to-br from-[#A020F0] to-[#FF00FF] -z-10"></div>}
                      {isSelected && <div className="absolute inset-0 bg-[#A020F0]/10 blur-md z-0"></div>}
                      <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center mb-2 shadow-[inset_0_0_10px_rgba(255,255,255,0.05)] ${isSelected ? 'bg-[#A020F0]/20 text-[#FF00FF]' : 'bg-gray-800 text-gray-400'}`}>
                        <Icon size={14} />
                      </div>
                      <span className={`relative z-10 text-xs font-bold text-center ${isSelected ? 'text-white' : 'text-gray-400'}`}>{source.name}</span>
                      <span className={`relative z-10 text-sm mt-0.5 ${isSelected ? 'text-[#00C6FF]' : 'text-gray-500'}`}>${source.balance}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Glassmorphism Divider */}
            <div className="h-[1px] bg-gradient-to-r from-transparent via-[#A020F0]/30 to-transparent my-6"></div>

            {/* Amount Input */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-gray-300">Withdrawal Amount (USD)</label>
                <button 
                  onClick={handleUseMax}
                  className="text-[11px] px-2 py-1 bg-[#A020F0]/10 hover:bg-[#A020F0]/20 text-[#FF00FF] rounded font-bold border border-[#A020F0]/30 transition-colors shadow-[0_0_10px_rgba(160,32,240,0.2)]"
                >
                  Use Max: ${selectedSource.balance}
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">$</span>
                <input 
                  type="number" 
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#050505]/50 border border-gray-700/80 rounded-xl pl-8 pr-4 py-3.5 text-white font-semibold placeholder-gray-600 focus:outline-none focus:border-[#FF00FF] focus:ring-1 focus:ring-[#FF00FF] focus:shadow-[0_0_20px_rgba(255,0,255,0.2)] transition-all"
                />
              </div>
              <div className="flex justify-between text-[11px] text-gray-500 mt-2 font-medium">
                <span>Minimum: $10</span>
                <span className="text-[#00C6FF]">Available: ${selectedSource.balance}</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-300 mb-2">Receiving Wallet Address (USDT BEP-20)</label>
              <input 
                type="text" 
                placeholder="0x..."
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="w-full bg-[#050505]/50 border border-gray-700/80 rounded-xl px-4 py-3.5 text-white font-semibold placeholder-gray-600 focus:outline-none focus:border-[#FF00FF] focus:ring-1 focus:ring-[#FF00FF] focus:shadow-[0_0_20px_rgba(255,0,255,0.2)] transition-all"
              />
            </div>

            {/* Withdrawal Method */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-300 mb-2">Withdrawal Method</label>
              <div className="flex items-center justify-between bg-[#161B2A] border border-[#00FF99]/30 rounded-xl px-4 py-3 shadow-[inset_0_0_15px_rgba(0,255,153,0.05)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#00FF99]/10 flex items-center justify-center border border-[#00FF99]/20">
                    <Coins size={16} className="text-[#00FF99]" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold">USDT</p>
                    <p className="text-[10px] text-emerald-400 font-medium tracking-wide">BEP-20 Network</p>
                  </div>
                </div>
                <CheckCircle2 size={18} className="text-[#00FF99]" />
              </div>
            </div>

            {/* Transparent Fee Labeling */}
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 mb-8">
              <div className="flex gap-3 mb-2">
                <Info className="text-orange-500 shrink-0 mt-0.5" size={16} />
                <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider">Deduction Policy</h4>
              </div>
              <ul className="text-[11px] text-orange-500/80 space-y-2 pl-7 list-disc">
                <li>A <strong className="text-orange-400">10% releasing reserve</strong> is applied to every withdrawal.</li>
                <li>For Principal withdrawals, a <strong className="text-orange-400">20% processing deduction</strong> applies.</li>
              </ul>
            </div>

            {/* Submit Button with Shimmer */}
            <button onClick={handleWithdraw} className="relative overflow-hidden w-full bg-gradient-to-r from-[#A020F0] to-[#FF00FF] hover:shadow-[0_0_30px_rgba(255,0,255,0.6)] text-white rounded-xl py-4 font-bold transition-all hover:-translate-y-0.5 mb-4 group">
              <span className="relative z-10 flex items-center justify-center gap-2">
                Submit Withdrawal Request <ArrowRight size={18} />
              </span>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:animate-[shimmer_1.5s_infinite] skew-x-[-20deg] w-1/2 h-full z-0"></div>
            </button>
            
            <div className="flex items-center justify-center gap-2 mt-2">
              <ShieldCheck size={14} className="text-emerald-400" />
              <p className="text-[11px] text-emerald-400/80 font-medium tracking-wide">
                Secure Transaction • Processed within 24-48 hours
              </p>
            </div>
          </div>
        </motion.div>

        {/* Right Column: History & Summary */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Withdrawal History Table */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex-1 bg-[#0B0F1A]/80 backdrop-blur-xl border border-gray-800/60 rounded-3xl p-6 flex flex-col relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#00C6FF]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            <div className="flex justify-between items-center mb-6 relative z-10">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Withdrawal History</h2>
                <p className="text-sm text-gray-400">Track all your withdrawal requests</p>
              </div>
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                Toggle View
              </button>
            </div>
            
            {/* Table Header */}
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                <div className="grid grid-cols-6 gap-4 border-b border-gray-800/50 pb-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider px-2 relative z-10">
                  <div className="col-span-1">Source</div>
                  <div className="col-span-1 text-center">Amount</div>
                  <div className="col-span-1 text-center">Date</div>
                  <div className="col-span-1 text-center">Method</div>
                  <div className="col-span-1 text-center">Status</div>
                  <div className="col-span-1 text-right">Action</div>
                </div>

                {/* Table Content */}
                <div className="flex-1 flex flex-col relative z-10">
                  {history.length > 0 ? (
                    <div className="flex flex-col gap-1 py-2 overflow-y-auto max-h-[300px]">
                      {history.map((row, i) => (
                        <div key={i} className="grid grid-cols-6 gap-4 py-4 px-2 hover:bg-[#161B2A]/50 rounded-xl items-center border-b border-gray-800/30 transition-colors">
                          <div className="col-span-1 text-sm text-gray-300 font-medium">Withdrawal</div>
                          <div className="col-span-1 text-center text-sm font-bold text-white">${row.amount}</div>
                          <div className="col-span-1 text-center text-sm text-gray-400">{new Date(row.createdAt).toLocaleDateString()}</div>
                          <div className="col-span-1 text-center text-[11px] text-[#00C6FF] font-medium bg-[#00C6FF]/10 py-1 rounded-lg border border-[#00C6FF]/20">USDT</div>
                          <div className="col-span-1 text-center flex justify-center">
                            {getStatusBadge(row.status === 'pending' ? 'Pending' : row.status === 'approved' ? 'Completed' : 'Rejected')}
                          </div>
                          <div className="col-span-1 text-right">
                            <span className="text-[11px] font-semibold text-gray-500">Deduct: ${row.deduction}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-16 opacity-80">
                  <div className="relative mb-6 group">
                    <div className="absolute inset-0 bg-[#A020F0] blur-[30px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#161B2A] to-[#050505] border border-gray-700 flex items-center justify-center relative z-10 shadow-[inset_0_0_20px_rgba(160,32,240,0.1)]">
                      <Database size={40} className="text-[#A020F0]" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">No Transactions Yet</h3>
                  <p className="text-sm text-gray-400 mb-6 text-center max-w-sm">
                    You haven't made any withdrawal requests. Your transaction history will securely populate here.
                  </p>
                  <button className="bg-[#161B2A] border border-[#A020F0]/50 text-[#FF00FF] px-6 py-2 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(160,32,240,0.2)] hover:bg-[#A020F0]/10 transition-colors">
                    Start your first withdrawal
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pagination / Footer */}
        <div className="border-t border-gray-800/50 pt-4 flex justify-between items-center mt-auto relative z-10">
          <span className="text-xs text-gray-500 font-medium">Showing {history.length} withdrawals</span>

              <div className="flex gap-2">
                <button className="bg-[#161B2A]/80 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">Previous</button>
                <button className="bg-gradient-to-r from-[#A020F0] to-[#FF00FF] text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-[0_0_10px_rgba(160,32,240,0.4)]">1</button>
                <button className="bg-[#161B2A]/80 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">Next</button>
              </div>
            </div>
          </motion.div>

          {/* Bottom Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-[#0B0F1A]/80 backdrop-blur-xl border border-gray-800/60 rounded-2xl p-5 flex justify-between items-center hover:border-[#00C6FF]/50 transition-colors shadow-lg"
            >
              <div>
                <h3 className="text-white font-bold text-sm">Total Withdrawn</h3>
                <p className="text-xs text-gray-500 mt-1">All Time</p>
              </div>
              <span className="text-2xl font-extrabold text-[#00C6FF]">$ 0.00</span>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-[#0B0F1A]/80 backdrop-blur-xl border border-gray-800/60 rounded-2xl p-5 flex justify-between items-center hover:border-yellow-500/50 transition-colors shadow-lg"
            >
              <div>
                <h3 className="text-white font-bold text-sm">Pending</h3>
                <p className="text-xs text-gray-500 mt-1">Awaiting Processing</p>
              </div>
              <span className="text-2xl font-extrabold text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]">$ 0.00</span>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-[#0B0F1A]/80 backdrop-blur-xl border border-[#A020F0]/30 rounded-2xl p-5 flex justify-between items-center relative overflow-hidden group shadow-[0_0_20px_rgba(160,32,240,0.1)]"
            >
              <div className="absolute right-0 top-0 w-32 h-32 bg-[#A020F0]/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-[#FF00FF]/20 transition-colors"></div>
              <div className="relative z-10 flex flex-col">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-white font-bold text-sm">Withdrawal Fee</h3>
                  <div className="group/tooltip relative cursor-help">
                    <Info size={12} className="text-gray-400 hover:text-white" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 border border-gray-700 text-[10px] text-gray-300 rounded shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-20">
                      Standard network and platform charges apply to all withdrawals.
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Standard Charge</p>
              </div>
              <span className="text-3xl font-extrabold text-[#FF00FF] relative z-10 drop-shadow-[0_0_10px_rgba(255,0,255,0.4)]">5%</span>
            </motion.div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default Withdrawal;
