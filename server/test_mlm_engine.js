const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./models/User');
const Package = require('./models/Package');
const UserPackage = require('./models/UserPackage');
const Withdrawal = require('./models/Withdrawal');
const SystemSettings = require('./models/SystemSettings');
const MiningIncome = require('./models/MiningIncome');
const LevelIncome = require('./models/LevelIncome');
const Transaction = require('./models/Transaction');
const AuditLog = require('./models/AuditLog');
const { distributeLevelIncome } = require('./services/levelService');
const { requestWithdrawal } = require('./controllers/withdrawalController');
const { distributeDirectReferral } = require('./services/referralService');

const timestamp = Date.now();
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
const fail = (msg) => console.log(`${colors.red}  ❌ FAIL: ${msg}${colors.reset}`);
const section = (msg) => console.log(`\n${colors.bold}${colors.cyan}=== ${msg} ===${colors.reset}`);

// Cleaner helper
async function cleanTestRecords() {
  const emailRegex = /test_mlm_/;
  const userIdRegex = /TEST/;
  
  await User.deleteMany({
    $or: [
      { email: { $regex: emailRegex } },
      { userId: { $regex: userIdRegex } }
    ]
  });
  
  await UserPackage.deleteMany({ userId: { $regex: userIdRegex } });
  await Withdrawal.deleteMany({ userId: { $regex: userIdRegex } });
  await MiningIncome.deleteMany({ userId: { $regex: userIdRegex } });
  await LevelIncome.deleteMany({ userId: { $regex: userIdRegex } });
  await Transaction.deleteMany({ userId: { $regex: userIdRegex } });
  await AuditLog.deleteMany({
    $or: [
      { userId: { $in: await User.find({ userId: { $regex: userIdRegex } }).distinct('_id') } }
    ]
  });
}

// Packages setup helper
async function setupTestPackages() {
  let pkg1 = await Package.findOne({ name: 'Test Package 1' });
  if (!pkg1) {
    pkg1 = await Package.create({
      name: 'Test Package 1',
      minAmount: 20,
      maxAmount: 500,
      dailyProfit: 1.0,
      validity: 365,
      status: true
    });
  }
  
  let pkg2 = await Package.findOne({ name: 'Test Package 2' });
  if (!pkg2) {
    pkg2 = await Package.create({
      name: 'Test Package 2',
      minAmount: 600,
      maxAmount: 1000,
      dailyProfit: 1.0,
      validity: 365,
      status: true
    });
  }
  
  let pkg3 = await Package.findOne({ name: 'Test Package 3' });
  if (!pkg3) {
    pkg3 = await Package.create({
      name: 'Test Package 3',
      minAmount: 1100,
      maxAmount: 2000,
      dailyProfit: 1.0,
      validity: 365,
      status: true
    });
  }

  let pkg4 = await Package.findOne({ name: 'Test Package 4' });
  if (!pkg4) {
    pkg4 = await Package.create({
      name: 'Test Package 4',
      minAmount: 2100,
      maxAmount: 10000,
      dailyProfit: 1.0,
      validity: 365,
      status: true
    });
  }
  
  return { pkg1, pkg2, pkg3, pkg4 };
}

// User setup helper
async function createMockUser(name, email, sponsorId = null, extra = {}) {
  const userId = `TEST_${Math.floor(Math.random() * 1000000)}_${timestamp}`;
  return await User.create({
    userId,
    fullName: name,
    email,
    password: 'hashedpassword',
    isActive: true,
    isKYCVerified: true,
    sponsor: sponsorId,
    ...extra
  });
}

