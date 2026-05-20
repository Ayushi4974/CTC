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
import Login from './pages/Login';
import Register from './pages/Register';
import PackageHistory from './pages/PackageHistory';
import PromotionalBonusHistory from './pages/PromotionalBonusHistory';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setWalletAddress } from './redux/slices/authSlice';

const ProtectedRoute = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          dispatch(setWalletAddress(accounts[0]));
        } else {
          dispatch(setWalletAddress(null));
        }
      });
      
      // Check initial connection
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => {
        if (accounts && accounts.length > 0) {
          dispatch(setWalletAddress(accounts[0]));
        } else {
          dispatch(setWalletAddress(null));
        }
      }).catch((err) => {
        console.error(err);
        dispatch(setWalletAddress(null));
      });
    } else {
      dispatch(setWalletAddress(null));
    }
  }, [dispatch]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
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
          <Route path="package-history" element={<PackageHistory />} />
          <Route path="promotional-bonus" element={<PromotionalBonusHistory />} />
          {/* Add placeholders for other routes */}
          <Route path="*" element={<div className="p-8 text-text-secondary text-center">Coming Soon</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
