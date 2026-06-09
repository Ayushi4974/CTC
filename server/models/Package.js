const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  minAmount: { type: Number, required: true },
  maxAmount: { type: Number, required: true },
  dailyProfit: { type: Number, required: true }, // percentage
  validity: { type: Number, required: true }, // days
  isReferralOnly: { type: Boolean, default: false },
  isZeroPin: { type: Boolean, default: false },
  status: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Package', packageSchema);
