const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');

const requestWithdrawal = async (req, res, next) => {
  try {
    const { amount, walletAddress, type = 'profit', userPackageId } = req.body;
    const user = await User.findById(req.user._id);

    if (!user.isKYCVerified) {
      return res.status(403).json({ message: 'Identity verification (KYC) is mandatory for all withdrawals.' });
    }

    if (amount < 10) {
      return res.status(400).json({ message: 'Minimum withdrawal amount is 10' });
    }

    if (amount % 10 !== 0) {
      return res.status(400).json({ message: 'Withdrawal amount must be a multiple of 10' });
    }

    let deductionPercent = 10;
    if (type === 'principal') {
      deductionPercent = 20;
    }

    const deduction = (amount * deductionPercent) / 100;
    const finalAmount = amount - deduction;

    if (type === 'profit') {
      if (user.availableBalance < amount) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }
      user.availableBalance -= amount;
    } else if (type === 'principal') {
      if (!userPackageId) {
        return res.status(400).json({ message: 'Package ID required for principal withdrawal' });
      }
      const UserPackage = require('../models/UserPackage');
      const userPkg = await UserPackage.findOne({ _id: userPackageId, user: user._id, status: 'active' });
      
      if (!userPkg) {
        return res.status(400).json({ message: 'Active package not found' });
      }
      
      const timeElapsed = Date.now() - new Date(userPkg.createdAt).getTime();
      const hoursElapsed = timeElapsed / (1000 * 60 * 60);
      if (hoursElapsed < 24) {
        return res.status(400).json({ message: 'Your initial capital can only be withdrawn after a 24-hour period.' });
      }

      if (userPkg.amount < amount) {
        return res.status(400).json({ message: 'Requested amount exceeds package capital' });
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
      amount,
      deduction,
      finalAmount,
      walletAddress,
      type
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('new_withdrawal_request', { user: user.userId, amount });
    }

    res.status(201).json({ message: 'Withdrawal requested successfully', withdrawal });
  } catch (error) {
    next(error);
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
