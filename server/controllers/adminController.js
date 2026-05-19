const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Withdrawal = require('../models/Withdrawal');
const Package = require('../models/Package');
const KYC = require('../models/KYC');
const SystemSettings = require('../models/SystemSettings');
const AuditLog = require('../models/AuditLog');
const UserPackage = require('../models/UserPackage');

const getDashboardStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    
    const deposits = await Transaction.aggregate([
      { $match: { type: 'deposit', status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const withdrawals = await Withdrawal.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const activePackages = await Package.countDocuments({ status: true });

    res.json({
      totalUsers,
      activeUsers,
      totalDeposits: deposits[0] ? deposits[0].total : 0,
      totalWithdrawals: withdrawals[0] ? withdrawals[0].total : 0,
      activePackages
    });
  } catch (error) {
    next(error);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    next(error);
  }
};

const approveKYC = async (req, res, next) => {
  try {
    const kyc = await KYC.findById(req.params.id);
    if (!kyc) return res.status(404).json({ message: 'KYC not found' });

    kyc.status = 'approved';
    kyc.verifiedBy = req.user._id;
    await kyc.save();

    const user = await User.findById(kyc.user);
    if (user) {
      user.isKYCVerified = true;
      await user.save();
    }

    res.json({ message: 'KYC Approved', kyc });
  } catch (error) {
    next(error);
  }
};

const approveWithdrawal = async (req, res, next) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) return res.status(404).json({ message: 'Withdrawal not found' });

    withdrawal.status = 'approved';
    withdrawal.approvedBy = req.user._id;
    withdrawal.approvedAt = Date.now();
    await withdrawal.save();

    await Transaction.create({
      userId: withdrawal.userId,
      user: withdrawal.user,
      type: 'withdrawal',
      amount: withdrawal.amount,
      status: 'success',
      walletAddress: withdrawal.walletAddress
    });

    const io = req.app.get('io');
    if (io) {
      io.to(withdrawal.user.toString()).emit('notification', `Your withdrawal of ${withdrawal.amount} has been approved.`);
    }

    res.json({ message: 'Withdrawal Approved', withdrawal });
  } catch (error) {
    next(error);
  }
};

const createPackage = async (req, res, next) => {
  try {
    const pkg = await Package.create(req.body);
    res.status(201).json({ message: 'Package created', pkg });
  } catch (error) {
    next(error);
  }
};

const getTreasuryStats = async (req, res, next) => {
  try {
    const settings = await SystemSettings.findOne() || await SystemSettings.create({});
    
    // Active liabilities: total pending ROI remaining across all active packages
    const activePackages = await UserPackage.find({ status: 'active' });
    let activeLiabilities = 0;
    activePackages.forEach(pkg => {
      const remainingCap = (pkg.amount * 4) - pkg.totalEarned;
      if (remainingCap > 0) activeLiabilities += remainingCap;
    });

    const pendingWithdrawals = await Withdrawal.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const todaysWithdrawals = await Withdrawal.aggregate([
      { $match: { status: { $in: ['approved', 'completed'] }, createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      settings,
      activeLiabilities,
      pendingPayouts: pendingWithdrawals[0] ? pendingWithdrawals[0].total : 0,
      dailyWithdrawals: todaysWithdrawals[0] ? todaysWithdrawals[0].total : 0,
      treasuryReserves: settings.treasuryReserves,
      riskAlerts: settings.treasuryReserves < settings.emergencyThreshold ? ['RESERVES_CRITICAL'] : []
    });
  } catch (error) {
    next(error);
  }
};

const updateTreasurySettings = async (req, res, next) => {
  try {
    const updates = req.body;
    let settings = await SystemSettings.findOne();
    if (!settings) settings = await SystemSettings.create({});
    
    const allowedFields = [
      'maintenanceMode', 'payoutPause', 'withdrawalFreeze', 'treasuryProtectionMode',
      'globalRoiMultiplier', 'minWithdrawalAmount', 'maxDailyWithdrawalAmount',
      'withdrawalCooldownHours', 'manualWithdrawalApproval', 'treasuryReserves', 'emergencyThreshold'
    ];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        settings[field] = updates[field];
      }
    });

    await settings.save();
    
    await AuditLog.create({
      action: 'TREASURY_MODE_CHANGE',
      adminId: req.user._id,
      details: { updates }
    });

    res.json({ message: 'Treasury settings updated successfully', settings });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  approveKYC,
  approveWithdrawal,
  createPackage,
  getTreasuryStats,
  updateTreasurySettings
};

