import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu, X } from 'lucide-react';

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex min-h-screen bg-[#050505]">
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
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
        {/* Top Header - Mobile Only */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-[#0B0F1A] border-b border-gray-800 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#FF00FF]">
              $
            </span>
            <span className="text-xs font-bold text-white tracking-widest uppercase">Dashboard</span>
          </div>
          <button 
            onClick={toggleSidebar}
            className="p-2 text-gray-400 hover:text-white bg-gray-800/50 rounded-lg"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        <main className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
