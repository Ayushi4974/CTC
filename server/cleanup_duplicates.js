require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./models/User');
const UserPackage = require('./models/UserPackage');
const MiningIncome = require('./models/MiningIncome');
const LevelIncome = require('./models/LevelIncome');
const AuditLog = require('./models/AuditLog');

const round6 = (num) => Math.round(num * 1000000) / 1000000;

async function run() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`Starting duplicate cleanup... Dry Run: ${dryRun}`);

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ctc');
  console.log('Connected to MongoDB.');

  const startOfDay = new Date("2026-06-09T00:00:00.000Z");
  const endOfDay = new Date("2026-06-09T23:59:59.999Z");

  // Query all mining incomes on June 9, 2026
  const miningIncomes = await MiningIncome.find({
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  });
  console.log(`Found ${miningIncomes.length} mining incomes on June 9.`);

  // Query all level incomes on June 9, 2026
  const levelIncomes = await LevelIncome.find({
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  });
  console.log(`Found ${levelIncomes.length} level incomes on June 9.`);

  // Query all audit logs on June 9, 2026
  const auditLogs = await AuditLog.find({
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  });
  console.log(`Found ${auditLogs.length} audit logs on June 9.`);

  // Define batches by timestamp ranges
  // Batch 2 (DELETE): 06:58:00Z to 06:59:00Z
  // Batch 4 (DELETE): 06:59:31.600Z to 07:01:00Z
  // Batch 5 (DELETE): 09:18:00Z onwards (concurrency test lock run)
  const isBatchToDelete = (date) => {
    const time = new Date(date).getTime();
    const batch2Start = new Date("2026-06-09T06:58:00.000Z").getTime();
    const batch2End = new Date("2026-06-09T06:59:00.000Z").getTime();
    const batch4Start = new Date("2026-06-09T06:59:31.600Z").getTime();
    const batch4End = new Date("2026-06-09T07:01:00.000Z").getTime();
    const batch5Start = new Date("2026-06-09T09:18:00.000Z").getTime();

    return (time >= batch2Start && time <= batch2End) || 
           (time >= batch4Start && time <= batch4End) ||
           (time >= batch5Start);
  };

  const miningToDelete = miningIncomes.filter(inc => isBatchToDelete(inc.createdAt));
  const levelToDelete = levelIncomes.filter(inc => isBatchToDelete(inc.createdAt));
  const auditToDelete = auditLogs.filter(log => {
    // Only delete ROI_GENERATION and LEVEL_INCOME logs from the duplicate batches
    if (log.action !== 'ROI_GENERATION' && log.action !== 'LEVEL_INCOME') return false;
    return isBatchToDelete(log.createdAt);
  });

  console.log(`Identified for deletion:`);
  console.log(`  Mining Income: ${miningToDelete.length} records`);
  console.log(`  Level Income: ${levelToDelete.length} records`);
  console.log(`  Audit Logs: ${auditToDelete.length} records`);

  // Map to track user and package updates
  const userUpdates = {};
  const packageUpdates = {};

  // 1. Process Mining Income Deletions
  for (const inc of miningToDelete) {
    const uId = inc.user.toString();
    const pkgId = inc.userPackageId ? inc.userPackageId.toString() : null;

    if (!userUpdates[uId]) {
      userUpdates[uId] = { miningIncome: 0, totalEarning: 0, availableBalance: 0 };
    }
    userUpdates[uId].miningIncome += inc.amount;
    userUpdates[uId].totalEarning += inc.amount;
    userUpdates[uId].availableBalance += inc.amount;

    if (pkgId) {
      if (!packageUpdates[pkgId]) {
        packageUpdates[pkgId] = { totalEarned: 0 };
      }
      packageUpdates[pkgId].totalEarned += inc.amount;
    }
  }

  // 2. Process Level Income Deletions
  for (const li of levelToDelete) {
    const sponsorId = li.user.toString();

    if (!userUpdates[sponsorId]) {
      userUpdates[sponsorId] = { levelIncome: 0, totalEarning: 0, availableBalance: 0, promotionalIncome: 0 };
    }
    if (userUpdates[sponsorId].levelIncome === undefined) {
      userUpdates[sponsorId].levelIncome = 0;
      userUpdates[sponsorId].promotionalIncome = 0;
    }
    userUpdates[sponsorId].levelIncome += li.amount;
    userUpdates[sponsorId].totalEarning += li.amount;
    userUpdates[sponsorId].availableBalance += li.amount * 0.50;
    userUpdates[sponsorId].promotionalIncome += li.amount * 0.50;
  }

  // 3. Perform Updates / Dry-run Display
  console.log('\n--- User Balance Reductions ---');
  for (const [userId, diff] of Object.entries(userUpdates)) {
    const userDoc = await User.findById(userId);
    if (!userDoc) {
      console.log(`User ${userId} not found in database (skipped).`);
      continue;
    }

    console.log(`User ${userDoc.userId} (${userDoc.email}):`);
    if (diff.miningIncome) console.log(`  Mining Income: ${userDoc.miningIncome} -> ${round6(userDoc.miningIncome - diff.miningIncome)} (Deduct ${diff.miningIncome})`);
    if (diff.levelIncome) console.log(`  Level Income: ${userDoc.levelIncome} -> ${round6(userDoc.levelIncome - diff.levelIncome)} (Deduct ${diff.levelIncome})`);
    console.log(`  Total Earning: ${userDoc.totalEarning} -> ${round6(userDoc.totalEarning - diff.totalEarning)} (Deduct ${diff.totalEarning})`);
    console.log(`  Available Balance: ${userDoc.availableBalance} -> ${round6(userDoc.availableBalance - diff.availableBalance)} (Deduct ${diff.availableBalance})`);
    if (diff.promotionalIncome) console.log(`  Promotional Income: ${userDoc.promotionalIncome} -> ${round6(userDoc.promotionalIncome - diff.promotionalIncome)} (Deduct ${diff.promotionalIncome})`);

    if (!dryRun) {
      userDoc.miningIncome = round6(userDoc.miningIncome - (diff.miningIncome || 0));
      userDoc.levelIncome = round6(userDoc.levelIncome - (diff.levelIncome || 0));
      userDoc.totalEarning = round6(userDoc.totalEarning - diff.totalEarning);
      userDoc.availableBalance = round6(userDoc.availableBalance - diff.availableBalance);
      userDoc.promotionalIncome = round6(userDoc.promotionalIncome - (diff.promotionalIncome || 0));

      // Re-activate if they were capped out but now brought under limit
      if (!userDoc.isActive && userDoc.totalInvestment > 0) {
        const cap = userDoc.totalInvestment * 4;
        if (userDoc.totalEarning < cap) {
          userDoc.isActive = true;
          console.log(`  [STATUS] Re-activated user ${userDoc.userId}`);
        }
      }
      await userDoc.save();
    }
  }

  console.log('\n--- Package Earnings Reductions ---');
  for (const [pkgId, diff] of Object.entries(packageUpdates)) {
    const pkgDoc = await UserPackage.findById(pkgId);
    if (!pkgDoc) {
      console.log(`Package ${pkgId} not found in database (skipped).`);
      continue;
    }

    console.log(`Package ${pkgId} (User: ${pkgDoc.userId}):`);
    console.log(`  Total Earned: ${pkgDoc.totalEarned} -> ${round6(pkgDoc.totalEarned - diff.totalEarned)} (Deduct ${diff.totalEarned})`);

    if (!dryRun) {
      pkgDoc.totalEarned = round6(pkgDoc.totalEarned - diff.totalEarned);

      // Re-activate package if completed but now under cap
      if (pkgDoc.status === 'completed') {
        const multiplier = pkgDoc.isZeroPin ? 1 : 4;
        if (pkgDoc.totalEarned < pkgDoc.amount * multiplier) {
          pkgDoc.status = 'active';
          console.log(`  [STATUS] Re-activated package ${pkgId}`);
        }
      }
      await pkgDoc.save();
    }
  }

  if (!dryRun) {
    console.log('\nDeleting duplicate records from database...');
    const delMining = await MiningIncome.deleteMany({ _id: { $in: miningToDelete.map(m => m._id) } });
    console.log(`Deleted ${delMining.deletedCount} mining income documents.`);

    const delLevel = await LevelIncome.deleteMany({ _id: { $in: levelToDelete.map(l => l._id) } });
    console.log(`Deleted ${delLevel.deletedCount} level income documents.`);

    const delLogs = await AuditLog.deleteMany({ _id: { $in: auditToDelete.map(l => l._id) } });
    console.log(`Deleted ${delLogs.deletedCount} audit log documents.`);
  }

  console.log('\nCleanup process complete.');
  process.exit(0);
}

run().catch(err => {
  console.error('Error during cleanup:', err);
  process.exit(1);
});
