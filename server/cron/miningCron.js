const cron = require('node-cron');
const mongoose = require('mongoose');
const UserPackage = require('../models/UserPackage');
const User = require('../models/User');
const MiningIncome = require('../models/MiningIncome');
const CronState = require('../models/CronState');
const AuditLog = require('../models/AuditLog');
const { distributeLevelIncome } = require('../services/levelService');
const { isStrictlyActiveUser } = require('../utils/userValidation');

const marginBonusMap = {
  'L1': 0.50, 'L2': 1.00, 'L3': 2.00, 'L4': 2.50, 'L5': 3.00, 'L6': 3.50,
  'L7': 4.00, 'L8': 4.50, 'L9': 5.00, 'L10': 5.50, 'L11': 6.00, 'L12': 6.50
};

// Run every 12 hours (Monday to Friday) UTC time
cron.schedule("0 */12 * * 1-5", async () => {
  const cronName = 'MINING_CRON_12H';
  const cycleId = `MINING_${new Date().toISOString().split('T')[0]}_${new Date().getHours()}`;

  // 1. DUPLICATE & REPLAY PROTECTION (CRON LOCK)
  let state = await CronState.findOne({ cronName });
  if (!state) {
    state = await CronState.create({ cronName, isRunning: false });
  }

  if (state.isRunning) {
    console.log(`[CRON] ${cronName} is currently locked/running. Skipping.`);
    return;
  }
  if (state.lastCycleId === cycleId) {
    console.log(`[CRON] ${cronName} already completed cycle ${cycleId}. Skipping.`);
    return;
  }

  // Lock the cron
  await CronState.updateOne({ cronName }, { $set: { isRunning: true } });

  console.log(`[CRON] Running daily mining cron... Cycle: ${cycleId}`);
  
  const today = new Date();
  const day = today.getDay(); // 0 = Sunday, 6 = Saturday
  if (day === 0 || day === 6) {
    console.log('[CRON] Skipping mining cron distribution on weekend (Saturday/Sunday)');
    await CronState.updateOne({ cronName }, { $set: { isRunning: false, lastCycleId: cycleId, lastRunAt: new Date() } });
    return;
  }

  // Helper for decimal precision control
  const round6 = (num) => Math.round(num * 1000000) / 1000000;

  try {
    const activePackages = await UserPackage.find({
      status: 'active',
      endDate: { $gt: new Date() }
    });

    for (let pkg of activePackages) {
      const user = await User.findById(pkg.user);

      // STRICT ACTIVE USER VALIDATION
      const isActive = await isStrictlyActiveUser(user, pkg);
      if (!isActive) {
        // Double ensure flags are flipped if they reached cap mathematically but flags aren't updated yet
        if (user && user.totalEarning >= user.totalInvestment * 4 && user.isActive) {
           user.isActive = false;
           await user.save();
           
           await AuditLog.create({
             action: 'CAP_COMPLETED',
             userId: user._id,
             packageId: pkg._id,
             details: { reason: '4x cap reached during mining cron pre-check' }
           });
        }
        if (pkg.totalEarned >= pkg.amount * 4 && pkg.status === 'active') {
           pkg.status = 'completed';
           await pkg.save();
        }
        continue;
      }

      let currentMarginBonus = marginBonusMap[user.rank] || 0;
      let totalDailyPercent = pkg.dailyProfitPercent + currentMarginBonus;

      // Auto-Compounding Base: Calculate profit on the GROWING compounded balance
      let baseAmount = pkg.compoundingBalance || pkg.amount;
      let profitAmount = (baseAmount * (totalDailyPercent / 100)) / 2; // 2 cycles a day

      // Fastrack Bonus (Double profit)
      if (user.fastrackQualified) {
        profitAmount *= 2;
      }

      // -------------------------------------------------------------
      // PRECISION OVERSHOOT PROTECTION
      // Calculate exact remaining capacity across BOTH package and user
      // -------------------------------------------------------------
      const pkgRemainingCap = (pkg.amount * 4) - pkg.totalEarned;
      const userRemainingCap = (user.totalInvestment * 4) - user.totalEarning;
      
      const maxAllowedProfit = Math.min(pkgRemainingCap, userRemainingCap);
      
      if (profitAmount > maxAllowedProfit) {
        profitAmount = maxAllowedProfit; // Truncate exactly to the limit
      }

      if (profitAmount <= 0) {
        pkg.status = 'completed';
        user.isActive = false; // By definition if capacity is 0, they are inactive
        await pkg.save();
        await user.save();
        continue;
      }

      profitAmount = round6(profitAmount);

      // We use a transaction if possible, otherwise we save sequentially (production robust)
      // Mongoose transactions require Replica Sets. Assuming standard mongo setup without guarantee, we save safely.
      
      await MiningIncome.create({
        userId: user.userId,
        user: user._id,
        packageId: pkg.packageId,
        userPackageId: pkg._id,
        amount: profitAmount,
        percentage: user.fastrackQualified ? totalDailyPercent * 2 : totalDailyPercent
      });

      // PARTIAL AUTO-COMPOUNDING: 70% Reinvested, 30% Withdrawable
      const reinvestAmount = round6(profitAmount * 0.70);
      const withdrawableAmount = round6(profitAmount - reinvestAmount); // Exact remainder

      user.miningIncome = round6(user.miningIncome + profitAmount);
      user.totalEarning = round6(user.totalEarning + profitAmount); // 100% of profit counts towards the 4x cap!
      user.availableBalance = round6(user.availableBalance + withdrawableAmount); // Only 30% is withdrawable instantly
      
      pkg.totalEarned = round6(pkg.totalEarned + profitAmount);
      pkg.compoundingBalance = round6(baseAmount + reinvestAmount); // Reinvest the 70% back into principal
      
      let capHit = false;
      // Final precision check after adding profit
      if (pkg.totalEarned >= pkg.amount * 4 || user.totalEarning >= user.totalInvestment * 4) {
         pkg.status = 'completed';
         user.isActive = false;
         capHit = true;
      }
      
      await pkg.save();
      await user.save();

      // AUDIT LOG
      await AuditLog.create({
        action: 'ROI_GENERATION',
        userId: user._id,
        packageId: pkg._id,
        amount: profitAmount,
        details: { cycleId, capHit }
      });
      if (capHit) {
        await AuditLog.create({
          action: 'CAP_COMPLETED',
          userId: user._id,
          packageId: pkg._id,
          details: { cycleId, reason: '4x cap reached EXACTLY during ROI generation' }
        });
      }

      // Level Bonus Distribution based on Profit amount
      // Since level bonus also increases user totalEarning, it must also be cap-protected
      await distributeLevelIncome(user._id, profitAmount, user.userId);
    }
    
    // Unlock and record success
    await CronState.updateOne(
      { cronName }, 
      { $set: { isRunning: false, lastCycleId: cycleId, lastRunAt: new Date(), errorLog: null } }
    );
    console.log('[CRON] Mining cron finished successfully.');
  } catch (error) {
    console.error('[CRON] Error in mining cron:', error);
    await CronState.updateOne({ cronName }, { $set: { isRunning: false, errorLog: error.message } });
  }
}, {
  scheduled: true,
  timezone: "UTC"
});
