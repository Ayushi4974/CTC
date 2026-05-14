const User = require('../models/User');
const LevelIncome = require('../models/LevelIncome');
const UserPackage = require('../models/UserPackage');
const Package = require('../models/Package');

const LEVEL_PERCENTAGES = [
  15, 8, 7, 4, 4, 3, 3, 3, 3, 4, 
  5, 7, 8, 8, 12, 15, 8, 7, 4, 4, 
  3, 3, 3, 3, 4, 5, 7, 8, 8, 12
];

const LEVEL_REQUIREMENTS = [
  { staking: 20, directs: 2 }, { staking: 40, directs: 3 }, { staking: 60, directs: 4 }, { staking: 80, directs: 5 }, { staking: 120, directs: 6 },
  { staking: 200, directs: 7 }, { staking: 300, directs: 8 }, { staking: 400, directs: 9 }, { staking: 400, directs: 10 }, { staking: 500, directs: 11 },
  { staking: 600, directs: 12 }, { staking: 700, directs: 13 }, { staking: 900, directs: 14 }, { staking: 900, directs: 15 }, { staking: 1000, directs: 16 },
  { staking: 1100, directs: 17 }, { staking: 1200, directs: 18 }, { staking: 1300, directs: 19 }, { staking: 1400, directs: 20 }, { staking: 1500, directs: 21 },
  { staking: 1600, directs: 22 }, { staking: 1700, directs: 23 }, { staking: 1800, directs: 24 }, { staking: 1900, directs: 25 }, { staking: 2000, directs: 26 },
  { staking: 2200, directs: 27 }, { staking: 2400, directs: 28 }, { staking: 2700, directs: 29 }, { staking: 3000, directs: 30 }, { staking: 3000, directs: 30 }
];

const getPackageScalar = async (userId) => {
  const activePkg = await UserPackage.findOne({ user: userId, status: 'active' }).populate('packageId');
  if (!activePkg || !activePkg.packageId) return 0;
  const pkgName = activePkg.packageId.name.toLowerCase();
  if (pkgName.includes('package 1')) return 0.50;
  if (pkgName.includes('package 2')) return 0.40;
  if (pkgName.includes('package 3')) return 0.30;
  if (pkgName.includes('package 4')) return 0.20;
  return 0.50; // default
};

const distributeLevelIncome = async (userId, profitAmount, fromUserId) => {
  try {
    let currentUser = await User.findById(userId);
    let currentLevel = 1;
    const baseAmount = profitAmount * await getPackageScalar(userId);

    while (currentUser && currentUser.sponsor && currentLevel <= LEVEL_PERCENTAGES.length) {
      const sponsorId = currentUser.sponsor;
      const sponsorUser = await User.findById(sponsorId);

      if (sponsorUser && sponsorUser.isActive) {
        // Qualification check
        const directsCount = await User.countDocuments({ sponsor: sponsorUser._id, isActive: true });
        const reqs = LEVEL_REQUIREMENTS[currentLevel - 1];

        // Global Eligibility Check (Bonus Conditions)
        const hasGlobalEligibility = sponsorUser.totalInvestment >= 1500 && directsCount >= 5;

        // Enforce 4x Earning Cap
        if (sponsorUser.totalEarning >= sponsorUser.totalInvestment * 4) {
          sponsorUser.isActive = false;
          await sponsorUser.save();
        } else if (sponsorUser.totalInvestment >= reqs.staking && directsCount >= reqs.directs && hasGlobalEligibility) {
          const percentage = LEVEL_PERCENTAGES[currentLevel - 1];
          const totalIncome = (baseAmount * percentage) / 100;
          
          // 1st label 50% and 2nd Label 50% eligible criteria
          // Distributing 50% to available balance (withdrawable) and 50% to another metric (e.g. promotional/reinvestment)
          const payoutAmount = totalIncome * 0.50;
          const reservedAmount = totalIncome * 0.50;

          await LevelIncome.create({
            userId: sponsorUser.userId,
            user: sponsorUser._id,
            fromUser: userId,
            fromUserId: fromUserId,
            level: currentLevel,
            percentage: percentage,
            amount: totalIncome,
            status: 'credited'
          });

          sponsorUser.levelIncome += totalIncome;
          sponsorUser.totalEarning += totalIncome;
          
          // Apply the 50/50 split rule
          sponsorUser.availableBalance += payoutAmount;
          // The other 50% is reserved/reinvested, here we track it as promotionalIncome or simply keep it in totalEarning without adding to availableBalance
          sponsorUser.promotionalIncome += reservedAmount;
          
          await sponsorUser.save();
        }
      }

      currentUser = sponsorUser;
      currentLevel++;
    }
  } catch (error) {
    console.error('Level distribution error:', error);
  }
};

module.exports = { distributeLevelIncome };
