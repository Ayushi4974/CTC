const express = require('express');
const { getTransactionHistory } = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/history').get(protect, getTransactionHistory);

module.exports = router;
