const express = require('express');
const {
  adminLogin,
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
  deleteUser,
  impersonateUser,
  assignPackage,
  getAllManualBuys,
  approveManualBuy,
  rejectManualBuy,
  togglePrincipalWithdrawal
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');
const upload = require('../middleware/uploadMiddleware');
const router = express.Router();

// Public Admin Login (admin-only, separate from user login)
router.post('/login', adminLogin);

router.route('/dashboard').get(protect, admin, getDashboardStats);
router.route('/users').get(protect, admin, getAllUsers);
router.route('/user/:id')
  .put(protect, admin, updateUser)
  .delete(protect, admin, deleteUser);
router.route('/user/:id/block').put(protect, admin, toggleBlockUser);
router.route('/user/:id/principal-withdrawal').put(protect, admin, togglePrincipalWithdrawal);
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
router.post('/upload-announcement', protect, admin, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const getFileUrl = (file) => {
      if (!file) return null;
      if (file.path && file.path.startsWith('http')) return file.path;
      if (file.filename) return `/uploads/${file.filename}`;
      if (file.path) return file.path;
      return null;
    };
    const fileUrl = getFileUrl(req.file);
    res.json({ imageUrl: fileUrl });
  } catch (error) {
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// Cron Control Routes
router.route('/cron/status').get(protect, admin, getCronStatus);
router.route('/cron/trigger').post(protect, admin, triggerMiningCron);

// Transaction History Routes
router.route('/transactions').get(protect, admin, getAllTransactions);

// Manual Buy Routes
router.route('/manual-buys').get(protect, admin, getAllManualBuys);
router.route('/manual-buys/:id/approve').put(protect, admin, approveManualBuy);
router.route('/manual-buys/:id/reject').put(protect, admin, rejectManualBuy);

module.exports = router;
