const express = require('express');
const {
  getDashboardStats,
  getAllUsers,
  approveKYC,
  rejectKYC,
  approveWithdrawal,
  rejectWithdrawal,
  createPackage,
  getTreasuryStats,
  updateTreasurySettings,
  toggleBlockUser,
  getAllWithdrawals,
  getAllKYCs,
  getAllPackages,
  getUserPackages,
  updatePackage,
  getCronStatus,
  triggerMiningCron,
  getAllTransactions,
  updateUser,
  impersonateUser,
  assignPackage
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');
const router = express.Router();

router.route('/dashboard').get(protect, admin, getDashboardStats);
router.route('/users').get(protect, admin, getAllUsers);
router.route('/user/:id').put(protect, admin, updateUser);
router.route('/user/:id/block').put(protect, admin, toggleBlockUser);
router.route('/user/:id/impersonate').post(protect, admin, impersonateUser);
router.route('/package/assign').post(protect, admin, assignPackage);

// KYC Routes
router.route('/kycs').get(protect, admin, getAllKYCs);
router.route('/kyc/:id/approve').put(protect, admin, approveKYC);
router.route('/kyc/:id/reject').put(protect, admin, rejectKYC);

// Withdrawal Routes
router.route('/withdrawals').get(protect, admin, getAllWithdrawals);
router.route('/withdrawal/:id/approve').put(protect, admin, approveWithdrawal);
router.route('/withdrawal/:id/reject').put(protect, admin, rejectWithdrawal);

// Package Control Routes
router.route('/packages').get(protect, admin, getAllPackages);
router.route('/user-packages').get(protect, admin, getUserPackages);
router.route('/package/create').post(protect, admin, createPackage);
router.route('/package/:id').put(protect, admin, updatePackage);

// Treasury Routes
router.route('/treasury/stats').get(protect, admin, getTreasuryStats);
router.route('/treasury/settings').put(protect, admin, updateTreasurySettings);

// Cron Control Routes
router.route('/cron/status').get(protect, admin, getCronStatus);
router.route('/cron/trigger').post(protect, admin, triggerMiningCron);

// Transaction History Routes
router.route('/transactions').get(protect, admin, getAllTransactions);

module.exports = router;
