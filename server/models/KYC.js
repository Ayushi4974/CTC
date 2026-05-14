const mongoose = require('mongoose');

const kycSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  aadhaarFront: { type: String },
  aadhaarBack: { type: String },
  panCard: { type: String },
  bankName: { type: String },
  accountNumber: { type: String },
  ifscCode: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('KYC', kycSchema);
