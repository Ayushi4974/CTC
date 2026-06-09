const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
    },
    mobile: {
      type: String,
    },
    address: {
      type: String,
    },
    password: {
      type: String,
      required: true,
    },
    sponsorId: {
      type: String,
    },
    sponsor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    directTeam: {
      type: Number,
      default: 0,
    },
    totalTeam: {
      type: Number,
      default: 0,
    },
    level: {
      type: Number,
      default: 0,
    },
    rank: {
      type: String,
      default: 'None',
    },
    claimedRankBonuses: {
      type: [String],
      default: [],
    },
    walletAddress: {
      type: String,
    },
    isKYCVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    fastrackQualified: {
      type: Boolean,
      default: false,
    },
    totalInvestment: {
      type: Number,
      default: 0,
    },
    totalEarning: {
      type: Number,
      default: 0,
    },
    availableBalance: {
      type: Number,
      default: 0,
    },
    referralIncome: {
      type: Number,
      default: 0,
    },
    levelIncome: {
      type: Number,
      default: 0,
    },
    miningIncome: {
      type: Number,
      default: 0,
    },
    promotionalIncome: {
      type: Number,
      default: 0,
    },
    activePackage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    ipAddress: {
      type: String, // Used for Anti-Circular Sponsoring and Fraud Detection
    },
    lastIps: [{
      type: String, // Keep history for device/IP fingerprinting
    }],
    isBlocked: {
      type: Boolean,
      default: false,
    },
    pins: {
      type: Number,
      default: 1,
    },
    deviceFingerprint: {
      type: String
    }
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);
module.exports = User;
