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
const runMiningCronCycle = async (force = false) => {
  const cronName = 'MINING_CRON_12H';

  const today = new Date();
  const utcHour = today.getUTCHours();
  const utcDay = today.getUTCDay();

  const cycleHour = utcHour < 12 ? 0 : 12;

  // Calculate cycleId based on UTC time to avoid timezone mismatch
  // e.g. MINING_2026-05-26_0 or MINING_2026-05-26_12
  const cycleId = `MINING_${today.toISOString().split('T')[0]}_${cycleHour}`;

  // 1. DUPLICATE & REPLAY PROTECTION (CRON LOCK)
  let state = await CronState.findOne({ cronName });
  if (!state) {
    state = await CronState.create({ cronName, isRunning: false });
  }

  // Auto-release stale lock if held for more than 20 minutes (handles crash/timeout scenarios)
  const LOCK_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes
  if (state.isRunning && state.lockAcquiredAt) {
    const lockAge = Date.now() - new Date(state.lockAcquiredAt).getTime();
    if (lockAge > LOCK_TIMEOUT_MS) {
      console.warn(`[CRON] ⚠️ Stale lock detected (held for ${Math.round(lockAge / 60000)}m). Force-releasing.`);
      await CronState.updateOne({ cronName }, { $set: { isRunning: false, lockAcquiredAt: null } });
      state.isRunning = false;
    }
  }

  if (state.isRunning && !force) {
    console.log(`[CRON] ${cronName} is currently locked/running. Skipping.`);
    return { success: false, reason: 'LOCKED' };
  }
  if (state.lastCycleId === cycleId && !force) {
    console.log(`[CRON] ${cronName} already completed cycle ${cycleId}. Skipping.`);
    return { success: false, reason: 'ALREADY_COMPLETED' };
  }

  // Lock the cron and record when the lock was acquired
  await CronState.updateOne({ cronName }, { $set: { isRunning: true, lockAcquiredAt: new Date() } });

  
  console.log('============================================');
  console.log('[CRON] ✅ CRON JOB IS RUNNING');
  console.log(`[CRON] Cycle: ${cycleId}`);
  console.log(`[CRON] UTC Time: ${new Date().toUTCString()}`);
  console.log('============================================');

  if ((utcDay === 0 || utcDay === 6) && !force) {
    console.log('[CRON] Skipping mining cron distribution on weekend (Saturday/Sunday UTC)');
    await CronState.updateOne({ cronName }, { $set: { isRunning: false, lockAcquiredAt: null, lastCycleId: cycleId, lastRunAt: new Date() } });
    return { success: false, reason: 'WEEKEND_SKIPPED' };
  }

  // Helper for decimal precision control
  const round6 = (num) => Math.round(num * 1000000) / 1000000;

  try {
    const activePackages = await UserPackage.find({
      status: 'active',
      endDate: { $gt: new Date() }
    });

    console.log(`[CRON] Found ${activePackages.length} active packages to process.`);
    let idx = 0;
    for (let pkg of activePackages) {
      idx++;
      const user = await User.findById(pkg.user);
      if (idx % 10 === 0 || idx === 1 || idx === activePackages.length) {
        console.log(`[CRON] Processing package ${idx}/${activePackages.length} (ID: ${pkg._id}) for user ${user ? user.userId : 'unknown'}`);
      }

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

      // Send 100% profit to available balance (no reinvestment/compounding split)
      const reinvestAmount = 0;
      const withdrawableAmount = profitAmount;

      user.miningIncome = round6(user.miningIncome + profitAmount);
      user.totalEarning = round6(user.totalEarning + profitAmount); // 100% of profit counts towards the 4x cap!
      user.availableBalance = round6(user.availableBalance + withdrawableAmount); // 100% is withdrawable instantly

      pkg.totalEarned = round6(pkg.totalEarned + profitAmount);
      pkg.compoundingBalance = round6(baseAmount + profitAmount); // Compounding: Add profit to the principal balance

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
      { $set: { isRunning: false, lockAcquiredAt: null, lastCycleId: cycleId, lastRunAt: new Date(), errorLog: null } }
    );
    console.log('============================================');
    console.log('[CRON] ✅ CRON JOB FINISHED SUCCESSFULLY');
    console.log(`[CRON] Cycle: ${cycleId} completed at ${new Date().toUTCString()}`);
    console.log('============================================');
    return { success: true };
  } catch (error) {
    console.error('============================================');
    console.error('[CRON] ❌ CRON JOB ERROR — FAILED TO RUN');
    console.error(`[CRON] Error: ${error.message}`);
    console.error(`[CRON] Time: ${new Date().toUTCString()}`);
    console.error('============================================');
    await CronState.updateOne({ cronName }, { $set: { isRunning: false, lockAcquiredAt: null, errorLog: error.message } });
    return { success: false, error: error.message };
  }
};
// ==========================================
// LOCAL DEVELOPMENT CRON ONLY
// ==========================================

// if (process.env.NODE_ENV !== 'production') {

//   console.log('[CRON] Local node-cron started');

//   // TESTING EVERY 1 MINUTE
//   cron.schedule("*/30 * * * * *", async () => {
//     console.log('[CRON] Local test cron triggered');

//     // await runMiningCronCycle(true);
//     await runMiningCronCycle(false);

//   }, {
//     scheduled: true,
//     timezone: "UTC"
//   });

// }

module.exports = { runMiningCronCycle };
