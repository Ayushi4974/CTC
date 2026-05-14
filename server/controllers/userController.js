const User = require('../models/User');
const MiningIncome = require('../models/MiningIncome');
const LevelIncome = require('../models/LevelIncome');

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

module.exports = { getUserProfile, getTeam, getMiningHistory, getLevelIncomeHistory };
