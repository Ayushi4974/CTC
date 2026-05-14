import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../redux/slices/authSlice';
import { 
  Home, 
  Package, 
  ShieldCheck, 
  ArrowDownCircle, 
  Users, 
  DollarSign, 
  BarChart2, 
  Cpu,
  LogOut,
  Wallet,
  FileText,
  User
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'react-toastify';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: Home },
  { name: 'Products', path: '/products', icon: Package },
  { name: 'KYC Verification', path: '/kyc', icon: ShieldCheck },
  { name: 'Withdrawal', path: '/withdrawal', icon: ArrowDownCircle },
  { name: 'Downline', path: '/downline', icon: Users },
  { name: 'Referral Income', path: '/referral-income', icon: DollarSign },
  { name: 'Level Income', path: '/level-income', icon: BarChart2 },
  { name: 'Mining History', path: '/mining', icon: Cpu },
  { name: 'Package History', path: '/package-history', icon: Package },
  { name: 'Transactions', path: '/transactions', icon: FileText },
  { name: 'Profile', path: '/profile', icon: User },
];

const Sidebar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { walletAddress } = useSelector((state) => state.auth);

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
          dispatch({ type: 'auth/setWalletAddress', payload: accounts[0] });
          toast.success("Wallet connected successfully!");
        } else {
          toast.error("No active wallet found. Please unlock your wallet.");
        }
      } catch (error) {
        console.error("Wallet connection error:", error);
        toast.error(error?.message || "Failed to connect wallet. Please check your extension.");
      }
    } else {
      toast.error("Please install MetaMask to use this feature!");
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <aside className="w-64 h-screen bg-[#050505] border-r border-[#1a1a2e] flex flex-col fixed left-0 top-0 overflow-y-auto hide-scrollbar z-50">
      {/* Logo */}
      <div className="p-6 pb-2 pt-8 flex items-center justify-center">
        <Link to="/" className="flex items-center justify-center mx-auto hover:opacity-90 transition-opacity">
          
          <div className="flex items-center">
            {/* SVG Graphic (Candlesticks & Scale) */}
            <svg width="60" height="60" viewBox="0 0 100 100" className="drop-shadow-[0_0_8px_rgba(160,32,240,0.5)] shrink-0">
              <defs>
                <linearGradient id="logo-gradient" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#FF00FF" />
                  <stop offset="50%" stopColor="#A020F0" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
              
              {/* Candlesticks */}
              <rect x="15" y="45" width="8" height="20" fill="url(#logo-gradient)" />
              <line x1="19" y1="35" x2="19" y2="75" stroke="url(#logo-gradient)" strokeWidth="2.5" />
              
              <rect x="32" y="30" width="8" height="25" fill="url(#logo-gradient)" />
              <line x1="36" y1="20" x2="36" y2="65" stroke="url(#logo-gradient)" strokeWidth="2.5" />
              
              <rect x="49" y="15" width="8" height="30" fill="url(#logo-gradient)" />
              <line x1="53" y1="5" x2="53" y2="55" stroke="url(#logo-gradient)" strokeWidth="2.5" />
              
              {/* Arching Arrow */}
              <path d="M 5 65 Q 40 40 70 15" fill="none" stroke="url(#logo-gradient)" strokeWidth="3.5" strokeLinecap="round" />
              <polygon points="73,12 60,16 70,26" fill="url(#logo-gradient)" />
              
              {/* Scale Hanging from Arch */}
              <line x1="58" y1="28" x2="58" y2="45" stroke="url(#logo-gradient)" strokeWidth="2.5" />
              <polygon points="58,28 45,55 71,55" fill="none" stroke="url(#logo-gradient)" strokeWidth="2.5" strokeLinejoin="round" />
              <path d="M 45 55 C 45 64 71 64 71 55 Z" fill="url(#logo-gradient)" />
            </svg>
            
            {/* Text Side */}
            <div className="flex flex-col justify-center ml-1">
              <span className="text-[40px] font-black leading-[0.85] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] via-[#A020F0] to-[#FF00FF] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                CTC
              </span>
              <div className="flex flex-col mt-1 ml-0.5">
                <span className="text-[10px] font-bold tracking-[0.15em] text-white leading-none">COPY TRADE</span>
                <span className="text-[10px] font-bold tracking-[0.15em] text-[#FF00FF] leading-none mt-[3px]">COMPARE</span>
              </div>
            </div>
          </div>

        </Link>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-4 space-y-1 mt-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium',
                  isActive 
                    ? 'bg-gradient-to-r from-[#A020F0] to-[#FF00FF] text-white shadow-lg shadow-[#A020F0]/30' 
                    : 'text-gray-400 hover:text-white hover:bg-[#12121A]'
                )
              }
            >
              <Icon size={18} />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* Wallet Status */}
      <div className="p-4 mt-auto">
        <div className="bg-[#0f0f13] border border-gray-800 rounded-2xl p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Wallet Status</p>
          <div className="flex items-center gap-2 mb-4 text-sm font-medium">
            <div className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${walletAddress ? 'bg-[#00FF99]' : 'bg-red-500'} opacity-40`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${walletAddress ? 'bg-[#00FF99]' : 'bg-red-500/80'}`}></span>
            </div>
            <span className={walletAddress ? "text-[#00FF99]" : "text-gray-400"}>
              {walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : 'Disconnected'}
            </span>
          </div>
          {!walletAddress && (
            <button 
              onClick={connectWallet}
              className="w-full bg-gradient-to-r from-[#A020F0] to-[#FF00FF] text-white rounded-lg py-2.5 text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Wallet size={16} />
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      {/* Logout */}
      <div className="p-4 pb-6">
        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm font-medium w-full">
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
