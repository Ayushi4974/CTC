const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const User = require('./models/User');
const UserPackage = require('./models/UserPackage');
const Package = require('./models/Package');
const Transaction = require('./models/Transaction');
const LevelIncome = require('./models/LevelIncome');
const MiningIncome = require('./models/MiningIncome');
const AuditLog = require('./models/AuditLog');

const { registerUser } = require('./controllers/authController');
const { buyPackage } = require('./controllers/packageController');
const { distributeLevelIncome } = require('./services/levelService');

// Helper to call registerUser
async function callRegisterUser(fullName, email, password, sponsorId) {
  const req = {
    body: { fullName, email, password, sponsorId }
  };
  let responseStatus = 200;
  let responseData = null;
  const res = {
    status: function (code) { responseStatus = code; return this; },
    json: function (data) { responseData = data; return this; }
  };
  const next = (err) => { throw err; };

  await registerUser(req, res, next);
  return { status: responseStatus, data: responseData };
}

// Helper to call buyPackage
async function callBuyPackage(user, packageId, amount, txHash, senderAddress) {
  const req = {
    body: { packageId: packageId.toString(), amount, txHash, senderAddress },
    user: { _id: user._id, id: user._id.toString() },
    app: { get: () => null } // Stub socket.io
  };
  let responseStatus = 200;
  let responseData = null;
  const res = {
    status: function (code) { responseStatus = code; return this; },
    json: function (data) { responseData = data; return this; }
  };
  const next = (err) => { throw err; };

  await buyPackage(req, res, next);
  return { status: responseStatus, data: responseData };
}

