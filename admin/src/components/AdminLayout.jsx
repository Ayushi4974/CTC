import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Box, CreditCard, History, 
  ShieldAlert, UserCheck, Network, Cpu, Settings, 
  Terminal, ShieldCheck, LogOut, Menu, X, Clock, Layers
} from 'lucide-react';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const adminUser = JSON.parse(localStorage.getItem('adminUser'));

  const handleLogout = () => {
    localStorage.removeItem('adminUser');
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'User Management', path: '/users', icon: Users },
    { name: 'Package Control', path: '/packages', icon: Box },
    { name: 'Package History', path: '/package-history', icon: Layers },
    { name: 'Withdrawals', path: '/withdrawals', icon: CreditCard },
    { name: 'KYC Verification', path: '/kyc', icon: UserCheck },
    { name: 'Referral & Level', path: '/referrals', icon: Network },
    { name: 'System Settings', path: '/settings', icon: Settings },
    { name: 'Cron Monitoring', path: '/cron', icon: Terminal },
    { name: 'Transactions Audit', path: '/transactions', icon: History },
  ];

  const currentItem = navItems.find(item => item.path === location.pathname) || { name: 'Admin Control Center' };

  return (
    <div className="min-h-screen bg-[#050505] flex">
      {/* Sidebar for Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0B0F1A] border-r border-[#A020F0]/10 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-20 flex items-center justify-between px-6 border-b border-[#A020F0]/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#A020F0] to-[#FF00FF] flex items-center justify-center shadow-[0_0_15px_rgba(160,32,240,0.5)]">
              <ShieldCheck className="text-white" size={20} />
            </div>
            <div>
              <span className="text-sm font-black tracking-widest text-white uppercase">CTC ADMIN</span>
              <span className="block text-[10px] text-[#FF00FF] font-bold tracking-tight uppercase">Management</span>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 hide-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all ${
                  isActive 
                    ? 'bg-[#A020F0]/10 border border-[#A020F0]/30 text-[#FF00FF] shadow-[0_0_15px_rgba(160,32,240,0.15)]' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#161B2A]/50 border border-transparent'
                }`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Admin Card */}
        <div className="p-4 border-t border-[#A020F0]/10 bg-[#070A12]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-[#FF00FF] font-bold text-xs uppercase border border-[#A020F0]/30">
                {adminUser?.email ? adminUser.email[0] : 'A'}
              </div>
              <div className="truncate w-32">
                <span className="block text-xs font-semibold text-white truncate">{adminUser?.email || 'Administrator'}</span>
                <span className="block text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Super Admin</span>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-20 bg-[#0B0F1A]/80 backdrop-blur-md border-b border-[#A020F0]/10 flex items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-xl font-bold text-white tracking-tight">{currentItem.name}</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-[#161B2A]/50 border border-gray-800 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400">
              <Clock size={14} className="text-[#FF00FF]" />
              <span>Server UTC: {new Date().toUTCString().substring(17, 25)}</span>
            </div>
            <div className="px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/30 text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
              System Live
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 hide-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
