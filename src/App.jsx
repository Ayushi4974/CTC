import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Kyc from './pages/Kyc';
import Withdrawal from './pages/Withdrawal';
import Downline from './pages/Downline';
import ReferralIncome from './pages/ReferralIncome';
import Transactions from './pages/Transactions';
import Profile from './pages/Profile';
import LevelIncome from './pages/LevelIncome';
import MiningHistory from './pages/MiningHistory';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="kyc" element={<Kyc />} />
          <Route path="withdrawal" element={<Withdrawal />} />
          <Route path="downline" element={<Downline />} />
          <Route path="referral-income" element={<ReferralIncome />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="profile" element={<Profile />} />
          <Route path="level-income" element={<LevelIncome />} />
          <Route path="mining" element={<MiningHistory />} />
          {/* Add placeholders for other routes */}
          <Route path="*" element={<div className="p-8 text-text-secondary text-center">Coming Soon</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
