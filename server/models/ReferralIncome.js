const mongoose = require('mongoose');

const referralIncomeSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fromUserId: { type: String },
  packageAmount: { type: Number },
  percentage: { type: Number },
  income: { type: Number, required: true },
  level: { type: Number, default: 1 }
}, { timestamps: true });

module.exports = mongoose.model('ReferralIncome', referralIncomeSchema);
