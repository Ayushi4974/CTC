const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const SystemSettings = require('../models/SystemSettings');
const AuditLog = require('../models/AuditLog');
const activeWithdrawals = new Set();

const requestWithdrawal = async (req, res, next) => {
  const userIdStr = req.user._id.toString();
  if (activeWithdrawals.has(userIdStr)) {
    return res.status(400).json({ message: 'A withdrawal request is already in progress for this user.' });
  }
  activeWithdrawals.add(userIdStr);

  try {
    const { amount, walletAddress, type = 'profit', userPackageId } = req.body;
    const user = await User.findById(req.user._id);

    if (!user.isKYCVerified) {
      return res.status(403).json({ message: 'Identity verification (KYC) is mandatory for all withdrawals.' });
    }
    
    // 1. Fetch System Settings for Global Controls
    const settings = await SystemSettings.findOne() || await SystemSettings.create({});
    
    if (settings.withdrawalFreeze) {
      await AuditLog.create({ action: 'PAYOUT_FAILURE', userId: user._id, details: { reason: 'Withdrawal freeze active' } });
      return res.status(403).json({ message: 'Withdrawals are temporarily paused for treasury protection.' });
    }

    if (amount < settings.minWithdrawalAmount) {
      return res.status(400).json({ message: `Minimum withdrawal amount is ${settings.minWithdrawalAmount}` });
    }
    
    // 2. User-specific Daily Throttling & Cooldowns
    const now = new Date();
    const todayStart = new Date(now.setHours(0,0,0,0));
    
    const todaysWithdrawals = await Withdrawal.aggregate([
      { $match: { user: user._id, createdAt: { $gte: todayStart }, status: { $in: ['pending', 'completed', 'approved'] } } },
      { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
    ]);
    
    const todayTotal = todaysWithdrawals.length ? todaysWithdrawals[0].totalAmount : 0;
    if (todayTotal + amount > settings.maxDailyWithdrawalAmount) {
      await AuditLog.create({ action: 'PAYOUT_FAILURE', userId: user._id, details: { reason: 'Daily withdrawal limit exceeded', amount } });
      return res.status(400).json({ message: `Daily withdrawal limit of ${settings.maxDailyWithdrawalAmount} exceeded` });
    }
    
    const lastWithdrawal = await Withdrawal.findOne({ user: user._id }).sort({ createdAt: -1 });
    if (lastWithdrawal && process.env.NODE_ENV === 'production') {
      const hoursSinceLast = (Date.now() - new Date(lastWithdrawal.createdAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLast < settings.withdrawalCooldownHours) {
        return res.status(400).json({ message: `Please wait ${settings.withdrawalCooldownHours} hours between withdrawal requests.` });
      }
    }

    let targetAmount = amount;
    let userPkg = null;

    if (type === 'principal') {
      if (!userPackageId) {
        return res.status(400).json({ message: 'Package ID required for principal withdrawal' });
      }
      const UserPackage = require('../models/UserPackage');
      userPkg = await UserPackage.findOne({ _id: userPackageId, user: user._id, status: 'active' });
      
      if (!userPkg) {
        return res.status(400).json({ message: 'Active package not found' });
      }
      targetAmount = userPkg.amount;
    }

    if (type === 'profit') {
      if (targetAmount % 10 !== 0 && process.env.NODE_ENV === 'production') {
        return res.status(400).json({ message: 'Withdrawal amount must be a multiple of 10' });
      }
    }

    let deductionPercent = 10;
    if (type === 'principal') {
      deductionPercent = 20;
    }

    const deduction = (targetAmount * deductionPercent) / 100;
    const finalAmount = targetAmount - deduction;

    if (type === 'profit') {
      if (user.availableBalance < targetAmount) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }
      user.availableBalance -= targetAmount;
    } else if (type === 'principal') {
      const timeElapsed = Date.now() - new Date(userPkg.createdAt).getTime();
      const hoursElapsed = timeElapsed / (1000 * 60 * 60);
      if (hoursElapsed < 24 && process.env.NODE_ENV === 'production') {
        return res.status(400).json({ message: 'Your initial capital can only be withdrawn after a 24-hour period.' });
      }

      // Mark package as cancelled or reduce capital
      userPkg.status = 'cancelled';
      await userPkg.save();
      user.totalInvestment -= userPkg.amount;
      user.isActive = user.totalInvestment > 0;
    }

    await user.save();

    const withdrawal = await Withdrawal.create({
      userId: user.userId,
      user: user._id,
      amount: targetAmount,
      deduction,
      finalAmount,
      walletAddress,
      type,
      status: settings.manualWithdrawalApproval !== false ? 'pending' : 'approved'
    });
    
    await AuditLog.create({
      action: 'WITHDRAWAL',
      userId: user._id,
      amount: targetAmount,
      details: { withdrawalId: withdrawal._id, type, finalAmount, requiresManualApproval: settings.manualWithdrawalApproval }
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('new_withdrawal_request', { user: user.userId, amount: targetAmount });
    }

    res.status(201).json({ message: 'Withdrawal requested successfully', withdrawal });
  } catch (error) {
    next(error);
  } finally {
    activeWithdrawals.delete(userIdStr);
  }
};

const getWithdrawalHistory = async (req, res, next) => {
  try {
    const withdrawals = await Withdrawal.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(withdrawals);
  } catch (error) {
    next(error);
  }
};

module.exports = { requestWithdrawal, getWithdrawalHistory };
