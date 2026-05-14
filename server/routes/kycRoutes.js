const express = require('express');
const { uploadKYC, getKYCStatus } = require('../controllers/kycController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const router = express.Router();

router.route('/upload').post(protect, upload.fields([
  { name: 'profile', maxCount: 1 },
  { name: 'aadharFront', maxCount: 1 },
  { name: 'aadharBack', maxCount: 1 },
  { name: 'panFront', maxCount: 1 },
  { name: 'panAgreement', maxCount: 1 }
]), uploadKYC);
router.route('/status').get(protect, getKYCStatus);

module.exports = router;
