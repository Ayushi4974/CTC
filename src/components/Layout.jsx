import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
  return (
    <div className="flex min-h-screen bg-[#050505]">
      <Sidebar />
      <main className="flex-1 ml-64 p-6 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
