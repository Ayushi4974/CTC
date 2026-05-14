const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Withdrawal = require('../models/Withdrawal');
const Package = require('../models/Package');
const KYC = require('../models/KYC');

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

module.exports = {
  getDashboardStats,
  getAllUsers,
  approveKYC,
  approveWithdrawal,
  createPackage
};
