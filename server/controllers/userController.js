const User = require('../models/User');
const MiningIncome = require('../models/MiningIncome');
const LevelIncome = require('../models/LevelIncome');
const Transaction = require('../models/Transaction');
const { rankBonusMap } = require('../cron/salaryCron');
const bcrypt = require('bcryptjs');

const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password').populate('activePackage');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

const getTeam = async (req, res, next) => {
  try {
    const directTeam = await User.find({ sponsor: req.user._id }).select('-password');
    
    let levels = [];
    let currentLevelMembers = directTeam;
    let currentLevel = 1;
    const maxLevels = 30;

    while (currentLevelMembers.length > 0 && currentLevel <= maxLevels) {
      levels.push({
        level: currentLevel,
        members: currentLevelMembers
      });

      const memberIds = currentLevelMembers.map(m => m._id);
      currentLevelMembers = await User.find({ sponsor: { $in: memberIds } }).select('-password');
      currentLevel++;
    }

    res.json({ directTeam, allLevels: levels });
  } catch (error) {
    next(error);
  }
};
const getMiningHistory = async (req, res, next) => {
  try {
    const history = await MiningIncome.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(history);
  } catch (error) {
    next(error);
  }
};

const getLevelIncomeHistory = async (req, res, next) => {
  try {
    const history = await LevelIncome.find({ user: req.user._id })
      .populate('fromUser', 'userId fullName totalInvestment')
      .sort({ createdAt: -1 });
    res.json(history);
  } catch (error) {
    next(error);
  }
};

const updateUserProfile = async (req, res, next) => {
  try {
    const { fullName, email, mobile, address } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (fullName !== undefined) user.fullName = fullName;
    if (email !== undefined) user.email = email;
    if (mobile !== undefined) user.mobile = mobile;
    if (address !== undefined) user.address = address;

    await user.save();

    const updatedUser = await User.findById(req.user._id).select('-password').populate('activePackage');
    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new passwords' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

const getAnnouncement = async (req, res, next) => {
  try {
    const SystemSettings = require('../models/SystemSettings');
    const settings = await SystemSettings.findOne();
    res.json({ 
      announcementImage: settings ? settings.announcementImage : '',
      announcementImages: settings ? (settings.announcementImages || []) : [],
      announcementContent: settings ? settings.announcementContent : ''
    });
  } catch (error) {
    next(error);
  }
};

const getDepositAddresses = async (req, res, next) => {
  try {
    const SystemSettings = require('../models/SystemSettings');
    const settings = await SystemSettings.findOne();
    res.json({
      depositAddressMetaMask: settings && settings.depositAddressMetaMask ? settings.depositAddressMetaMask : '0x185018c5f26B2cE105e0B80b231178CE5913b621',
      depositAddressBep20: settings && settings.depositAddressBep20 ? settings.depositAddressBep20 : '0x8e4143b46eb1e1a6cbd71b5d57da95b985219f0b',
      depositAddressTrc20: settings && settings.depositAddressTrc20 ? settings.depositAddressTrc20 : 'TWJjGZJ73Q9x2hWpLRRreaxyvR9Eveoiv5'
    });
  } catch (error) {
    next(error);
  }
};

const claimRankBonus = async (req, res, next) => {
  try {
    const { rank } = req.body;
    if (!rank) {
      return res.status(400).json({ message: 'Rank is required to claim bonus.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!user.isActive) {
      return res.status(400).json({ message: 'User must be active to claim bonuses.' });
    }

    if (!user.unclaimedRankBonuses || !user.unclaimedRankBonuses.includes(rank)) {
      return res.status(400).json({ message: `Rank ${rank} bonus is not available to claim or has already been claimed.` });
    }

    // Double check if already in claimed
    if (!user.claimedRankBonuses) {
      user.claimedRankBonuses = [];
    }

    if (user.claimedRankBonuses.includes(rank)) {
      return res.status(400).json({ message: `Rank ${rank} bonus has already been claimed.` });
    }

    const bonusAmount = rankBonusMap[rank];
    if (!bonusAmount) {
      return res.status(400).json({ message: `No bonus config found for Rank ${rank}.` });
    }

    // Enforce 4x cap before payout
    if (user.totalEarning >= user.totalInvestment * 4) {
      user.isActive = false;
      await user.save();
      return res.status(400).json({ message: 'Cannot claim bonus: 4x earning cap reached. User account deactivated.' });
    }

    // Move from unclaimed to claimed
    user.unclaimedRankBonuses = user.unclaimedRankBonuses.filter(r => r !== rank);
    user.claimedRankBonuses.push(rank);

    // Credit balance
    user.availableBalance += bonusAmount;
    user.totalEarning += bonusAmount;
    user.promotionalIncome += bonusAmount;

    await user.save();

    // Create bonus transaction
    await Transaction.create({
      userId: user.userId,
      user: user._id,
      type: 'bonus',
      amount: bonusAmount,
      status: 'success'
    });

    console.log(`[BONUS CLAIMED] User ID: ${user.userId} manually claimed bonus for Rank ${rank}: $${bonusAmount}`);
    res.json({ success: true, rank, amount: bonusAmount });
  } catch (error) {
    next(error);
  }
};

const getDashboardSettings = async (req, res, next) => {
  try {
    const SystemSettings = require('../models/SystemSettings');
    const settings = await SystemSettings.findOne() || await SystemSettings.create({});
    res.json({
      transparencyProfitsThisWeek: settings.transparencyProfitsThisWeek || "+0.00%",
      transparencyProfitsLastWeek: settings.transparencyProfitsLastWeek || "+0.00%",
      transparencyProfitsLast30Days: settings.transparencyProfitsLast30Days || "+0.00%",
      transparencyPerformanceOverview: settings.transparencyPerformanceOverview || "0.00%",
      transparencyChartData: settings.transparencyChartData || [],
      liveTradingFeed: settings.liveTradingFeed || []
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUserProfile, getTeam, getMiningHistory, getLevelIncomeHistory, updateUserProfile, changePassword, getAnnouncement, getDepositAddresses, claimRankBonus, getDashboardSettings };
