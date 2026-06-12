import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Packages from './pages/Packages';
import Withdrawals from './pages/Withdrawals';
import Kyc from './pages/Kyc';
import Referrals from './pages/Referrals';
import Mining from './pages/Mining';
import Settings from './pages/Settings';
import Cron from './pages/Cron';
import Fraud from './pages/Fraud';
import Transactions from './pages/Transactions';
import PackageHistory from './pages/PackageHistory';
import ManualBuys from './pages/ManualBuys';
import Login from './pages/Login';

const ProtectedRoute = ({ children }) => {
  const adminUser = JSON.parse(localStorage.getItem('adminUser'));
  if (!adminUser || adminUser.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter basename="/admin">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="packages" element={<Packages />} />
          <Route path="package-history" element={<PackageHistory />} />
          <Route path="manual-buys" element={<ManualBuys />} />
          <Route path="withdrawals" element={<Withdrawals />} />
          <Route path="kyc" element={<Kyc />} />
          <Route path="referrals" element={<Referrals />} />
          <Route path="mining" element={<Mining />} />
          <Route path="settings" element={<Settings />} />
          <Route path="cron" element={<Cron />} />
          <Route path="fraud" element={<Fraud />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