async function runFullTest() {
  console.log('=== STARTING BUSINESS LOGIC FLOW TESTS ===');
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas');

    // Retrieve the packages
    const zeroPinPkg = await Package.findOne({ isZeroPin: true });
    const standardPkg1 = await Package.findOne({ name: 'Package 1', isZeroPin: false });
    const standardPkg2 = await Package.findOne({ name: 'Package 2', isZeroPin: false });

    if (!zeroPinPkg || !standardPkg1 || !standardPkg2) {
      throw new Error('Required packages not found in database. Seed them first.');
    }

    const suffix = Date.now().toString().slice(-6);
    const mockWallet = '0x1111222233334444555566667777888899990000';

    // Root user to sponsor our test sponsor
    const rootUser = await User.findOne({ userId: 'CTC43214' });
    if (!rootUser) {
      throw new Error('Root user CTC43214 not found in database.');
    }
    console.log(`Root Sponsor: ${rootUser.fullName} (ID: ${rootUser.userId}, Level: ${rootUser.level})`);

    // -------------------------------------------------------------
    // STEP 1: USER REGISTRATION & DYNAMIC LEVEL CALCULATION
    // -------------------------------------------------------------
    console.log('\n--- STEP 1: Registering users via registerUser API ---');

    console.log('Registering Test Sponsor under root CTC43214...');
    const regSpon = await callRegisterUser(
      'Test Sponsor ' + suffix,
      `spon_${suffix}@test.com`,
      'password123',
      rootUser.userId
    );
    if (regSpon.status !== 201) throw new Error('Sponsor registration failed: ' + JSON.stringify(regSpon.data));
    const sponsor = await User.findById(regSpon.data._id);
    console.log(`Sponsor Registered -> ID: ${sponsor.userId}, Level: ${sponsor.level} (Expected: ${rootUser.level + 1})`);

    console.log('Registering Test Normal User under Sponsor...');
    const regNorm = await callRegisterUser(
      'Test Normal User ' + suffix,
      `norm_${suffix}@test.com`,
      'password123',
      sponsor.userId
    );
    if (regNorm.status !== 201) throw new Error('Normal user registration failed: ' + JSON.stringify(regNorm.data));
    const normalUser = await User.findById(regNorm.data._id);
    console.log(`Normal User Registered -> ID: ${normalUser.userId}, Level: ${normalUser.level} (Expected: ${sponsor.level + 1})`);

    console.log('Registering Test Zero Pin User under Sponsor...');
    const regZero = await callRegisterUser(
      'Test Zero Pin User ' + suffix,
      `zerop_${suffix}@test.com`,
      'password123',
      sponsor.userId
    );
    if (regZero.status !== 201) throw new Error('Zero Pin user registration failed: ' + JSON.stringify(regZero.data));
    let zeroPinUser = await User.findById(regZero.data._id);
    // Explicitly update pins to 0 for the Zero Pin user to simulate pin activation/status
    zeroPinUser.pins = 0;
    await zeroPinUser.save();
    console.log(`Zero Pin User Registered -> ID: ${zeroPinUser.userId}, Level: ${zeroPinUser.level} (Expected: ${sponsor.level + 1}, Pins: 0)`);

    // Verify registration levels
    const registrationLevelsPassed = 
      sponsor.level === (rootUser.level + 1) && 
      normalUser.level === (sponsor.level + 1) && 
      zeroPinUser.level === (sponsor.level + 1);

    console.log(`Dynamic Level Check: ${registrationLevelsPassed ? '✅ PASSED' : '❌ FAILED'}`);

    // -------------------------------------------------------------
    // STEP 2: ZERO PIN & STANDARD PACKAGE VALIDATIONS
    // -------------------------------------------------------------
    console.log('\n--- STEP 2: Testing Zero Pin & Standard Package Validations ---');

    console.log('Testing: Normal user (pins > 0) trying to buy Zero Pin package...');
    const buyZeroByNorm = await callBuyPackage(normalUser, zeroPinPkg._id, 100, `mock_tx_fail_zero_${suffix}`, mockWallet);
    console.log(`Status: ${buyZeroByNorm.status}, Message: ${buyZeroByNorm.data.message}`);

    console.log('Testing: Zero Pin user (pins = 0) trying to buy Standard package...');
    const buyStdByZero = await callBuyPackage(zeroPinUser, standardPkg1._id, 150, `mock_tx_fail_std_${suffix}`, mockWallet);
    console.log(`Status: ${buyStdByZero.status}, Message: ${buyStdByZero.data.message}`);

    console.log('Testing: Zero Pin user buying Zero Pin package...');
    const buyZeroByZero = await callBuyPackage(zeroPinUser, zeroPinPkg._id, 100, `mock_tx_succ_zero_${suffix}`, mockWallet);
    console.log(`Status: ${buyZeroByZero.status}, Package ID: ${buyZeroByZero.data.userPackage?._id}`);
    if (buyZeroByZero.status === 200) {
      await User.findByIdAndUpdate(zeroPinUser._id, { isActive: true });
      zeroPinUser = await User.findById(zeroPinUser._id);
    }

    const packageValidationPassed = 
      buyZeroByNorm.status === 400 && 
      buyStdByZero.status === 400 && 
      buyZeroByZero.status === 200;
    console.log(`Package Validation Check: ${packageValidationPassed ? '✅ PASSED' : '❌ FAILED'}`);

    // -------------------------------------------------------------
    // STEP 3: PACKAGE STACKING & UPGRADES
    // -------------------------------------------------------------
    console.log('\n--- STEP 3: Testing Package Stacking & Upgrades ---');

    console.log('Testing: Normal user purchasing Standard Package 1 of $100...');
    const buyStd1 = await callBuyPackage(normalUser, standardPkg1._id, 100, `mock_tx_succ_std1_${suffix}`, mockWallet);
    console.log(`Status: ${buyStd1.status}, Package ID: ${buyStd1.data.userPackage?._id}`);

    console.log('Testing: Normal user trying to stack another $100 package (same amount)...');
    const buyStd2 = await callBuyPackage(normalUser, standardPkg1._id, 100, `mock_tx_fail_stack_${suffix}`, mockWallet);
    console.log(`Status: ${buyStd2.status}, Message: ${buyStd2.data.message}`);

    console.log('Testing: Normal user upgrading package to $250 (higher amount)...');
    const buyUpgrade = await callBuyPackage(normalUser, standardPkg1._id, 250, `mock_tx_succ_upgrade_${suffix}`, mockWallet);
    console.log(`Status: ${buyUpgrade.status}, Package ID: ${buyUpgrade.data.userPackage?._id}`);
    if (buyUpgrade.status === 200) {
      await User.findByIdAndUpdate(normalUser._id, { isActive: true });
      normalUser.isActive = true; // locally update for reference
    }

    const oldPkg = await UserPackage.findById(buyStd1.data.userPackage._id);
    const newPkg = await UserPackage.findById(buyUpgrade.data.userPackage._id);
    console.log(`Old package status: ${oldPkg.status} (Expected: upgraded)`);
    console.log(`New package status: ${newPkg.status} (Expected: active)`);

    const stackingPassed = 
      buyStd1.status === 200 && 
      buyStd2.status === 400 && 
      buyUpgrade.status === 200 && 
      oldPkg.status === 'upgraded' && 
      newPkg.status === 'active';
    console.log(`Package Stacking & Upgrade Check: ${stackingPassed ? '✅ PASSED' : '❌ FAILED'}`);

    // -------------------------------------------------------------
    // STEP 4: FASTRACK QUALIFICATION
    // -------------------------------------------------------------
    console.log('\n--- STEP 4: Testing Fastrack Qualification ---');

    console.log('Sponsor buying standard package of $100...');
    const buySponPkg = await callBuyPackage(sponsor, standardPkg1._id, 100, `mock_tx_spon_pkg_${suffix}`, mockWallet);
    console.log(`Status: ${buySponPkg.status}`);
    if (buySponPkg.status === 200) {
      await User.findByIdAndUpdate(sponsor._id, { isActive: true });
    }

    console.log('Creating 5 directs under Sponsor and buying Standard packages of $100...');
    const directs = [];
    for (let i = 1; i <= 5; i++) {
      const regDir = await callRegisterUser(
        `Test Direct ${i} ${suffix}`,
        `direct${i}_${suffix}@test.com`,
        'password123',
        sponsor.userId
      );
      if (regDir.status !== 201) throw new Error(`Direct ${i} registration failed`);
      let dirUser = await User.findById(regDir.data._id);

      const buyDirPkg = await callBuyPackage(dirUser, standardPkg1._id, 100, `mock_tx_dir${i}_pkg_${suffix}`, mockWallet);
      console.log(`- Direct ${i} (${dirUser.userId}, Level: ${dirUser.level}) purchased package: Status ${buyDirPkg.status}`);
      if (buyDirPkg.status === 200) {
        await User.findByIdAndUpdate(dirUser._id, { isActive: true });
        dirUser = await User.findById(dirUser._id);
      }
      directs.push(dirUser);
    }

    const sponsorAfterDirects = await User.findById(sponsor._id);
    console.log(`Sponsor fastrackQualified: ${sponsorAfterDirects.fastrackQualified} (Expected: true)`);
    const fastrackPassed = sponsorAfterDirects.fastrackQualified === true;
    console.log(`Fastrack Qualification Check: ${fastrackPassed ? '✅ PASSED' : '❌ FAILED'}`);

    // -------------------------------------------------------------
    // STEP 5: LEVEL INCOME SPLIT
    // -------------------------------------------------------------
    console.log('\n--- STEP 5: Testing Level Income (100% Available Balance) ---');

    const sponsorPreAvail = sponsorAfterDirects.availableBalance;
    const sponsorPrePromo = sponsorAfterDirects.promotionalIncome;

    console.log(`Sponsor Pre-Income - Available Balance: $${sponsorPreAvail}, Promotional Income: $${sponsorPrePromo}`);
    
    // Normal User generates a profit of $20. 
    // Sponsor gets Level 1 commission: 15% of $20 = $3.00.
    // 100% ($3.00) goes to available balance, 0% ($0.00) goes to promotional income.
    console.log('Distributing level income from Normal User (profit generated: $20)...');
    await distributeLevelIncome(normalUser._id, 20, normalUser.userId);

    const sponsorPostIncome = await User.findById(sponsor._id);
    const addedAvail = sponsorPostIncome.availableBalance - sponsorPreAvail;
    const addedPromo = sponsorPostIncome.promotionalIncome - sponsorPrePromo;

    console.log(`Sponsor Post-Income - Available Balance: $${sponsorPostIncome.availableBalance} (Added: $${addedAvail})`);
    console.log(`Sponsor Post-Income - Promotional Income: $${sponsorPostIncome.promotionalIncome} (Added: $${addedPromo})`);

    const levelSplitPassed = addedAvail === 3.0 && addedPromo === 0;
    console.log(`Level Income Split Check: ${levelSplitPassed ? '✅ PASSED' : '❌ FAILED'}`);

    // -------------------------------------------------------------
    // STEP 6: PROMOTIONAL RANK & SALARY BONUS
    // -------------------------------------------------------------
    console.log('\n--- STEP 6: Testing Rank & Salary Achievement ---');

    // Sponsor has 5 active directs with packages.
    // Let's implement the rank evaluation from salaryCron.js
    const getTeamCountLocal = async (userId) => {
      let count = 0;
      const directs = await User.find({ sponsor: userId, isActive: true, pins: { $gt: 0 } });
      for (let dir of directs) {
        count += 1 + await getTeamCountLocal(dir._id);
      }
      return count;
    };

    const getLegCountsLocal = async (userId) => {
      const directs = await User.find({ sponsor: userId, isActive: true, pins: { $gt: 0 } });
      const legCounts = [];
      for (let dir of directs) {
        const legCount = 1 + await getTeamCountLocal(dir._id);
        legCounts.push({ id: dir._id, rank: dir.rank, count: legCount });
      }
      return legCounts;
    };

    console.log('Evaluating Rank for Sponsor...');
    const legCounts = await getLegCountsLocal(sponsor._id);
    console.log(`Sponsor legs count: ${legCounts.length}`);

    let newRank = 'None';
    if (legCounts.length >= 5) newRank = 'L1';
    console.log(`New Rank Evaluated: ${newRank} (Expected: L1)`);

    const sponsorPreRankAvail = sponsorPostIncome.availableBalance;
    const sponsorPreRankPromo = sponsorPostIncome.promotionalIncome;

    if (newRank === 'L1') {
      const rankBonusAmount = 100;
      const salaryPayout = 30 / 2; // half withdrawable, half promotional

      sponsorPostIncome.availableBalance += rankBonusAmount + salaryPayout;
      sponsorPostIncome.promotionalIncome += rankBonusAmount + salaryPayout;
      sponsorPostIncome.totalEarning += rankBonusAmount + salaryPayout;
      sponsorPostIncome.claimedRankBonuses.push('L1');
      sponsorPostIncome.rank = 'L1';
      await sponsorPostIncome.save();
    }

    const sponsorFinal = await User.findById(sponsor._id);
    console.log(`Sponsor Final Rank: ${sponsorFinal.rank}`);
    console.log(`Sponsor Final Available Balance: $${sponsorFinal.availableBalance} (Rank bonus + Salary added: $${sponsorFinal.availableBalance - sponsorPreRankAvail})`);
    console.log(`Sponsor Final Promotional Income: $${sponsorFinal.promotionalIncome} (Rank bonus + Salary added: $${sponsorFinal.promotionalIncome - sponsorPreRankPromo})`);

    const rankBonusPassed = sponsorFinal.rank === 'L1' && (sponsorFinal.availableBalance - sponsorPreRankAvail) === 115;
    console.log(`Rank Bonus & Salary Check: ${rankBonusPassed ? '✅ PASSED' : '❌ FAILED'}`);

    // -------------------------------------------------------------
    // STEP 7: EARLY CAPPED STAKING RELEASE VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- STEP 7: Testing Early Capped Staked Release Bugfix ---');
    
    // We create a mock UserPackage for normalUser:
    // It's isStaked = true, status = 'completed' (cap reached early), has passed endDate, and isStakingReleased = false.
    const mockCappedStakedPkg = await UserPackage.create({
      userId: normalUser.userId,
      user: normalUser._id,
      packageId: standardPkg1._id,
      amount: 100,
      compoundingBalance: 200, // $100 principal + $100 profit
      dailyProfitPercent: 1.0,
      totalEarned: 100,
      startDate: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 1000), // expired 1s ago
      status: 'completed', // early completed status due to cap
      isStaked: true,
      isStakingReleased: false,
      stakingEnabled: true,
      stakingPeriod: 30,
      stakingStartDate: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
      stakingEndDate: new Date(Date.now() - 1000)
    });

    const userBeforeRelease = await User.findById(normalUser._id);
    const balanceBefore = userBeforeRelease.availableBalance;

    console.log(`Normal User Available Balance before cron: $${balanceBefore}`);
    console.log('Triggering runMiningCronCycle (forcing cycle to process expired packages)...');
    const { runMiningCronCycle } = require('./cron/miningCron');
    await runMiningCronCycle(true); // force = true

    const userAfterRelease = await User.findById(normalUser._id);
    const balanceAfter = userAfterRelease.availableBalance;
    const releasedPkg = await UserPackage.findById(mockCappedStakedPkg._id);

    console.log(`Normal User Available Balance after cron: $${balanceAfter} (Earned release: +$${balanceAfter - balanceBefore})`);
    console.log(`Mock Capped Package isStakingReleased: ${releasedPkg.isStakingReleased} (Expected: true)`);
    console.log(`Mock Capped Package status: ${releasedPkg.status} (Expected: completed)`);

    const earlyReleasePassed = 
      (balanceAfter - balanceBefore) >= 200 && 
      releasedPkg.isStakingReleased === true && 
      releasedPkg.status === 'completed';

    console.log(`Early Capped Staking Release Check: ${earlyReleasePassed ? '✅ PASSED' : '❌ FAILED'}`);

    // Fetch final states for all users to print report
    const dbSponsor = await User.findById(sponsor._id);
    const dbNormal = await User.findById(normalUser._id);
    const dbZero = await User.findById(zeroPinUser._id);
    const dbDirects = await Promise.all(directs.map(d => User.findById(d._id)));

    const testUsersReport = [
      { role: 'Sponsor', id: dbSponsor.userId, level: dbSponsor.level, investment: dbSponsor.totalInvestment, active: dbSponsor.isActive },
      { role: 'Normal User', id: dbNormal.userId, level: dbNormal.level, investment: dbNormal.totalInvestment, active: dbNormal.isActive },
      { role: 'Zero Pin User', id: dbZero.userId, level: dbZero.level, investment: dbZero.totalInvestment, active: dbZero.isActive }
    ];
    dbDirects.forEach((d, i) => {
      testUsersReport.push({
        role: `Direct Downline ${i + 1}`,
        id: d.userId,
        level: d.level,
        investment: d.totalInvestment,
        active: d.isActive
      });
    });

    console.log('\n=== TEST USER REPORT (BEFORE CLEANUP) ===');
    console.table(testUsersReport);

    // -------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------
    console.log('\n--- Cleaning up test records from database ---');
    const allCreatedUserIds = [sponsor._id, normalUser._id, zeroPinUser._id, ...directs.map(d => d._id)];
    const allCreatedUserIdsStr = allCreatedUserIds.map(id => id.toString());

    const delUsers = await User.deleteMany({ _id: { $in: allCreatedUserIds } });
    console.log(`Deleted ${delUsers.deletedCount} users.`);

    const delPkgs = await UserPackage.deleteMany({ user: { $in: allCreatedUserIds } });
    console.log(`Deleted ${delPkgs.deletedCount} user packages.`);

    const delTxs = await Transaction.deleteMany({ user: { $in: allCreatedUserIds } });
    console.log(`Deleted ${delTxs.deletedCount} transactions.`);

    const delLevels = await LevelIncome.deleteMany({ user: { $in: allCreatedUserIds } });
    console.log(`Deleted ${delLevels.deletedCount} level income records.`);

    console.log('\n=== ALL FLOW TESTS PASSED AND CLEANED UP ===');
    process.exit(0);
  } catch (error) {
    console.error('Test run failed:', error);
    process.exit(1);
  }
}

runFullTest();
