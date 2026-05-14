const cron = require('node-cron');
const UserPackage = require('../models/UserPackage');
const User = require('../models/User');
const MiningIncome = require('../models/MiningIncome');
const { distributeLevelIncome } = require('../services/levelService');

const marginBonusMap = {
  'L1': 0.50, 'L2': 1.00, 'L3': 2.00, 'L4': 2.50, 'L5': 3.00, 'L6': 3.50,
  'L7': 4.00, 'L8': 4.50, 'L9': 5.00, 'L10': 5.50, 'L11': 6.00, 'L12': 6.50
};

// Run every 12 hours
cron.schedule("0 */12 * * *", async () => {
//TESTING 
// cron.schedule("* * * * *", async () => {
  console.log('Running daily mining cron...');
  try {
    const activePackages = await UserPackage.find({
      status: 'active',
      endDate: { $gt: new Date() }
    });

    for (let pkg of activePackages) {
      const user = await User.findById(pkg.user);
      if (user && user.isActive) {
        // Enforce 4x Earning Cap
        if (user.totalEarning >= user.totalInvestment * 4) {
          user.isActive = false;
          await user.save();
          continue; // Stop generating profits until reinvestment
        }

        let currentMarginBonus = marginBonusMap[user.rank] || 0;
        let totalDailyPercent = pkg.dailyProfitPercent + currentMarginBonus;

        let profitAmount = (pkg.amount * (totalDailyPercent / 100)) / 2; // Assuming cron runs 2x a day

        // Fastrack Bonus (Double profit)
        if (user.fastrackQualified) {
          profitAmount *= 2;
        }

        await MiningIncome.create({
          userId: user.userId,
          user: user._id,
          packageId: pkg.packageId,
          userPackageId: pkg._id,
          amount: profitAmount,
          percentage: user.fastrackQualified ? totalDailyPercent * 2 : totalDailyPercent
        });

        user.miningIncome += profitAmount;
        user.totalEarning += profitAmount;
        user.availableBalance += profitAmount;
        await user.save();

        pkg.totalEarned += profitAmount;
        await pkg.save();

        // Level Bonus Distribution based on Profit amount
        await distributeLevelIncome(user._id, profitAmount, user.userId);
      }
    }
    console.log('Mining cron finished successfully.');
  } catch (error) {
    console.error('Error in mining cron:', error);
  }
});
