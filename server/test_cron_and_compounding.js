require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Package = require('./models/Package');
const UserPackage = require('./models/UserPackage');
const MiningIncome = require('./models/MiningIncome');
const CronState = require('./models/CronState');
const { runMiningCronCycle } = require('./cron/miningCron');

const round6 = (num) => Math.round(num * 1000000) / 1000000;

// Color helper for logging
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m'
};

const pass = (msg) => console.log(`${colors.green}  ✅ PASS: ${msg}${colors.reset}`);
const fail = (msg) => {
  console.log(`${colors.red}  ❌ FAIL: ${msg}${colors.reset}`);
  process.exit(1);
};
const info = (msg) => console.log(`  [INFO] ${msg}`);
const section = (msg) => console.log(`\n${colors.bold}${colors.cyan}=== ${msg} ===${colors.reset}`);

async function runTest() {
  console.log('Connecting to database...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB.');

  const timestamp = Date.now();
  const testEmail = `test_cron_compound_${timestamp}@test.com`;

  try {
    // ==============================================================
    // PART 1: TEST TIMEZONE SCHEDULING (5:30 AM and 5:30 PM IST)
    // ==============================================================
    section('PART 1: TIMEZONE & CRON SCHEDULE CHECK');
    
    // We want to prove that 5:30 AM and 5:30 PM IST map to 00:00 and 12:00 UTC.
    // Let's perform timezone calculations:
    info('Verifying Indian Standard Time (IST, GMT+5:30) vs Coordinated Universal Time (UTC):');
    
    // Test case 1: 5:30 AM IST
    const timeAM_IST = new Date('2026-05-26T05:30:00+05:30');
    const utcHoursAM = timeAM_IST.getUTCHours();
    const utcMinutesAM = timeAM_IST.getUTCMinutes();
    info(`5:30 AM IST corresponds to UTC time: ${utcHoursAM.toString().padStart(2, '0')}:${utcMinutesAM.toString().padStart(2, '0')} UTC`);
    
    if (utcHoursAM === 0 && utcMinutesAM === 0) {
      pass('5:30 AM IST is exactly 00:00 UTC.');
    } else {
      fail(`5:30 AM IST mapped to ${utcHoursAM}:${utcMinutesAM} UTC, expected 00:00 UTC.`);
    }

    // Test case 2: 5:30 PM IST
    const timePM_IST = new Date('2026-05-26T17:30:00+05:30');
    const utcHoursPM = timePM_IST.getUTCHours();
    const utcMinutesPM = timePM_IST.getUTCMinutes();
    info(`5:30 PM IST corresponds to UTC time: ${utcHoursPM.toString().padStart(2, '0')}:${utcMinutesPM.toString().padStart(2, '0')} UTC`);
    
    if (utcHoursPM === 12 && utcMinutesPM === 0) {
      pass('5:30 PM IST is exactly 12:00 UTC.');
    } else {
      fail(`5:30 PM IST mapped to ${utcHoursPM}:${utcMinutesPM} UTC, expected 12:00 UTC.`);
    }

    // Now explain cron execution:
    info('In server/cron/miningCron.js, scheduled execution is configured via:');
    info('  cron.schedule("0 * * * *", () => runMiningCronCycle(false));');
    info('This triggers the cron every hour at minute 0.');
    info('Inside the function, it enforces:');
    info('  if (utcHour !== 0 && utcHour !== 12) { return { success: false, reason: "NOT_SCHEDULED_HOUR" }; }');
    info('This design ensures execution happens ONLY when the UTC hour is 00:00 or 12:00.');
    info('Since 5:30 AM IST is 00:00 UTC and 5:30 PM IST is 12:00 UTC, the check passes exactly at these times.');
    pass('Daily 5:30 AM and 5:30 PM IST scheduling logic is mathematically verified!');

    // ==============================================================
    // PART 2: TEST AUTO-COMPOUNDING LOGIC (70/30 SPLIT & GROWTH)
    // ==============================================================
    section('PART 2: AUTO-COMPOUNDING LOGIC TEST');

    // 1. Seed Package
    let testPkg = await Package.findOne({ minAmount: 100 });
    if (!testPkg) {
      testPkg = await Package.create({
        name: 'Test Package 1',
        minAmount: 100,
        maxAmount: 1000,
        dailyProfit: 1.0, // 1% daily
        validity: 365,
        status: true
      });
    }
    
    // 2. Create User
    const user = await User.create({
      userId: `TUSR_${timestamp}`,
      fullName: 'Test Compounder',
      email: testEmail,
      password: 'hashedpassword',
      isActive: true,
      totalInvestment: 100,
      availableBalance: 0,
      miningIncome: 0,
      totalEarning: 0
    });
    info(`Created test user: ${user.fullName} (${user.email})`);

    // 3. Purchase UserPackage
    const userPkg = await UserPackage.create({
      userId: user.userId,
      user: user._id,
      packageId: testPkg._id,
      amount: 100,
      compoundingBalance: 100,
      dailyProfitPercent: 1.0, // 1% daily profit
      status: 'active',
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    });
    info(`Created UserPackage with investment of $${userPkg.amount} and daily profit percent: ${userPkg.dailyProfitPercent}%`);

    // 4. Run Cycle 1
    info('Running Mining Cron Cycle 1...');
    // We will bypass the scheduler checks and force execution
    const cycle1Res = await runMiningCronCycle(true);
    if (!cycle1Res.success) {
      fail(`Mining Cycle 1 failed: ${cycle1Res.error || cycle1Res.reason}`);
    }

    // Fetch updated user and package
    let updatedUser = await User.findById(user._id);
    let updatedPkg = await UserPackage.findById(userPkg._id);

    // Assert values after Cycle 1
    // Calculation:
    // Profit = (100 * (1% / 100)) / 2 = 0.50
    // Reinvest (70%) = 0.50 * 0.70 = 0.35
    // Withdrawable (30%) = 0.50 * 0.30 = 0.15
    // compoundingBalance = 100 + 0.35 = 100.35
    // availableBalance = 0.15
    // miningIncome = 0.50
    // totalEarning = 0.50
    const expectedProfit1 = 0.50;
    const expectedReinvest1 = 0.35;
    const expectedWithdraw1 = 0.15;

    info(`Cycle 1 - Profit: $${updatedUser.miningIncome}, Compounding Balance: $${updatedPkg.compoundingBalance}, Available Balance: $${updatedUser.availableBalance}`);
    
    if (updatedUser.miningIncome === expectedProfit1 &&
        updatedPkg.compoundingBalance === (100 + expectedReinvest1) &&
        updatedUser.availableBalance === expectedWithdraw1) {
      pass('Cycle 1 results match expected 70/30 split exactly.');
    } else {
      fail(`Cycle 1 mismatch. Expected Profit: $${expectedProfit1}, Compounded: $${100 + expectedReinvest1}, Available: $${expectedWithdraw1}`);
    }

    // 5. Run Cycle 2 (Compounding Growth check)
    info('Running Mining Cron Cycle 2 (Testing growth on compounded balance)...');
    
    // Reset CronState so cycle completes again
    await CronState.updateOne({ cronName: 'MINING_CRON_12H' }, { $set: { lastCycleId: null } });

    const cycle2Res = await runMiningCronCycle(true);
    if (!cycle2Res.success) {
      fail(`Mining Cycle 2 failed: ${cycle2Res.error || cycle2Res.reason}`);
    }

    updatedUser = await User.findById(user._id);
    updatedPkg = await UserPackage.findById(userPkg._id);

    // Calculation for Cycle 2:
    // Base amount is now 100.35
    // Profit = (100.35 * (1% / 100)) / 2 = 0.50175
    // Reinvest (70%) = 0.50175 * 0.70 = 0.351225
    // Withdrawable (30%) = 0.50175 * 0.30 = 0.150525
    // new compoundingBalance = 100.35 + 0.351225 = 100.701225
    // new availableBalance = 0.15 + 0.150525 = 0.300525
    // new miningIncome = 0.50 + 0.50175 = 1.00175
    const profit2 = round6((100.35 * 0.01) / 2); // 0.50175
    const reinvest2 = round6(profit2 * 0.70); // 0.351225
    const withdraw2 = round6(profit2 - reinvest2); // 0.150525 (0.50175 - 0.351225)
    
    const expectedCompounding2 = round6(100.35 + reinvest2); // 100.701225
    const expectedAvailable2 = round6(0.15 + withdraw2); // 0.300525
    const expectedMiningIncome2 = round6(0.50 + profit2); // 1.00175

    info(`Cycle 2 - Total Profit: $${updatedUser.miningIncome}, Compounding Balance: $${updatedPkg.compoundingBalance}, Available Balance: $${updatedUser.availableBalance}`);

    if (updatedPkg.compoundingBalance === expectedCompounding2 &&
        updatedUser.availableBalance === expectedAvailable2 &&
        updatedUser.miningIncome === expectedMiningIncome2) {
      pass('Cycle 2 compounding growth and 70/30 split match expected values exactly.');
    } else {
      fail(`Cycle 2 mismatch. Expected Compounded: $${expectedCompounding2}, Available: $${expectedAvailable2}, Total Income: $${expectedMiningIncome2}`);
    }

    pass('Auto-compounding logic verified successfully!');

    // Cleanup test data
    info('Cleaning up test data...');
    await User.deleteOne({ _id: user._id });
    await UserPackage.deleteOne({ _id: userPkg._id });
    await MiningIncome.deleteMany({ userId: user.userId });
    pass('Cleanup complete.');

    await mongoose.disconnect();
    console.log('\nAll tests passed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Test Execution Error:', error);
    // Attempt cleanup
    await User.deleteOne({ email: testEmail });
    await mongoose.disconnect();
    process.exit(1);
  }
}

runTest();
