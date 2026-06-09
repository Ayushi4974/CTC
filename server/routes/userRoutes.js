const express = require('express');
const { 
  getUserProfile, 
  getTeam, 
  getMiningHistory, 
  getLevelIncomeHistory, 
  updateUserProfile, 
  changePassword,
  getAnnouncement
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);
router.route('/change-password').put(protect, changePassword);
router.route('/team').get(protect, getTeam);
router.route('/mining-history').get(protect, getMiningHistory);
router.route('/level-income').get(protect, getLevelIncomeHistory);
router.route('/announcement').get(protect, getAnnouncement);
module.exports = router;
