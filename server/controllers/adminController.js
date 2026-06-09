const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Withdrawal = require('../models/Withdrawal');
const Package = require('../models/Package');
const KYC = require('../models/KYC');
const SystemSettings = require('../models/SystemSettings');
const AuditLog = require('../models/AuditLog');
const UserPackage = require('../models/UserPackage');
const CronState = require('../models/CronState');
const ReferralIncome = require('../models/ReferralIncome');
const MiningIncome = require('../models/MiningIncome');
const { verifyWithdrawalTransaction } = require('../services/blockchainService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateAdminToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// @desc    Authenticate an admin user only
// @route   POST /api/admin/login
// @access  Public
const adminLogin = async (req, res, next) => {
  try {
    const { userId, password } = req.body;
    if (!userId || !password) {
      return res.status(400).json({ message: 'Please provide User ID and password.' });
    }

    const searchId = userId.trim().toUpperCase();
    const user = await User.findOne({ userId: searchId });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access Denied: Not authorized as Administrator.' });
    }

    return res.json({
      _id: user.id,
      userId: user.userId,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      token: generateAdminToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

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

    // Aggregate last 7 days of daily trends
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyDeposits = await Transaction.aggregate([
      { $match: { type: 'deposit', status: 'success', createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const dailyWithdrawals = await Withdrawal.aggregate([
      { $match: { status: 'approved', createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const dailyRoi = await MiningIncome.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split('T')[0];

      const depositObj = dailyDeposits.find(x => x._id === dateString);
      const withdrawalObj = dailyWithdrawals.find(x => x._id === dateString);
      const roiObj = dailyRoi.find(x => x._id === dateString);

      chartData.push({
        name: dateString.split('-').slice(1).join('/'),
        deposits: depositObj ? depositObj.total : 0,
        withdrawals: withdrawalObj ? withdrawalObj.total : 0,
        roi: roiObj ? roiObj.total : 0
      });
    }

    res.json({
      totalUsers,
      activeUsers,
      totalDeposits: deposits[0] ? deposits[0].total : 0,
      totalWithdrawals: withdrawals[0] ? withdrawals[0].total : 0,
      activePackages,
      chartData
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
    const { txHash } = req.body;
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) return res.status(404).json({ message: 'Withdrawal not found' });

    if (!txHash) {
      return res.status(400).json({ message: 'Transaction hash is required to approve and release the withdrawal.' });
    }

    // Check for duplicate transaction
    const existingTx = await Transaction.findOne({ txHash });
    if (existingTx) {
      return res.status(400).json({ message: 'This transaction hash has already been used. Duplicate transactions are not allowed.' });
    }

    // Verify withdrawal payout transaction on blockchain
    const verification = await verifyWithdrawalTransaction(txHash, withdrawal.finalAmount, withdrawal.walletAddress);
    if (!verification.status) {
      return res.status(400).json({ message: verification.message });
    }

    withdrawal.status = 'approved';
    withdrawal.approvedBy = req.user._id;
    withdrawal.approvedAt = Date.now();
    withdrawal.txHash = txHash;
    await withdrawal.save();

    await Transaction.create({
      userId: withdrawal.userId,
      user: withdrawal.user,
      type: 'withdrawal',
      amount: withdrawal.amount,
      status: 'success',
      walletAddress: withdrawal.walletAddress,
      txHash,
      chainId: verification.chainId,
      tokenContract: verification.tokenContract,
      blockNumber: verification.blockNumber,
      confirmationCount: verification.confirmationCount
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
      'withdrawalCooldownHours', 'manualWithdrawalApproval', 'treasuryReserves', 
      'emergencyThreshold', 'announcementImage', 'announcementImages', 'announcementContent'
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

const rejectKYC = async (req, res, next) => {
  try {
    const kyc = await KYC.findById(req.params.id);
    if (!kyc) return res.status(404).json({ message: 'KYC not found' });

    kyc.status = 'rejected';
    kyc.verifiedBy = req.user._id;
    await kyc.save();

    const user = await User.findById(kyc.user);
    if (user) {
      user.isKYCVerified = false;
      await user.save();
    }

    res.json({ message: 'KYC Rejected', kyc });
  } catch (error) {
    next(error);
  }
};

const rejectWithdrawal = async (req, res, next) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) return res.status(404).json({ message: 'Withdrawal not found' });

    withdrawal.status = 'rejected';
    withdrawal.approvedBy = req.user._id;
    withdrawal.approvedAt = Date.now();
    await withdrawal.save();

    // Revert availableBalance back to the user
    const user = await User.findById(withdrawal.user);
    if (user) {
      user.availableBalance += withdrawal.amount;
      await user.save();
    }

    await Transaction.create({
      userId: withdrawal.userId,
      user: withdrawal.user,
      type: 'bonus', // Revert transactions
      amount: withdrawal.amount,
      status: 'failed',
      description: 'Withdrawal rejected & refunded'
    });

    res.json({ message: 'Withdrawal Rejected', withdrawal });
  } catch (error) {
    next(error);
  }
};

const toggleBlockUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isBlocked = !user.isBlocked;
    await user.save();

    await AuditLog.create({
      action: user.isBlocked ? 'BLOCK_USER' : 'UNBLOCK_USER',
      adminId: req.user._id,
      details: { targetUser: user.userId }
    });

    res.json({ message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`, user });
  } catch (error) {
    next(error);
  }
};

const getAllWithdrawals = async (req, res, next) => {
  try {
    const withdrawals = await Withdrawal.find().populate('user', 'email fullName userId');
    res.json(withdrawals);
  } catch (error) {
    next(error);
  }
};

const getAllKYCs = async (req, res, next) => {
  try {
    const kycs = await KYC.find().populate('user', 'email fullName userId phone mobile profilePic');
    res.json(kycs);
  } catch (error) {
    next(error);
  }
};

const getAllPackages = async (req, res, next) => {
  try {
    const packages = await Package.find();
    res.json(packages);
  } catch (error) {
    next(error);
  }
};

const getUserPackages = async (req, res, next) => {
  try {
    const userPackages = await UserPackage.find()
      .populate('user', 'email fullName userId')
      .populate('packageId')
      .sort({ createdAt: -1 });
    res.json(userPackages);
  } catch (error) {
    next(error);
  }
};

const updatePackage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pkg = await Package.findByIdAndUpdate(id, req.body, { new: true });
    res.json({ message: 'Package updated', pkg });
  } catch (error) {
    next(error);
  }
};

const getCronStatus = async (req, res, next) => {
  try {
    const states = await CronState.find();
    res.json(states);
  } catch (error) {
    next(error);
  }
};

const triggerMiningCron = async (req, res, next) => {
  try {
    const { runMiningCronCycle } = require('../cron/miningCron');
    const result = await runMiningCronCycle(true); // force = true
    res.json({ message: 'Mining cron manually executed', result });
  } catch (error) {
    next(error);
  }
};

const impersonateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });

    res.json({
      _id: user._id,
      userId: user.userId,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isKYCVerified: user.isKYCVerified,
      token,
    });
  } catch (error) {
    next(error);
  }
};

const getAllTransactions = async (req, res, next) => {
  try {
    const txsPromise = Transaction.find().populate('user', 'email fullName userId');
    const pkgsPromise = UserPackage.find().populate('user', 'email fullName userId').populate('packageId');
    const referralsPromise = ReferralIncome.find().populate('user', 'email fullName userId');

    const [txs, pkgs, referrals] = await Promise.all([txsPromise, pkgsPromise, referralsPromise]);

    const investmentHistory = pkgs.map(pkg => ({
      _id: pkg._id,
      userId: pkg.user?.userId || 'N/A',
      user: pkg.user,
      type: 'investment',
      description: `Purchased ${pkg.packageId?.name || 'Standard Package'}`,
      amount: pkg.amount,
      txHash: pkg.txHash || 'System',
      status: pkg.status === 'cancelled' ? 'failed' : 'success',
      createdAt: pkg.startDate || pkg.createdAt
    }));

    const referralHistory = referrals.map(ref => ({
      _id: ref._id,
      userId: ref.user?.userId || 'N/A',
      user: ref.user,
      type: 'referral',
      description: `Direct Referral Commission from ${ref.fromUserId}`,
      amount: ref.income,
      txHash: 'System',
      status: 'success',
      createdAt: ref.createdAt
    }));

    const formattedTxs = txs.map(tx => {
      const txObj = tx.toObject();
      if (!txObj.description) {
        if (txObj.type === 'deposit') txObj.description = 'Account Funding';
        else if (txObj.type === 'withdrawal') txObj.description = 'Funds Withdrawal';
        else if (txObj.type === 'bonus') txObj.description = 'Rank Achievement Bonus';
        else if (txObj.type === 'salary') txObj.description = 'Leadership Salary';
        else txObj.description = 'Platform Activity';
      }
      return {
        ...txObj,
        userId: txObj.user?.userId || txObj.userId || 'N/A'
      };
    });

    const combinedHistory = [...formattedTxs, ...investmentHistory, ...referralHistory]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(combinedHistory);
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      fullName,
      email,
      isActive,
      availableBalance,
      miningIncome,
      referralIncome,
      levelIncome,
      promotionalIncome,
      sponsorId,
      rank,
      pins
    } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (fullName !== undefined) user.fullName = fullName;
    if (email !== undefined) user.email = email;
    if (isActive !== undefined) user.isActive = isActive;
    if (availableBalance !== undefined) user.availableBalance = Number(availableBalance);
    if (miningIncome !== undefined) user.miningIncome = Number(miningIncome);
    if (referralIncome !== undefined) user.referralIncome = Number(referralIncome);
    if (levelIncome !== undefined) user.levelIncome = Number(levelIncome);
    if (promotionalIncome !== undefined) user.promotionalIncome = Number(promotionalIncome);
    if (rank !== undefined) user.rank = rank;
    if (pins !== undefined) user.pins = Number(pins);

    if (sponsorId !== undefined && sponsorId !== user.sponsorId) {
      const cleanSponsorId = sponsorId ? sponsorId.trim().toUpperCase() : '';
      user.sponsorId = cleanSponsorId;
      if (cleanSponsorId) {
        const sponsorUser = await User.findOne({ userId: cleanSponsorId });
        if (sponsorUser) {
          user.sponsor = sponsorUser._id;
        } else {
          return res.status(400).json({ message: `Sponsor ID ${sponsorId} does not exist.` });
        }
      } else {
        user.sponsor = null;
      }
    }

    await user.save();

    await AuditLog.create({
      action: 'ADMIN_UPDATE_USER',
      adminId: req.user._id,
      details: { targetUser: user.userId, updates: req.body }
    });

    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    next(error);
  }
};

const assignPackage = async (req, res, next) => {
  try {
    const { userId, packageId, amount, stakingDuration } = req.body;

    if (!userId || !packageId || !amount) {
      return res.status(400).json({ message: 'User ID, Package, and Amount are required.' });
    }

    // Find the user by custom userId or email
    const user = await User.findOne({
      $or: [
        { userId: userId.trim().toUpperCase() },
        { email: userId.trim() }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const pkg = await Package.findById(packageId);
    if (!pkg) {
      return res.status(404).json({ message: 'Package not found' });
    }

    const numericAmount = Number(amount);
    if (numericAmount < pkg.minAmount || numericAmount > pkg.maxAmount) {
      return res.status(400).json({ message: `Amount must be between $${pkg.minAmount} and $${pkg.maxAmount} for this package.` });
    }

    const stakingDurationNum = Number(stakingDuration || 0);
    if (![0, 30, 90, 180, 360].includes(stakingDurationNum)) {
      return res.status(400).json({ message: 'Invalid staking duration. Must be 30, 90, 180, or 360 days.' });
    }

    // Multi-Package Rules: Prevent Package Stacking and Handle Upgrades
    const existingActivePkg = await UserPackage.findOne({ user: user._id, status: 'active' });
    if (existingActivePkg) {
      if (numericAmount <= existingActivePkg.amount) {
        return res.status(400).json({ message: 'Upgrades must be of a higher value than your current active package.' });
      }
      // Upgrade logic: Mark old as upgraded, ROI generation will stop for it
      existingActivePkg.status = 'upgraded';
      await existingActivePkg.save();
    }

    const isStaked = stakingDurationNum > 0;
    const durationDays = isStaked ? stakingDurationNum : pkg.validity;

    const userPackage = await UserPackage.create({
      userId: user.userId,
      user: user._id,
      packageId: pkg._id,
      amount: numericAmount,
      compoundingBalance: numericAmount,
      dailyProfitPercent: pkg.dailyProfit,
      endDate: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
      isBVEligible: true,
      isStaked,
      stakingDuration: stakingDurationNum,
      isZeroPin: pkg.isZeroPin,
      stakingEnabled: isStaked,
      stakingPeriod: stakingDurationNum,
      stakingStartDate: isStaked ? new Date() : undefined,
      stakingEndDate: isStaked ? new Date(Date.now() + stakingDurationNum * 24 * 60 * 60 * 1000) : undefined,
      autoCompounding: isStaked
    });

    // Note: user.isActive is NOT set to true here. Admin must manually activate the user ID.
    user.activePackage = pkg._id;
    user.totalInvestment += numericAmount; // Expands their 4x global cap
    await user.save();

    await AuditLog.create({
      action: 'PACKAGE_ACTIVATION',
      userId: user._id,
      adminId: req.user._id,
      packageId: userPackage._id,
      amount: numericAmount,
      details: {
        isManualAssignment: true,
        targetUser: user.userId,
        isUpgrade: !!existingActivePkg,
        oldPackageId: existingActivePkg ? existingActivePkg._id : null
      }
    });

    await Transaction.create({
      userId: user.userId,
      user: user._id,
      type: 'deposit',
      amount: numericAmount,
      txHash: 'ADMIN_MANUAL_ASSIGN',
      status: 'success',
      description: `Manual package assignment by Admin: ${pkg.name}`
    });

    if (user.sponsor) {
      // Direct referral income is disabled in this project
      // const { distributeDirectReferral } = require('../services/referralService');
      // await distributeDirectReferral(user.sponsor, numericAmount, user.userId, user._id);
      
      // Check Fastrack Bonus for Sponsor
      const sponsor = await User.findById(user.sponsor);
      if (sponsor && !sponsor.fastrackQualified && sponsor.activePackage) {
        const sponsorPkg = await UserPackage.findOne({ user: sponsor._id, status: 'active' }).sort({ createdAt: -1 });
        if (sponsorPkg) {
          const tenDaysAgo = new Date();
          tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
          
          if (sponsorPkg.createdAt >= tenDaysAgo) {
            // Count directs with same or qualifying package (excluding 0-pin users)
            const directsWithQualifyingPkg = await UserPackage.countDocuments({
              user: { $in: await User.find({ sponsor: sponsor._id, pins: { $gt: 0 } }).distinct('_id') },
              amount: { $gte: sponsorPkg.amount },
              status: 'active'
            });

            if (directsWithQualifyingPkg >= 5) {
              sponsor.fastrackQualified = true;
              await sponsor.save();
            }
          }
        }
      }
    }

    res.json({ message: 'Package manually assigned and activated successfully', userPackage });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const userToDelete = await User.findById(id);
    if (!userToDelete) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (userToDelete.role === 'admin') {
      return res.status(400).json({ message: 'Admin accounts cannot be deleted.' });
    }

    const userIdStr = userToDelete.userId;

    // 1. Update direct referrals' sponsor pointers to bypass this user
    const parentSponsor = userToDelete.sponsor || null;
    const parentSponsorId = userToDelete.sponsorId || '';
    
    await User.updateMany(
      { sponsor: userToDelete._id },
      { $set: { sponsor: parentSponsor, sponsorId: parentSponsorId } }
    );

    // 2. Cascade delete all associated records
    const LevelIncome = require('../models/LevelIncome');
    const Reward = require('../models/Reward');

    await UserPackage.deleteMany({ user: userToDelete._id });
    await Transaction.deleteMany({ user: userToDelete._id });
    await MiningIncome.deleteMany({ user: userToDelete._id });
    await LevelIncome.deleteMany({ $or: [{ user: userToDelete._id }, { fromUser: userToDelete._id }] });
    await ReferralIncome.deleteMany({ $or: [{ user: userToDelete._id }, { fromUser: userToDelete._id }] });
    await Withdrawal.deleteMany({ user: userToDelete._id });
    await KYC.deleteMany({ user: userToDelete._id });
    await Reward.deleteMany({ user: userToDelete._id });
    await AuditLog.deleteMany({ userId: userToDelete._id });

    // 3. Delete the User itself
    await User.deleteOne({ _id: userToDelete._id });

    // 4. Log the admin action
    await AuditLog.create({
      action: 'ADMIN_ACTION',
      adminId: req.user._id,
      details: { reason: 'User Deleted by Admin', targetUserId: userIdStr, targetUserObjId: id }
    });

    res.json({ message: `User ${userIdStr} and all associated records have been successfully deleted.` });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  deleteUser,
  adminLogin,
  getDashboardStats,
  getAllUsers,
  approveKYC,
  rejectKYC,
  approveWithdrawal,
  rejectWithdrawal,
  createPackage,
  getTreasuryStats,
  updateTreasurySettings,
  toggleBlockUser,
  getAllWithdrawals,
  getAllKYCs,
  getAllPackages,
  getUserPackages,
  updatePackage,
  getCronStatus,
  triggerMiningCron,
  getAllTransactions,
  updateUser,
  impersonateUser,
  assignPackage
};
