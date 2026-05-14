const express = require('express');
const {
  getDashboardStats,
  getAllUsers,
  approveKYC,
  approveWithdrawal,
  createPackage
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');
const router = express.Router();

router.route('/dashboard').get(protect, admin, getDashboardStats);
router.route('/users').get(protect, admin, getAllUsers);
router.route('/kyc/:id/approve').put(protect, admin, approveKYC);
router.route('/withdrawal/:id/approve').put(protect, admin, approveWithdrawal);
router.route('/package/create').post(protect, admin, createPackage);

module.exports = router;
