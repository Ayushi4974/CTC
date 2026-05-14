const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: { type: Number, required: true },
  deduction: { type: Number, required: true },
  finalAmount: { type: Number, required: true },
  walletAddress: { type: String, required: true },
  type: { type: String, enum: ['profit', 'principal'], default: 'profit' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
