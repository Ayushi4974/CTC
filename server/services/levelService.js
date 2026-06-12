const User = require('../models/User');
const LevelIncome = require('../models/LevelIncome');
const UserPackage = require('../models/UserPackage');
const Package = require('../models/Package');
const AuditLog = require('../models/AuditLog');
const { isStrictlyActiveUser } = require('../utils/userValidation');

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
  { staking: 2200, directs: 27 }, { staking: 2400, directs: 28 }, { staking: 2700, directs: 29 }, { staking: 3000, directs: 30 }, { staking: 3000, directs: 35 }
];

const getPackageScalar = async (userId) => {
  // const activePkg = await UserPackage.findOne({ user: userId, status: 'active' }).populate('packageId');
  // if (!activePkg || !activePkg.packageId) return 0;
  // const pkgName = activePkg.packageId.name.toLowerCase();
  // if (pkgName.includes('package 1')) return 0.50;
  // if (pkgName.includes('package 2')) return 0.40;
  // if (pkgName.includes('package 3')) return 0.30;
  // if (pkgName.includes('package 4')) return 0.20;
  // return 0.50; // default
  return 1.0; // 100% profit distributed on levels (scalar disabled)
};

const distributeLevelIncome = async (userId, profitAmount, fromUserId) => {
  try {
    let currentUser = await User.findById(userId);
    if (!currentUser || currentUser.pins === 0) return;
    
    let currentLevel = 1;
    const baseAmount = profitAmount * await getPackageScalar(userId);

    while (currentUser && currentUser.sponsor && currentLevel <= LEVEL_PERCENTAGES.length) {
      const sponsorId = currentUser.sponsor;
      const sponsorUser = await User.findById(sponsorId);

      const isSponsorStrictlyActive = await isStrictlyActiveUser(sponsorUser);
      if (sponsorUser && isSponsorStrictlyActive) {
        // Qualification check: INACTIVE DOWNLINE RULE
        // If downline becomes inactive, their volume does not count, and they are excluded from the directs count. Exclude 0-pin users.
        const directsCount = await User.countDocuments({ sponsor: sponsorUser._id, isActive: true, pins: { $gt: 0 } });
        const reqs = LEVEL_REQUIREMENTS[currentLevel - 1];

        // Level Activation Logic
        let isLevelActive = false;
        if (sponsorUser.manualLevelQualified && currentLevel <= sponsorUser.manualLevelQualified) {
          isLevelActive = true;
        } else if (sponsorUser.totalInvestment >= reqs.staking && directsCount >= reqs.directs) {
          isLevelActive = true;
          // Advanced Leadership Phases
          if (currentLevel >= 11 && currentLevel <= 20) {
            if (sponsorUser.totalInvestment < 1000) isLevelActive = false;
          } else if (currentLevel >= 21 && currentLevel <= 29) {
            if (sponsorUser.totalInvestment < 1500) isLevelActive = false; // Leadership requirement
          }
          // else if (currentLevel === 30) {
          //   // Level 30 Unique Fastrack/Leadership requirement
          //   if (!sponsorUser.fastrackQualified) isLevelActive = false;
          // }
        }

        // PRECISION OVERSHOOT PROTECTION FOR LEVEL INCOME
        const sponsorRemainingCap = (sponsorUser.totalInvestment * 4) - sponsorUser.totalEarning;

        if (sponsorRemainingCap <= 0) {
          sponsorUser.isActive = false;
          await sponsorUser.save();

          await AuditLog.create({
            action: 'CAP_COMPLETED',
            userId: sponsorUser._id,
            details: { reason: '4x cap reached during level income distribution (pre-check)' }
          });
        } else if (isLevelActive) {
          const percentage = LEVEL_PERCENTAGES[currentLevel - 1];
          let totalIncome = (baseAmount * percentage) / 100;

          let capHit = false;
          if (totalIncome > sponsorRemainingCap) {
            totalIncome = sponsorRemainingCap; // Truncate to exact remaining amount
            capHit = true;
          }

          // Distribute 100% of Level Income to available balance (no 50/50 split)
          const payoutAmount = totalIncome;

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

          // Add full level income to availableBalance
          sponsorUser.availableBalance += payoutAmount;

          if (capHit || sponsorUser.totalEarning >= sponsorUser.totalInvestment * 4) {
            sponsorUser.isActive = false;

            await AuditLog.create({
              action: 'CAP_COMPLETED',
              userId: sponsorUser._id,
              details: { reason: '4x cap reached EXACTLY after level income addition' }
            });
          }

          await sponsorUser.save();

          await AuditLog.create({
            action: 'LEVEL_INCOME',
            userId: sponsorUser._id,
            amount: totalIncome,
            details: { fromUserId, level: currentLevel, capHit }
          });
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