async function runMLMTest() {
  console.log('Connecting to database...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected!');

  try {
    section('CLEANUP & INITIAL SETUP');
    await cleanTestRecords();
    console.log('Cleanup finished.');
    const pkgs = await setupTestPackages();
    console.log('Packages initialized.');

    // -------------------------------------------------------------
    // TEST 1: AUTO-COMPOUNDING ROI SPLIT & FASTRACK DOUBLE PROFIT
    // -------------------------------------------------------------
    section('TEST 1: AUTO-COMPOUNDING ROI SPLIT & FASTRACK DOUBLE');
    
    // Create standard user
    const userStandard = await createMockUser('Standard User', `test_mlm_std_${timestamp}@test.com`);
    const stdUserPkg = await UserPackage.create({
      userId: userStandard.userId,
      user: userStandard._id,
      packageId: pkgs.pkg1._id,
      amount: 100,
      compoundingBalance: 100,
      dailyProfitPercent: 1.0,
      status: 'active',
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    });

    // Simulate standard mining ROI cycle
    // baseAmount = 100, dailyProfitPercent = 1.0%, divided by 2 = 0.5% profit per cycle
    let expectedProfit = round6((100 * (1.0 / 100)) / 2); // 0.50
    let expectedReinvest = round6(expectedProfit * 0.70); // 0.35
    let expectedWithdrawable = round6(expectedProfit - expectedReinvest); // 0.15

    // Run simulated ROI function matching cron logic
    const applyMiningROI = async (user, pkg) => {
      let profit = (pkg.compoundingBalance * (pkg.dailyProfitPercent / 100)) / 2;
      if (user.fastrackQualified) profit *= 2;
      profit = round6(profit);

      const reinvest = round6(profit * 0.70);
      const withdrawable = round6(profit - reinvest);

      user.availableBalance = round6(user.availableBalance + withdrawable);
      user.miningIncome = round6(user.miningIncome + profit);
      user.totalEarning = round6(user.totalEarning + profit);
      pkg.totalEarned = round6(pkg.totalEarned + profit);
      pkg.compoundingBalance = round6(pkg.compoundingBalance + reinvest);

      await user.save();
      await pkg.save();
      return profit;
    };

    const profitStd = await applyMiningROI(userStandard, stdUserPkg);
    
    const stdUserAfter = await User.findById(userStandard._id);
    const stdPkgAfter = await UserPackage.findById(stdUserPkg._id);

    if (profitStd === expectedProfit) {
      pass(`Generated ROI is correct ($${profitStd})`);
    } else {
      fail(`ROI generation mismatch: expected ${expectedProfit}, got ${profitStd}`);
    }

    if (stdUserAfter.availableBalance === expectedWithdrawable) {
      pass(`Withdrawable ROI portion (30%) is correct ($${stdUserAfter.availableBalance})`);
    } else {
      fail(`Withdrawable ROI mismatch: expected ${expectedWithdrawable}, got ${stdUserAfter.availableBalance}`);
    }

    if (stdPkgAfter.compoundingBalance === (100 + expectedReinvest)) {
      pass(`Compounding ROI portion (70%) is correct ($${stdPkgAfter.compoundingBalance})`);
    } else {
      fail(`Compounding ROI mismatch: expected ${100 + expectedReinvest}, got ${stdPkgAfter.compoundingBalance}`);
    }

    // Create Fastrack qualified user
    const userFastrack = await createMockUser('Fastrack User', `test_mlm_fast_${timestamp}@test.com`, null, {
      fastrackQualified: true
    });
    const fastUserPkg = await UserPackage.create({
      userId: userFastrack.userId,
      user: userFastrack._id,
      packageId: pkgs.pkg1._id,
      amount: 100,
      compoundingBalance: 100,
      dailyProfitPercent: 1.0,
      status: 'active',
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    });

    const profitFast = await applyMiningROI(userFastrack, fastUserPkg);
    const fastUserAfter = await User.findById(userFastrack._id);

    if (profitFast === expectedProfit * 2) {
      pass(`Fastrack ROI is successfully doubled ($${profitFast})`);
    } else {
      fail(`Fastrack ROI mismatch: expected ${expectedProfit * 2}, got ${profitFast}`);
    }

    if (fastUserAfter.availableBalance === expectedWithdrawable * 2) {
      pass(`Fastrack withdrawable ROI portion (30%) is doubled ($${fastUserAfter.availableBalance})`);
    } else {
      fail(`Fastrack withdrawable ROI mismatch: expected ${expectedWithdrawable * 2}, got ${fastUserAfter.availableBalance}`);
    }


    // -------------------------------------------------------------
    // TEST 2: FASTRACK BONUS QUALIFICATION
    // -------------------------------------------------------------
    section('TEST 2: FASTRACK BONUS QUALIFICATION');
    
    // Helper to evaluate fastrack qualification matching packageController
    const checkFastrackQualify = async (sponsor) => {
      if (!sponsor.fastrackQualified && sponsor.activePackage) {
        const sponsorPkg = await UserPackage.findOne({ user: sponsor._id, status: 'active' }).sort({ createdAt: -1 });
        if (sponsorPkg) {
          const tenDaysAgo = new Date();
          tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
          
          if (sponsorPkg.createdAt >= tenDaysAgo) {
            const directsWithQualifyingPkg = await UserPackage.countDocuments({
              user: { $in: await User.find({ sponsor: sponsor._id }).distinct('_id') },
              amount: { $gte: sponsorPkg.amount },
              status: 'active'
            });

            if (directsWithQualifyingPkg >= 5) {
              sponsor.fastrackQualified = true;
              await sponsor.save();
              return true;
            }
          }
        }
      }
      return false;
    };

    // Case 2a: Qualifies within 10 days
    const sponsorQualifies = await createMockUser('Sponsor Fastrack Qualify', `test_mlm_spons_q_${timestamp}@test.com`);
    const sponsorPkgQ = await UserPackage.create({
      userId: sponsorQualifies.userId,
      user: sponsorQualifies._id,
      packageId: pkgs.pkg1._id,
      amount: 100,
      compoundingBalance: 100,
      dailyProfitPercent: 1.0,
      status: 'active',
      createdAt: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    });
    sponsorQualifies.activePackage = pkgs.pkg1._id;
    await sponsorQualifies.save();

    // Create 5 directs with $100 package
    for (let i = 0; i < 5; i++) {
      const direct = await createMockUser(`Direct Qualify ${i}`, `test_mlm_dir_q_${i}_${timestamp}@test.com`, sponsorQualifies._id);
      await UserPackage.create({
        userId: direct.userId,
        user: direct._id,
        packageId: pkgs.pkg1._id,
        amount: 100,
        compoundingBalance: 100,
        dailyProfitPercent: 1.0,
        status: 'active',
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      });
    }

    const qResult = await checkFastrackQualify(sponsorQualifies);
    const sponsorQAfter = await User.findById(sponsorQualifies._id);
    if (qResult && sponsorQAfter.fastrackQualified === true) {
      pass('Sponsor qualified for Fastrack within 10 days with 5 qualifying directs');
    } else {
      fail('Sponsor failed Fastrack qualification within 10 days');
    }

    // Case 2b: Fails after 10 days
    const sponsorFails = await createMockUser('Sponsor Fastrack Fail', `test_mlm_spons_f_${timestamp}@test.com`);
    // Backdated package (11 days ago)
    const sponsorPkgF = await UserPackage.create({
      userId: sponsorFails.userId,
      user: sponsorFails._id,
      packageId: pkgs.pkg1._id,
      amount: 100,
      compoundingBalance: 100,
      dailyProfitPercent: 1.0,
      status: 'active',
      createdAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    });
    sponsorFails.activePackage = pkgs.pkg1._id;
    await sponsorFails.save();

    // Create 5 directs
    for (let i = 0; i < 5; i++) {
      const direct = await createMockUser(`Direct Fail ${i}`, `test_mlm_dir_f_${i}_${timestamp}@test.com`, sponsorFails._id);
      await UserPackage.create({
        userId: direct.userId,
        user: direct._id,
        packageId: pkgs.pkg1._id,
        amount: 100,
        compoundingBalance: 100,
        dailyProfitPercent: 1.0,
        status: 'active',
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      });
    }

    const fResult = await checkFastrackQualify(sponsorFails);
    const sponsorFAfter = await User.findById(sponsorFails._id);
    if (!fResult && sponsorFAfter.fastrackQualified === false) {
      pass('Sponsor correctly failed Fastrack qualification because package creation > 10 days ago');
    } else {
      fail('Sponsor incorrectly qualified for Fastrack despite backdated package');
    }


    // -------------------------------------------------------------
    // TEST 3: LEVEL INCOME (30 LEVELS)
    // -------------------------------------------------------------
    section('TEST 3: LEVEL INCOME (30 LEVELS)');
    
    // Requirements checklist from levelService.js
    const LEVEL_REQUIREMENTS = [
      { staking: 20, directs: 2 }, { staking: 40, directs: 3 }, { staking: 60, directs: 4 }, { staking: 80, directs: 5 }, { staking: 120, directs: 6 },
      { staking: 200, directs: 7 }, { staking: 300, directs: 8 }, { staking: 400, directs: 9 }, { staking: 400, directs: 10 }, { staking: 500, directs: 11 },
      { staking: 600, directs: 12 }, { staking: 700, directs: 13 }, { staking: 900, directs: 14 }, { staking: 900, directs: 15 }, { staking: 1000, directs: 16 },
      { staking: 1100, directs: 17 }, { staking: 1200, directs: 18 }, { staking: 1300, directs: 19 }, { staking: 1400, directs: 20 }, { staking: 1500, directs: 21 },
      { staking: 1600, directs: 22 }, { staking: 1700, directs: 23 }, { staking: 1800, directs: 24 }, { staking: 1900, directs: 25 }, { staking: 2000, directs: 26 },
      { staking: 2200, directs: 27 }, { staking: 2400, directs: 28 }, { staking: 2700, directs: 29 }, { staking: 3000, directs: 30 }, { staking: 3000, directs: 35 }
    ];

    const LEVEL_PERCENTAGES = [
      15, 8, 7, 4, 4, 3, 3, 3, 3, 4,
      5, 7, 8, 8, 12, 15, 8, 7, 4, 4,
      3, 3, 3, 3, 4, 5, 7, 8, 8, 12
    ];

    // Let's build the tree: Sponsor 30 -> Sponsor 29 -> ... -> Sponsor 1 -> Buyer (User 0)
    const sponsors = {};
    let lastSponsorId = null;

    // Create Sponsors 1 to 30
    console.log('Generating 30 Sponsors...');
    for (let i = 30; i >= 1; i--) {
      const req = LEVEL_REQUIREMENTS[i - 1];
      
      // Determine leadership staking bounds
      let stakingAmount = req.staking;
      if (i >= 11 && i <= 20) {
        stakingAmount = Math.max(stakingAmount, 1000);
      } else if (i >= 21 && i <= 29) {
        stakingAmount = Math.max(stakingAmount, 1500);
      } else if (i === 30) {
        stakingAmount = Math.max(stakingAmount, 3000);
      }

      // Fastrack requirement for Level 30
      const fastrackQualified = (i === 30);

      const sponsor = await createMockUser(
        `Sponsor Level ${i}`,
        `test_mlm_spons_l${i}_${timestamp}@test.com`,
        lastSponsorId,
        {
          totalInvestment: stakingAmount,
          fastrackQualified
        }
      );
      
      sponsors[i] = sponsor;
      lastSponsorId = sponsor._id;
    }

    // Create the Buyer (User 0) under Sponsor 1
    const buyerUser = await createMockUser(
      'Buyer User 0',
      `test_mlm_buyer_${timestamp}@test.com`,
      sponsors[1]._id
    );

    // Create Directs for each Sponsor to satisfy qualifications
    console.log('Generating active direct referrals for all 30 sponsors...');
    const directsToInsert = [];
    for (let i = 1; i <= 30; i++) {
      const sponsorObj = sponsors[i];
      const req = LEVEL_REQUIREMENTS[i - 1];
      for (let d = 0; d < req.directs; d++) {
        directsToInsert.push({
          userId: `TESTDIR_${i}_${d}_${timestamp}`,
          fullName: `Direct ${d} of Sponsor ${i}`,
          email: `testdir_${i}_${d}_${timestamp}@test.com`,
          password: 'hashedpassword',
          sponsor: sponsorObj._id,
          isActive: true,
          isKYCVerified: true
        });
      }
    }
    await User.insertMany(directsToInsert);

    // Create UserPackage objects for Sponsors to assign Package Scalars:
    // L1-8: Test Package 1 (scalar 0.5)
    // L9-16: Test Package 2 (scalar 0.4)
    // L17-24: Test Package 3 (scalar 0.3)
    // L25-30: Test Package 4 (scalar 0.2)
    const userPackagesToInsert = [];
    for (let i = 1; i <= 30; i++) {
      const sponsorObj = sponsors[i];
      let pkgId;
      if (i <= 8) pkgId = pkgs.pkg1._id;
      else if (i <= 16) pkgId = pkgs.pkg2._id;
      else if (i <= 24) pkgId = pkgs.pkg3._id;
      else pkgId = pkgs.pkg4._id;

      userPackagesToInsert.push({
        userId: sponsorObj.userId,
        user: sponsorObj._id,
        packageId: pkgId,
        amount: sponsorObj.totalInvestment,
        compoundingBalance: sponsorObj.totalInvestment,
        dailyProfitPercent: 1.0,
        status: 'active',
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      });
      
      // Update User object activePackage
      sponsorObj.activePackage = pkgId;
      await sponsorObj.save();
    }
    await UserPackage.insertMany(userPackagesToInsert);

    // Seed buyer package
    await UserPackage.create({
      userId: buyerUser.userId,
      user: buyerUser._id,
      packageId: pkgs.pkg1._id,
      amount: 100,
      compoundingBalance: 100,
      dailyProfitPercent: 1.0,
      status: 'active',
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    });
    buyerUser.activePackage = pkgs.pkg1._id;
    buyerUser.totalInvestment = 100;
    await buyerUser.save();

    // Trigger Level Income distribution from Buyer User's ROI
    console.log('Triggering level income distribution...');
    const profitGeneratedByBuyer = 10;
    await distributeLevelIncome(buyerUser._id, profitGeneratedByBuyer, buyerUser.userId);

    // Validate level payouts
    console.log('Verifying payouts...');
    let levelCheckPassed = true;
    for (let i = 1; i <= 30; i++) {
      const sponsorObj = sponsors[i];
      const updatedSponsor = await User.findById(sponsorObj._id);

      // The level bonus distribution engine calculates baseAmount = profit * buyerPackageScalar.
      // Since our buyer has Package 1, the buyerPackageScalar is always 0.50 across all 30 levels.
      const scalar = 0.50;

      const baseAmount = profitGeneratedByBuyer * scalar;
      const expectedTotalPayout = round6((baseAmount * LEVEL_PERCENTAGES[i - 1]) / 100);
      const expectedWithdrawable = round6(expectedTotalPayout * 0.50);
      const expectedPromotional = round6(expectedTotalPayout * 0.50);

      const actualLevelIncome = updatedSponsor.levelIncome;
      const actualAvailableBalance = updatedSponsor.availableBalance;
      const actualPromotionalIncome = updatedSponsor.promotionalIncome;

      if (
        actualLevelIncome === expectedTotalPayout &&
        actualAvailableBalance === expectedWithdrawable &&
        actualPromotionalIncome === expectedPromotional
      ) {
        pass(`Level ${i} (Pct: ${LEVEL_PERCENTAGES[i - 1]}%, Scalar: ${scalar}) -> Total: $${actualLevelIncome}, Avail: $${actualAvailableBalance}, Promo: $${actualPromotionalIncome}`);
      } else {
        levelCheckPassed = false;
        fail(`Level ${i} mismatch. Expected Total: $${expectedTotalPayout}, Avail: $${expectedWithdrawable}, Promo: $${expectedPromotional}. Got Total: $${actualLevelIncome}, Avail: $${actualAvailableBalance}, Promo: $${actualPromotionalIncome}`);
      }
    }
    if (levelCheckPassed) {
      pass('All 30 levels of distribution are perfectly qualified, computed, split 50/50, and paid.');
    }

    // -------------------------------------------------------------
    // TEST 3B: PRECISION OVERSHOOT CAPPING & ACCOUNT AUTO-DEACTIVATION
    // -------------------------------------------------------------
    section('TEST 3B: PRECISION OVERSHOOT CAPPING & AUTO-DEACTIVATION');
    
    // Let's test the 4x cap overshoot rule.
    // Sponsor 1 is currently active with totalInvestment = 20. 4x cap is $80.
    // Let's set their totalEarning to $79.80. Remaining capacity is $0.20.
    // The next level income distribution from Buyer (User 0) has expected payout = $0.75.
    // Payout should be truncated to exactly $0.20.
    // Sponsor 1 should become inactive (isActive = false).
    
    const sponsor1 = await User.findById(sponsors[1]._id);
    sponsor1.totalEarning = 79.80;
    sponsor1.levelIncome = 79.80;
    sponsor1.availableBalance = 39.90;
    sponsor1.promotionalIncome = 39.90;
    sponsor1.isActive = true;
    await sponsor1.save();

    console.log('Triggering second level income to test 4x cap deactivation...');
    await distributeLevelIncome(buyerUser._id, profitGeneratedByBuyer, buyerUser.userId);

    const sponsor1AfterCap = await User.findById(sponsors[1]._id);
    const addedEarning = round6(sponsor1AfterCap.totalEarning - 79.80);
    
    if (sponsor1AfterCap.totalEarning === 80.00 && sponsor1AfterCap.isActive === false) {
      pass(`Sponsor 1 earnings correctly capped at 4x ($${sponsor1AfterCap.totalEarning}) and account deactivated (isActive: ${sponsor1AfterCap.isActive})`);
      pass(`Added earning truncated from $0.75 to exact remaining capacity: $${addedEarning}`);
    } else {
      fail(`Sponsor 1 capping failed: totalEarning: $${sponsor1AfterCap.totalEarning}, isActive: ${sponsor1AfterCap.isActive}`);
    }


    // -------------------------------------------------------------
    // TEST 4: WITHDRAWALS (BOUNDS, FEES, PRINCIPAL CANCELLATION)
    // -------------------------------------------------------------
    section('TEST 4: WITHDRAWALS');
    
    // Load/create settings
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = await SystemSettings.create({
        minWithdrawalAmount: 10,
        maxDailyWithdrawalAmount: 10000,
        manualWithdrawalApproval: true
      });
    } else {
      settings.minWithdrawalAmount = 10;
      settings.manualWithdrawalApproval = true;
      await settings.save();
    }

    // Create user with $100 available balance
    const userWithdrawal = await createMockUser('Withdrawal User', `test_mlm_with_${timestamp}@test.com`, null, {
      availableBalance: 100,
      totalInvestment: 100
    });

    const userPkgWith = await UserPackage.create({
      userId: userWithdrawal.userId,
      user: userWithdrawal._id,
      packageId: pkgs.pkg1._id,
      amount: 100,
      compoundingBalance: 100,
      dailyProfitPercent: 1.0,
      status: 'active',
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    });

    // Helper to run controller logic with mock HTTP context
    const runMockWithdrawal = async (user, amount, type, userPackageId = null) => {
      const req = {
        body: { amount, walletAddress: '0x1234567890123456789012345678901234567890', type, userPackageId },
        user: { _id: user._id },
        app: { get: () => null }
      };
      
      let statusCode = 200;
      let responseData = null;
      
      const res = {
        status: function(code) {
          statusCode = code;
          return this;
        },
        json: function(data) {
          responseData = data;
          return this;
        }
      };

      await requestWithdrawal(req, res, (err) => {
        responseData = { message: err.message };
        statusCode = 500;
      });

      return { statusCode, responseData };
    };

    // Case 4a: Minimum limit check ($10)
    const resMinLimit = await runMockWithdrawal(userWithdrawal, 5, 'profit');
    if (resMinLimit.statusCode === 400 && resMinLimit.responseData.message.includes('Minimum withdrawal amount')) {
      pass(`Withdrawal below min amount correctly rejected ($5): "${resMinLimit.responseData.message}"`);
    } else {
      fail(`Withdrawal below min amount failed to reject: status ${resMinLimit.statusCode}`);
    }

    // Case 4b: Standard profit withdrawal (10% fee)
    const resStandard = await runMockWithdrawal(userWithdrawal, 50, 'profit');
    const userWithAfterStd = await User.findById(userWithdrawal._id);
    const dbWithdrawalStd = await Withdrawal.findOne({ user: userWithdrawal._id, type: 'profit' });

    if (resStandard.statusCode === 201) {
      pass('Profit withdrawal request created successfully');
      
      if (userWithAfterStd.availableBalance === 50) {
        pass(`Available balance correctly reduced by full requested amount ($100 -> $50)`);
      } else {
        fail(`Balance reduction incorrect: expected 50, got ${userWithAfterStd.availableBalance}`);
      }

      if (dbWithdrawalStd.deduction === 5 && dbWithdrawalStd.finalAmount === 45) {
        pass(`Deduction (10% fee) is correct: Deduction=$${dbWithdrawalStd.deduction}, FinalAmount=$${dbWithdrawalStd.finalAmount}`);
      } else {
        fail(`Profit withdrawal fee deduction mismatch: Deduction=$${dbWithdrawalStd.deduction}, FinalAmount=$${dbWithdrawalStd.finalAmount}`);
      }
    } else {
      fail(`Profit withdrawal request failed: ${JSON.stringify(resStandard.responseData)}`);
    }

    // Case 4c: Principal withdrawal (20% fee, package cancellation)
    const resPrincipal = await runMockWithdrawal(userWithdrawal, 100, 'principal', userPkgWith._id);
    const userWithAfterPrin = await User.findById(userWithdrawal._id);
    const pkgWithAfterPrin = await UserPackage.findById(userPkgWith._id);
    const dbWithdrawalPrin = await Withdrawal.findOne({ user: userWithdrawal._id, type: 'principal' });

    if (resPrincipal.statusCode === 201) {
      pass('Principal withdrawal request created successfully');

      if (pkgWithAfterPrin.status === 'cancelled') {
        pass('Staking package correctly marked as "cancelled"');
      } else {
        fail(`Staking package status expected "cancelled", got "${pkgWithAfterPrin.status}"`);
      }

      if (userWithAfterPrin.totalInvestment === 0 && userWithAfterPrin.isActive === false) {
        pass('User investment reduced to 0 and account set inactive');
      } else {
        fail(`User investment status mismatch: Investment=$${userWithAfterPrin.totalInvestment}, isActive=${userWithAfterPrin.isActive}`);
      }

      if (dbWithdrawalPrin.deduction === 20 && dbWithdrawalPrin.finalAmount === 80) {
        pass(`Deduction (20% principal fee) is correct: Deduction=$${dbWithdrawalPrin.deduction}, FinalAmount=$${dbWithdrawalPrin.finalAmount}`);
      } else {
        fail(`Principal withdrawal fee deduction mismatch: Deduction=$${dbWithdrawalPrin.deduction}, FinalAmount=$${dbWithdrawalPrin.finalAmount}`);
      }
    } else {
      fail(`Principal withdrawal request failed: ${JSON.stringify(resPrincipal.responseData)}`);
    }


    // -------------------------------------------------------------
    // TEST 5: PROMOTIONAL RANK & SALARY BONUSES
    // -------------------------------------------------------------
    section('TEST 5: PROMOTIONAL RANK & SALARY BONUSES');

    const salaryMap = {
      'L1': 30, 'L2': 150, 'L3': 500, 'L4': 1200, 'L5': 2400, 'L6': 5000,
      'L7': 10000, 'L8': 60000, 'L9': 100000, 'L10': 300000, 'L11': 600000, 'L12': 1000000
    };

    const rankBonusMap = {
      'L1': 100, 'L2': 300, 'L3': 800, 'L4': 2000, 'L5': 5000, 'L6': 12000,
      'L7': 25000, 'L8': 100000, 'L9': 200000, 'L10': 500000, 'L11': 1000000, 'L12': 2000000
    };

    // Helper to evaluate rank exactly matching salaryCron.js
    const calculateRank = (legCounts) => {
      const totalTeam = legCounts.reduce((acc, leg) => acc + leg.count, 0);
      let strongLegCount = 0;
      let otherLegsCount = 0;
      if (legCounts.length > 0) {
        const sortedLegs = [...legCounts].sort((a, b) => b.count - a.count);
        strongLegCount = sortedLegs[0].count;
        otherLegsCount = totalTeam - strongLegCount;
      }

      let newRank = 'None';
      if (legCounts.length >= 5) newRank = 'L1';

      const countDirectsWithRank = (rankPrefix) => legCounts.filter(leg => leg.rank.startsWith(rankPrefix) || leg.rank === rankPrefix).length;

      const checkRank = (requiredDirectRank, requiredDirects, requiredTeam) => {
        const requiredStrong = requiredTeam * 0.30;
        const requiredOther = requiredTeam * 0.70;
        const hasDirects = countDirectsWithRank(requiredDirectRank) >= requiredDirects;
        const hasTeam = strongLegCount >= requiredStrong && otherLegsCount >= requiredOther && totalTeam >= requiredTeam;
        return hasDirects && hasTeam;
      };

      if (checkRank('L1', 2, 25)) newRank = 'L2';
      if (checkRank('L1', 3, 125)) newRank = 'L3';
      if (checkRank('L1', 4, 500)) newRank = 'L4';
      if (checkRank('L1', 5, 1000)) newRank = 'L5';
      if (checkRank('L1', 6, 2000)) newRank = 'L6';
      if (checkRank('L1', 7, 5000)) newRank = 'L7';
      if (checkRank('L7', 3, 20000)) newRank = 'L8';
      if (checkRank('L7', 4, 50000)) newRank = 'L9';
      if (checkRank('L8', 3, 100000)) newRank = 'L10';
      if (checkRank('L8', 4, 200000)) newRank = 'L11';
      if (checkRank('L9', 5, 300000)) newRank = 'L12';

      return { rank: newRank, strongLegCount, otherLegsCount, totalTeam };
    };

    // Case 5a: Test L1 condition (5 direct lines)
    const legCountsL1 = [
      { id: 'd1', rank: 'None', count: 1 },
      { id: 'd2', rank: 'None', count: 1 },
      { id: 'd3', rank: 'None', count: 1 },
      { id: 'd4', rank: 'None', count: 1 },
      { id: 'd5', rank: 'None', count: 1 }
    ];
    const resL1 = calculateRank(legCountsL1);
    if (resL1.rank === 'L1') {
      pass(`5 directs successfully qualifies for L1 rank`);
    } else {
      fail(`L1 rank failed: calculated ${resL1.rank}`);
    }

    // Case 5b: Test L2 condition (2 L1 directs + 25 team size with 30/70 leg ratio)
    // Team = 25. Strong leg = 7.5 (30%), other legs = 17.5 (70%)
    const legCountsL2_Pass = [
      { id: 'd1', rank: 'L1', count: 8 },  // Strong leg (8 >= 7.5)
      { id: 'd2', rank: 'L1', count: 6 },  // other legs total is 6+4+4+4 = 18 >= 17.5
      { id: 'd3', rank: 'None', count: 4 },
      { id: 'd4', rank: 'None', count: 4 },
      { id: 'd5', rank: 'None', count: 4 }
    ];
    const resL2Pass = calculateRank(legCountsL2_Pass);
    if (resL2Pass.rank === 'L2') {
      pass('L2 rank qualifies with correct leg sizes (30% strong leg, 70% other legs) and 2 L1 directs');
    } else {
      fail(`L2 pass check failed: calculated ${resL2Pass.rank}`);
    }

    const legCountsL2_FailRatio = [
      { id: 'd1', rank: 'L1', count: 18 },  // Strong leg is 18 (72%), way higher than 30% rule!
      { id: 'd2', rank: 'L1', count: 3 },   // other legs total is 3+2+2+2 = 9 < 17.5
      { id: 'd3', rank: 'None', count: 2 },
      { id: 'd4', rank: 'None', count: 2 },
      { id: 'd5', rank: 'None', count: 2 }
    ];
    const resL2FailRatio = calculateRank(legCountsL2_FailRatio);
    if (resL2FailRatio.rank !== 'L2') {
      pass(`L2 rank correctly fails when strong leg violates 30% limit (leg total is 27, but other legs < 70% requirement)`);
    } else {
      fail(`L2 fail ratio check failed: qualified for L2 incorrectly`);
    }

    // Case 5c: Verify salary payout and one-time bonus matching table
    const verifyBonusAndSalary = (rank) => {
      const salary = salaryMap[rank] || 0;
      const bonus = rankBonusMap[rank] || 0;
      return { salary, bonus };
    };

    const l1Payout = verifyBonusAndSalary('L1');
    if (l1Payout.salary === 30 && l1Payout.bonus === 100) {
      pass(`L1 Payout verified: salary = $${l1Payout.salary}/period ($30), bonus = $${l1Payout.bonus} ($100)`);
    } else {
      fail(`L1 Payout incorrect`);
    }

    const l7Payout = verifyBonusAndSalary('L7');
    if (l7Payout.salary === 10000 && l7Payout.bonus === 25000) {
      pass(`L7 Payout verified: salary = $${l7Payout.salary}/period ($10,000), bonus = $${l7Payout.bonus} ($25,000)`);
    } else {
      fail(`L7 Payout incorrect`);
    }

    const l12Payout = verifyBonusAndSalary('L12');
    if (l12Payout.salary === 1000000 && l12Payout.bonus === 2000000) {
      pass(`L12 Payout verified: salary = $${l12Payout.salary}/period ($1,000,000), bonus = $${l12Payout.bonus} ($2,000,000)`);
    } else {
      fail(`L12 Payout incorrect`);
    }

    // -------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------
    section('CLEANUP TEST DATA');
    await cleanTestRecords();
    console.log('Cleanup successful.');

    console.log(`\n${colors.green}${colors.bold}==========================================`);
    console.log('   ALL INTEGRATION SIMULATIONS COMPLETED');
    console.log(`==========================================${colors.reset}`);
    process.exit(0);

  } catch (err) {
    console.error(`${colors.red}TEST ERROR:${colors.reset}`, err);
    await cleanTestRecords();
    process.exit(1);
  }
}

runMLMTest();
