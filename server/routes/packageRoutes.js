const express = require('express');
const { getAllPackages, buyPackage, getUserPackages, startStaking } = require('../controllers/packageController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/all').get(protect, getAllPackages);
router.route('/buy').post(protect, buyPackage);
router.route('/my-packages').get(protect, getUserPackages);
router.route('/start-staking').post(protect, startStaking);

module.exports = router;
