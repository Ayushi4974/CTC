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
    isBVEligible: { type: Boolean, default: true }, // Strict BV rule
    isStaked: { type: Boolean, default: false }, // If true, eligible for auto compound
    stakingDuration: { type: Number, default: 0 }, // Duration in days (30, 90, 180, 360)
    isZeroPin: { type: Boolean, default: false },
    isStakingReleased: { type: Boolean, default: false },
    stakingEnabled: { type: Boolean, default: false },
    stakingPeriod: { type: Number, default: 0 },
    stakingStartDate: { type: Date },
    stakingEndDate: { type: Date },
    autoCompounding: { type: Boolean, default: false }
  }, { timestamps: true });

  module.exports = mongoose.model('UserPackage', userPackageSchema);
