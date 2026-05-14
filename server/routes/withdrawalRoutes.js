const express = require('express');
const { requestWithdrawal, getWithdrawalHistory } = require('../controllers/withdrawalController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/request').post(protect, requestWithdrawal);
router.route('/history').get(protect, getWithdrawalHistory);

module.exports = router;
