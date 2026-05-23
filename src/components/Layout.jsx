import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu, X } from 'lucide-react';
import logo from '../assets/logo.png';

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const getPageTitle = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes('products') || path.includes('packages')) return 'Packages';
    if (path.includes('kyc')) return 'KYC';
    if (path.includes('withdrawal')) return 'Withdrawal';
    if (path.includes('downline')) return 'Network';
    if (path.includes('referral-income')) return 'Referrals';
    if (path.includes('level-income')) return 'Level Income';
    if (path.includes('mining')) return 'Trade History';
    if (path.includes('package-history')) return 'Pkg History';
    if (path.includes('transactions')) return 'Transactions';
    if (path.includes('profile')) return 'Profile';
    return 'Dashboard';
  };

  return (
    <div className="flex min-h-screen bg-[#050505] overflow-x-hidden w-full">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} closeSidebar={() => setIsSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64 min-w-0">
        {/* Top Header - Mobile Only */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-[#0B0F1A] border-b border-gray-800 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <img src={logo} alt="CTC Logo" className="h-8 w-auto object-contain drop-shadow-[0_0_12px_rgba(160,32,240,0.4)]" />
            <span className="text-xs font-bold text-white tracking-widest uppercase">{getPageTitle()}</span>
          </div>
          <button 
            onClick={toggleSidebar}
            className="p-2 text-gray-400 hover:text-white bg-gray-800/50 rounded-lg"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        <main className="p-4 md:p-6 lg:p-8 w-full max-w-full overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
