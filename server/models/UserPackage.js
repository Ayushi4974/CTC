const mongoose = require('mongoose');

const userPackageSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
  amount: { type: Number, required: true }, // Original Deposit
  compoundingBalance: { type: Number, required: true }, // Growing Balance
  dailyProfitPercent: { type: Number, required: true },
  totalEarned: { type: Number, default: 0 },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  status: { type: String, enum: ['active', 'expired', 'cancelled', 'completed', 'upgraded'], default: 'active' },
  isBVEligible: { type: Boolean, default: true } // Strict BV rule
}, { timestamps: true });

module.exports = mongoose.model('UserPackage', userPackageSchema);
