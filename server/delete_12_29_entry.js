const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const User = require('./models/User');
const UserPackage = require('./models/UserPackage');
const MiningIncome = require('./models/MiningIncome');
const LevelIncome = require('./models/LevelIncome');
const AuditLog = require('./models/AuditLog');

const round6 = (num) => Math.round(num * 1000000) / 1000000;

async function run() {
  console.log('Starting cleanup for 12:29 IST records on June 9, 2026...');

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not defined in env');
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  // 12:29 IST is 06:59 UTC.
  const rangeStart = new Date("2026-06-09T06:59:00.000Z");
  const rangeEnd = new Date("2026-06-09T06:59:59.999Z");

  console.log(`Target Range (UTC): ${rangeStart.toISOString()} to ${rangeEnd.toISOString()}`);

  const miningIncomes = await MiningIncome.find({
    createdAt: { $gte: rangeStart, $lte: rangeEnd }
  });
  console.log(`Found ${miningIncomes.length} mining income records at 12:29.`);

  const levelIncomes = await LevelIncome.find({
    createdAt: { $gte: rangeStart, $lte: rangeEnd }
  });
  console.log(`Found ${levelIncomes.length} level income records at 12:29.`);

  const auditLogs = await AuditLog.find({
    action: { $in: ['ROI_GENERATION', 'LEVEL_INCOME'] },
    createdAt: { $gte: rangeStart, $lte: rangeEnd }
  });
  console.log(`Found ${auditLogs.length} audit logs at 12:29.`);

  if (miningIncomes.length === 0 && levelIncomes.length === 0 && auditLogs.length === 0) {
    console.log('No records found at 12:29 to delete.');
    process.exit(0);
  }

  // Deduct balances from users
  const userUpdates = {};
  const packageUpdates = {};

  for (const inc of miningIncomes) {
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

  for (const li of levelIncomes) {
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
    userUpdates[sponsorId].availableBalance += li.amount; // In the new MLM flow, 100% of level income goes to Available Balance
  }

  console.log('\n--- Reducing User Balances ---');
  for (const [userId, diff] of Object.entries(userUpdates)) {
    const userDoc = await User.findById(userId);
    if (!userDoc) continue;

    console.log(`User ${userDoc.userId} (${userDoc.email}):`);
    if (diff.miningIncome) console.log(`  Mining Income: ${userDoc.miningIncome} -> ${round6(userDoc.miningIncome - diff.miningIncome)} (Deduct ${diff.miningIncome})`);
    if (diff.levelIncome) console.log(`  Level Income: ${userDoc.levelIncome} -> ${round6(userDoc.levelIncome - diff.levelIncome)} (Deduct ${diff.levelIncome})`);
    console.log(`  Total Earning: ${userDoc.totalEarning} -> ${round6(userDoc.totalEarning - diff.totalEarning)} (Deduct ${diff.totalEarning})`);
    console.log(`  Available Balance: ${userDoc.availableBalance} -> ${round6(userDoc.availableBalance - diff.availableBalance)} (Deduct ${diff.availableBalance})`);

    userDoc.miningIncome = round6(userDoc.miningIncome - (diff.miningIncome || 0));
    userDoc.levelIncome = round6(userDoc.levelIncome - (diff.levelIncome || 0));
    userDoc.totalEarning = round6(userDoc.totalEarning - diff.totalEarning);
    userDoc.availableBalance = round6(userDoc.availableBalance - diff.availableBalance);
    await userDoc.save();
  }

  console.log('\n--- Reducing Package Earnings ---');
  for (const [pkgId, diff] of Object.entries(packageUpdates)) {
    const pkgDoc = await UserPackage.findById(pkgId);
    if (!pkgDoc) continue;

    console.log(`Package ${pkgId} (User: ${pkgDoc.userId}):`);
    console.log(`  Total Earned: ${pkgDoc.totalEarned} -> ${round6(pkgDoc.totalEarned - diff.totalEarned)} (Deduct ${diff.totalEarned})`);

    pkgDoc.totalEarned = round6(pkgDoc.totalEarned - diff.totalEarned);
    if (pkgDoc.status === 'completed') {
      const multiplier = pkgDoc.isZeroPin ? 1 : 4;
      if (pkgDoc.totalEarned < pkgDoc.amount * multiplier) {
        pkgDoc.status = 'active';
        console.log(`  Re-activated package ${pkgId}`);
      }
    }
    await pkgDoc.save();
  }

  console.log('\nDeleting target database records...');
  
  const delMining = await MiningIncome.deleteMany({ _id: { $in: miningIncomes.map(m => m._id) } });
  console.log(`Deleted ${delMining.deletedCount} mining income documents.`);

  const delLevel = await LevelIncome.deleteMany({ _id: { $in: levelIncomes.map(l => l._id) } });
  console.log(`Deleted ${delLevel.deletedCount} level income documents.`);

  const delLogs = await AuditLog.deleteMany({ _id: { $in: auditLogs.map(l => l._id) } });
  console.log(`Deleted ${delLogs.deletedCount} audit log documents.`);

  console.log('\nCleanup complete.');
  process.exit(0);
}

run().catch(err => {
  console.error('Error during cleanup:', err);
  process.exit(1);
});
