const express = require('express');
const { getUserProfile, getTeam, getMiningHistory, getLevelIncomeHistory } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/profile').get(protect, getUserProfile);
router.route('/team').get(protect, getTeam);
router.route('/mining-history').get(protect, getMiningHistory);
router.route('/level-income').get(protect, getLevelIncomeHistory);
module.exports = router;
