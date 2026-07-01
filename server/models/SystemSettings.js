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
  transparencyProfitsThisWeek: { type: String, default: '+0.82%' },
  transparencyProfitsLastWeek: { type: String, default: '+5.28%' },
  transparencyProfitsLast30Days: { type: String, default: '+16.10%' },
  transparencyPerformanceOverview: { type: String, default: '17.33%' },
  transparencyChartData: {
    type: [{
      period: { type: String, enum: ['week', 'month', '3m', '6m', 'year', 'all'] },
      label: { type: String },
      value: { type: Number }
    }],
    default: [
      { period: 'month', label: '0', value: 0 },
      { period: 'month', label: '2', value: 0 },
      { period: 'month', label: '4', value: 1.5 },
      { period: 'month', label: '6', value: 3.8 },
      { period: 'month', label: '8', value: 3.5 },
      { period: 'month', label: '10', value: 5.5 },
      { period: 'month', label: '12', value: 8.0 },
      { period: 'month', label: '14', value: 9.8 },
      { period: 'month', label: '16', value: 9.5 },
      { period: 'month', label: '18', value: 10.5 },
      { period: 'month', label: '20', value: 9.0 },
      { period: 'month', label: '22', value: 10.5 },
      { period: 'month', label: '24', value: 10.5 },
      { period: 'month', label: '26', value: 11.5 },
      { period: 'month', label: '28', value: 16.0 },
      { period: 'month', label: '31', value: 17.33 }
    ]
  },
  liveTradingFeed: {
    type: [{
      asset: { type: String },
      time: { type: String },
      openPrice: { type: Number },
      closePrice: { type: Number }
    }],
    default: [
      { asset: 'ETH', time: '21:10:34', openPrice: 1580.01, closePrice: 1580.18 },
      { asset: 'BTC', time: '21:10:20', openPrice: 59812.01, closePrice: 59817.33 },
      { asset: 'BTC', time: '21:10:17', openPrice: 59844.04, closePrice: 59826.00 },
      { asset: 'ETH', time: '21:10:17', openPrice: 1581.63, closePrice: 1581.08 },
      { asset: 'XRP', time: '21:10:17', openPrice: 1.0506, closePrice: 1.0498 }
    ]
  }
}, { timestamps: true });

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
