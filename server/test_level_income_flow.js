require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Package = require('./models/Package');
const UserPackage = require('./models/UserPackage');
const LevelIncome = require('./models/LevelIncome');
const { distributeLevelIncome } = require('./services/levelService');

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
  const testPattern = `test_level_flow_${timestamp}`;

  // Find or create test Package 1
  let pkg1 = await Package.findOne({ name: { $regex: /Package 1/i } });
  if (!pkg1) {
    pkg1 = await Package.create({
      name: 'Package 1',
      minAmount: 100,
      maxAmount: 1000,
      dailyProfit: 1.0,
      validity: 365,
      status: true
    });
  }

  // Helper to create a user and active package
  const setupUser = async (name, email, sponsorId = null) => {
    const user = await User.create({
      userId: `USR_${name.replace(/\s+/g, '')}_${timestamp}`,
      fullName: name,
      email: email,
      password: 'hashedpassword',
      sponsor: sponsorId,
      isActive: true,
      totalInvestment: 100,
      availableBalance: 0,
      miningIncome: 0,
      levelIncome: 0,
      promotionalIncome: 0,
      totalEarning: 0
    });

    const userPkg = await UserPackage.create({
      userId: user.userId,
      user: user._id,
      packageId: pkg1._id,
      amount: 100,
      compoundingBalance: 100,
      dailyProfitPercent: pkg1.dailyProfit,
      status: 'active',
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    });

    return { user, userPkg };
  };

  try {
    section('STEP 1: SETTING UP REFERRAL CHAIN (A -> B -> C -> D)');

    // Create Root Sponsor for A
    const rootUser = await User.create({
      userId: `USR_ROOT_${timestamp}`,
      fullName: 'Root Sponsor',
      email: `root_${testPattern}@test.com`,
      password: 'hashedpassword',
      isActive: true
    });

    // Create A
    const { user: userA, userPkg: pkgA } = await setupUser('User A', `usera_${testPattern}@test.com`, rootUser._id);
    info(`Created User A (${userA.userId}) under Root Sponsor`);

    // Create B under A
    const { user: userB, userPkg: pkgB } = await setupUser('User B', `userb_${testPattern}@test.com`, userA._id);
    info(`Created User B (${userB.userId}) under User A`);

    // Create C under B
    const { user: userC, userPkg: pkgC } = await setupUser('User C', `userc_${testPattern}@test.com`, userB._id);
    info(`Created User C (${userC.userId}) under User B`);

    // Create D under C
    const { user: userD, userPkg: pkgD } = await setupUser('User D', `userd_${testPattern}@test.com`, userC._id);
    info(`Created User D (${userD.userId}) under User C`);

    // ==============================================================
    // SATISFY QUALIFICATION DIRECTS REQUIREMENTS
    // ==============================================================
    section('STEP 2: REGISTERING REQUIRED ACTIVE DIRECTS');

    // C needs 2 directs to qualify L1 (User D is already 1 direct). Add 1 more active direct under C.
    const { user: dir_C1 } = await setupUser('Dir C1', `dirc1_${testPattern}@test.com`, userC._id);
    info('Registered 1 additional active direct under User C (Total active directs for C = 2)');

    // B needs 3 directs to qualify L2 (User C is already 1 direct). Add 2 more active directs under B.
    const { user: dir_B1 } = await setupUser('Dir B1', `dirb1_${testPattern}@test.com`, userB._id);
    const { user: dir_B2 } = await setupUser('Dir B2', `dirb2_${testPattern}@test.com`, userB._id);
    info('Registered 2 additional active directs under User B (Total active directs for B = 3)');

    // A needs 4 directs to qualify L3 (User B is already 1 direct). Add 3 more active directs under A.
    const { user: dir_A1 } = await setupUser('Dir A1', `dira1_${testPattern}@test.com`, userA._id);
    const { user: dir_A2 } = await setupUser('Dir A2', `dira2_${testPattern}@test.com`, userA._id);
    const { user: dir_A3 } = await setupUser('Dir A3', `dira3_${testPattern}@test.com`, userA._id);
    info('Registered 3 additional active directs under User A (Total active directs for A = 4)');

    // ==============================================================
    // SCENARIO 1: FULLY QUALIFIED TEST
    // ==============================================================
    section('STEP 3: RUNNING FULLY QUALIFIED TEST');
    info('Triggering $10 Mining ROI distribution from User D (Scalar: 0.50, Base Amount: $5)');

    await distributeLevelIncome(userD._id, 10, userD.userId);

    // Fetch updated users
    const updatedC1 = await User.findById(userC._id);
    const updatedB1 = await User.findById(userB._id);
    const updatedA1 = await User.findById(userA._id);

    // Assert Level 1 for C (Expected: 15% of $5 = $0.75. Split: $0.375 / $0.375)
    info(`User C (Level 1) Level Income: $${updatedC1.levelIncome}, Available: $${updatedC1.availableBalance}, Promo: $${updatedC1.promotionalIncome}`);
    if (updatedC1.levelIncome === 0.75 && updatedC1.availableBalance === 0.375 && updatedC1.promotionalIncome === 0.375) {
      pass('User C successfully received $0.75 total level income ($0.375 available / $0.375 promotional).');
    } else {
      fail(`User C calculation error. Expected L1 Income = 0.75, got ${updatedC1.levelIncome}`);
    }

    // Assert Level 2 for B (Expected: 8% of $5 = $0.40. Split: $0.20 / $0.20)
    info(`User B (Level 2) Level Income: $${updatedB1.levelIncome}, Available: $${updatedB1.availableBalance}, Promo: $${updatedB1.promotionalIncome}`);
    if (updatedB1.levelIncome === 0.40 && updatedB1.availableBalance === 0.20 && updatedB1.promotionalIncome === 0.20) {
      pass('User B successfully received $0.40 total level income ($0.20 available / $0.20 promotional).');
    } else {
      fail(`User B calculation error. Expected L2 Income = 0.40, got ${updatedB1.levelIncome}`);
    }

    // Assert Level 3 for A (Expected: 7% of $5 = $0.35. Split: $0.175 / $0.175)
    info(`User A (Level 3) Level Income: $${updatedA1.levelIncome}, Available: $${updatedA1.availableBalance}, Promo: $${updatedA1.promotionalIncome}`);
    if (updatedA1.levelIncome === 0.35 && updatedA1.availableBalance === 0.175 && updatedA1.promotionalIncome === 0.175) {
      pass('User A successfully received $0.35 total level income ($0.175 available / $0.175 promotional).');
    } else {
      fail(`User A calculation error. Expected L3 Income = 0.35, got ${updatedA1.levelIncome}`);
    }

    // ==============================================================
    // SCENARIO 2: QUALIFICATION FAILURE TEST
    // ==============================================================
    section('STEP 4: RUNNING QUALIFICATION FAILURE TEST (C HAS 1 ACTIVE DIRECT)');

    // Inactivate User C's extra direct (Dir C1)
    await User.updateOne({ _id: dir_C1._id }, { $set: { isActive: false } });
    info('Set Dir C1 to INACTIVE. User C now has only 1 active direct (User D), failing the Level 1 requirement (requires 2).');

    // Reset balances of A, B, C for a clean test
    await User.updateMany(
      { _id: { $in: [userA._id, userB._id, userC._id] } },
      { $set: { levelIncome: 0, availableBalance: 0, promotionalIncome: 0, totalEarning: 0 } }
    );
    info('Reset balances of A, B, C to $0');

    // Distribute level income again
    info('Triggering $10 Mining ROI distribution from User D again...');
    await distributeLevelIncome(userD._id, 10, userD.userId);

    // Fetch updated users
    const updatedC2 = await User.findById(userC._id);
    const updatedB2 = await User.findById(userB._id);
    const updatedA2 = await User.findById(userA._id);

    // Assert Level 1 for C (Expected: $0 due to failure)
    info(`User C (Level 1) Level Income: $${updatedC2.levelIncome}, Available: $${updatedC2.availableBalance}, Promo: $${updatedC2.promotionalIncome}`);
    if (updatedC2.levelIncome === 0 && updatedC2.availableBalance === 0 && updatedC2.promotionalIncome === 0) {
      pass('User C successfully skipped/failed Level 1 income qualification and received $0.');
    } else {
      fail(`User C qualification check failed: expected $0 level income, got $${updatedC2.levelIncome}`);
    }

    // Assert Level 2 for B (Expected: $0.40 still distributed because B is fully qualified with 3 active directs)
    info(`User B (Level 2) Level Income: $${updatedB2.levelIncome}, Available: $${updatedB2.availableBalance}, Promo: $${updatedB2.promotionalIncome}`);
    if (updatedB2.levelIncome === 0.40 && updatedB2.availableBalance === 0.20 && updatedB2.promotionalIncome === 0.20) {
      pass('User B successfully bypassed C\'s failure and received $0.40 level income.');
    } else {
      fail(`User B calculation error. Expected L2 Income = 0.40, got ${updatedB2.levelIncome}`);
    }

    // Assert Level 3 for A (Expected: $0.35 still distributed because A is fully qualified with 4 active directs)
    info(`User A (Level 3) Level Income: $${updatedA2.levelIncome}, Available: $${updatedA2.availableBalance}, Promo: $${updatedA2.promotionalIncome}`);
    if (updatedA2.levelIncome === 0.35 && updatedA2.availableBalance === 0.175 && updatedA2.promotionalIncome === 0.175) {
      pass('User A successfully bypassed C\'s failure and received $0.35 level income.');
    } else {
      fail(`User A calculation error. Expected L3 Income = 0.35, got ${updatedA2.levelIncome}`);
    }

    // ==============================================================
    // SCENARIO 3: 4X CAP PROTECTION TEST
    // ==============================================================
    section('STEP 5: RUNNING 4X CAP PROTECTION TEST (B IS NEAR CAP)');

    // Ensure Dir C1 is active again so C is fully qualified
    await User.updateOne({ _id: dir_C1._id }, { $set: { isActive: true } });
    info('Set Dir C1 back to ACTIVE.');

    // Reset balances of A and C
    await User.updateMany(
      { _id: { $in: [userA._id, userC._id] } },
      { $set: { levelIncome: 0, availableBalance: 0, promotionalIncome: 0, totalEarning: 0, isActive: true } }
    );

    // Setup B's state: Total investment = $100. Limit is $400. Set totalEarning = $399.90.
    // Remaining cap = 400 - 399.90 = $0.10.
    await User.updateOne(
      { _id: userB._id },
      {
        $set: {
          levelIncome: 0,
          availableBalance: 0,
          promotionalIncome: 0,
          totalEarning: 399.90,
          totalInvestment: 100,
          isActive: true
        }
      }
    );
    info('Set User B totalEarning = $399.90 on $100 investment (Remaining cap: $0.10)');

    // Distribute level income
    info('Triggering $10 Mining ROI distribution from User D (Scalar: 0.50, Base Amount: $5)');
    await distributeLevelIncome(userD._id, 10, userD.userId);

    // Fetch updated users
    const cappedB = await User.findById(userB._id);
    const uncappedC = await User.findById(userC._id);
    const uncappedA = await User.findById(userA._id);

    // Assert Level 2 for B (Normal: $0.40, Capped: $0.10. Split: $0.05 / $0.05)
    info(`User B (Level 2) Level Income: $${cappedB.levelIncome}, Available: $${cappedB.availableBalance}, Promo: $${cappedB.promotionalIncome}, Total Earning: $${cappedB.totalEarning}, IsActive: ${cappedB.isActive}`);

    if (cappedB.levelIncome === 0.10 &&
      cappedB.availableBalance === 0.05 &&
      cappedB.promotionalIncome === 0.05 &&
      cappedB.totalEarning === 400.00 &&
      cappedB.isActive === false) {
      pass('User B successfully capped at $0.10 ($0.05 available / $0.05 promotional), reached exactly $400.00 total earning, and became inactive.');
    } else {
      fail(`User B cap protection failed. Income: ${cappedB.levelIncome}, Available: ${cappedB.availableBalance}, Promo: ${cappedB.promotionalIncome}, Total Earning: ${cappedB.totalEarning}, IsActive: ${cappedB.isActive}`);
    }

    // Assert Level 1 for C (C is uncapped and should receive full $0.75)
    info(`User C (Level 1) Level Income: $${uncappedC.levelIncome}`);
    if (uncappedC.levelIncome === 0.75) {
      pass('User C successfully received full level income ($0.75).');
    } else {
      fail(`User C calculation error. Expected L1 Income = 0.75, got ${uncappedC.levelIncome}`);
    }

    // Assert Level 3 for A (A is uncapped and should receive full $0.35)
    info(`User A (Level 3) Level Income: $${uncappedA.levelIncome}`);
    if (uncappedA.levelIncome === 0.35) {
      pass('User A successfully received full level income ($0.35).');
    } else {
      fail(`User A calculation error. Expected L3 Income = 0.35, got ${uncappedA.levelIncome}`);
    }

    // ==============================================================
    // CLEANUP TEST DATA
    // ==============================================================
    section('STEP 6: CLEANING UP DATABASE');
    const usersToDelete = [
      rootUser._id, userA._id, userB._id, userC._id, userD._id,
      dir_C1._id, dir_B1._id, dir_B2._id, dir_A1._id, dir_A2._id, dir_A3._id
    ];
    await User.deleteMany({ _id: { $in: usersToDelete } });
    await UserPackage.deleteMany({ user: { $in: usersToDelete } });
    await LevelIncome.deleteMany({ user: { $in: usersToDelete } });
    pass('All test accounts and transactions successfully cleaned up from database.');

    await mongoose.disconnect();
    console.log('\nAll Level Income Flow and Cap Protection tests completed successfully and passed!');
    process.exit(0);

  } catch (error) {
    console.error('Test Execution Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runTest();

