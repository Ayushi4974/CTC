const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  // Treasury Controls
  maintenanceMode: { type: Boolean, default: false },
  payoutPause: { type: Boolean, default: false },
  withdrawalFreeze: { type: Boolean, default: false },
  treasuryProtectionMode: { type: Boolean, default: false },
  
  // Dynamic ROI Adjustment
  globalRoiMultiplier: { type: Number, default: 1.0 }, // Can be reduced to 0.5 in emergencies
  
  // Withdrawal Limits
  minWithdrawalAmount: { type: Number, default: 10 },
  maxDailyWithdrawalAmount: { type: Number, default: 10000 },
  withdrawalCooldownHours: { type: Number, default: 24 },
  treasuryPercentageWithdrawalLimit: { type: Number, default: 5 }, // Max 5% of reserves per day
  manualWithdrawalApproval: { type: Boolean, default: true }, // If true, all withdrawals require admin approval

  // Treasury Health
  treasuryReserves: { type: Number, default: 0 }, // Total USDT in hot/cold wallets
  emergencyThreshold: { type: Number, default: 10000 }, // Trigger emergency mode below this
  announcementImage: { type: String, default: '' },
  announcementImages: { type: [String], default: [] },
  announcementContent: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
