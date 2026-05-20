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
  User,
  X
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'react-toastify';
import logo from '../assets/logo.png';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: Home },
  { name: 'Packages', path: '/products', icon: Package },
  { name: 'KYC Verification', path: '/kyc', icon: ShieldCheck },
  { name: 'Withdrawal', path: '/withdrawal', icon: ArrowDownCircle },
  { name: 'Downline', path: '/downline', icon: Users },
  // { name: 'Referral Income', path: '/referral-income', icon: DollarSign },
  { name: 'Level Income', path: '/level-income', icon: BarChart2 },
  { name: 'Copy Trade History', path: '/mining', icon: Cpu },
  { name: 'Package History', path: '/package-history', icon: Package },
  { name: 'Transactions', path: '/transactions', icon: FileText },
  { name: 'Profile', path: '/profile', icon: User },
];

const Sidebar = ({ isOpen, closeSidebar }) => {
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
    <aside className={clsx(
      "w-64 h-screen bg-[#050505] border-r border-[#1a1a2e] flex flex-col fixed left-0 top-0 overflow-y-auto hide-scrollbar z-50 transition-transform duration-300 ease-in-out lg:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      {/* Mobile Close Button */}
      <button
        onClick={closeSidebar}
        className="lg:hidden absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-gray-800/30 rounded-lg"
      >
        <X size={20} />
      </button>

      {/* Logo */}
      <div className="p-6 pb-2 pt-8 flex items-center justify-center">
        <Link to="/" className="flex items-center justify-center mx-auto hover:opacity-90 transition-opacity">
          <img src={logo} alt="CTC Logo" className="h-16 w-auto object-contain drop-shadow-[0_0_12px_rgba(160,32,240,0.4)]" />
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
              onClick={() => {
                if (window.innerWidth < 1024) closeSidebar();
              }}
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
        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm font-medium w-full text-left">
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
