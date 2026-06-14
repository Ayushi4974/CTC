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

  // Deposit Addresses
  depositAddressMetaMask: { type: String, default: '0x185018c5f26B2cE105e0B80b231178CE5913b621' },
  depositAddressBep20: { type: String, default: '0x8e4143b46eb1e1a6cbd71b5d57da95b985219f0b' },
  depositAddressTrc20: { type: String, default: 'TWJjGZJ73Q9x2hWpLRRreaxyvR9Eveoiv5' },
}, { timestamps: true });

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
