const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');
const mongoose = require('mongoose');

const User = require('./models/User');
const Package = require('./models/Package');
const UserPackage = require('./models/UserPackage');
const LevelIncome = require('./models/LevelIncome');
const MiningIncome = require('./models/MiningIncome');
const Transaction = require('./models/Transaction');
const AuditLog = require('./models/AuditLog');
const { distributeLevelIncome } = require('./services/levelService');
const { runMiningCronCycle } = require('./cron/miningCron');

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

const round6 = (num) => Math.round(num * 1000000) / 1000000;

// Color helpers for reporting
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

// Dynamic Salary Cron Compiler
function compileSalaryCron() {
  const filePath = path.join(__dirname, 'cron', 'salaryCron.js');
  let code = fs.readFileSync(filePath, 'utf8');

  // Replace cron.schedule wrapper with named function
  code = code.replace(/cron\.schedule\("0 0 15,28 \* \*",\s*async\s*\(\)\s*=>\s*\{/, 'const runSalaryCron = async () => {');

  // Dynamic stub injection to inject custom directs / leg counts in testing
  code = code.replace(
    /const legCounts = await getLegCounts\(user\._id\);/,
    'const legCounts = global.mockLegCounts || await getLegCounts(user._id);'
  );

  // Replace the closing schedule paren with module exports
  const lastIndex = code.lastIndexOf('});');
  if (lastIndex !== -1) {
    code = code.substring(0, lastIndex) + '}\nmodule.exports = { runSalaryCron, getTeamCount, getLegCounts };' + code.substring(lastIndex + 3);
  } else {
    throw new Error('Could not find closing schedule bracket in salaryCron.js');
  }

  const scratchDir = path.join(__dirname, 'scratch');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }
  const tempPath = path.join(scratchDir, 'tempSalaryCron.js');
  fs.writeFileSync(tempPath, code, 'utf8');
  return require('./scratch/tempSalaryCron');
}

// Global cleanup for test accounts
async function cleanupTestData() {
  info('Cleaning up database test records...');
  const testPattern = /^test_comp_/;
  const usersToDelete = await User.find({ userId: { $regex: testPattern } }).distinct('_id');

  await User.deleteMany({ _id: { $in: usersToDelete } });
  await UserPackage.deleteMany({ user: { $in: usersToDelete } });
  await LevelIncome.deleteMany({ user: { $in: usersToDelete } });
  await MiningIncome.deleteMany({ user: { $in: usersToDelete } });
  await Transaction.deleteMany({ user: { $in: usersToDelete } });
  await AuditLog.deleteMany({ userId: { $in: usersToDelete } });

  // Clean up dynamic stubs
  global.mockLegCounts = null;
  info('Cleanup completed.');
}

async function runSuite() {
  console.log('Connecting to database...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB.');

  const timestamp = Date.now();

  // Find or seed Test Package 1 (1.0% daily return, status active)
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
    info('Seeded Package 1 in DB.');
  }

  // Load dynamically compiled Salary Cron
  const { runSalaryCron } = compileSalaryCron();
  pass('Dynamically compiled and loaded salaryCron successfully.');

  // User registration helper
  const setupUser = async (name, email, sponsorId = null, extraUserFields = {}, extraPackageFields = {}) => {
    const user = await User.create({
      userId: `test_comp_${name.replace(/\s+/g, '')}_${timestamp}`,
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
      totalEarning: 0,
      ...extraUserFields
    });

    const userPkg = await UserPackage.create({
      userId: user.userId,
      user: user._id,
      packageId: pkg1._id,
      amount: extraUserFields.totalInvestment || 100,
      compoundingBalance: extraUserFields.totalInvestment || 100,
      dailyProfitPercent: pkg1.dailyProfit,
      status: 'active',
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      ...extraPackageFields
    });

    return { user, userPkg };
  };

  try {
    await cleanupTestData();

    // ==============================================================
    // TEST 1: ALL 30 LEVEL PERCENTAGES
    // ==============================================================
    section('TEST 1: ALL 30 LEVEL PERCENTAGES');
    info('Setting up 31-user referral chain (U1 -> U2 -> ... -> U31)');

    let lastSponsorId = null;
    const chain = [];
    for (let i = 1; i <= 31; i++) {
      const email = `test_comp_u${i}_${timestamp}@test.com`;
      const name = `U${i}`;

      const extraFields = {
        totalInvestment: 3000,
        isActive: true,
        fastrackQualified: true
      };

      const { user } = await setupUser(name, email, lastSponsorId, extraFields);
      chain.push(user);
      lastSponsorId = user._id;
    }
    info('Chain created successfully.');

    // Stub User.countDocuments to bypass directs counts check
    const originalCountDocuments = User.countDocuments;
    User.countDocuments = async function (query) {
      if (query.sponsor) {
        return 50; // satisfies all directs requirements (max is 35)
      }
      return originalCountDocuments.apply(this, arguments);
    };

    info('Triggering $100 profit generation from U31. Package 1 scalar = 0.50. Base Amount = $50.');
    const u31 = chain[30];
    await distributeLevelIncome(u31._id, 100, u31.userId);

    // Assert Level Income for U1 to U30
    for (let i = 1; i <= 30; i++) {
      const u = await User.findById(chain[31 - i - 1]._id);
      const level = i;
      const expectedPercentage = LEVEL_PERCENTAGES[level - 1];
      const expectedIncome = round6((50 * expectedPercentage) / 100);

      if (Math.abs(u.levelIncome - expectedIncome) > 0.0001) {
        fail(`Test 1 failed at level ${level} (User U${31 - level}). Expected income ${expectedIncome}, got ${u.levelIncome}`);
      }
      if (Math.abs(u.availableBalance - (expectedIncome / 2)) > 0.0001) {
        fail(`Test 1 failed available balance split at level ${level}. Expected ${expectedIncome / 2}, got ${u.availableBalance}`);
      }
      if (Math.abs(u.promotionalIncome - (expectedIncome / 2)) > 0.0001) {
        fail(`Test 1 failed promotional balance split at level ${level}. Expected ${expectedIncome / 2}, got ${u.promotionalIncome}`);
      }
    }
    pass('All 30 levels received the exact percentage matching the table, split 50/50 correctly.');

    // ==============================================================
    // TEST 2: EVERY QUALIFICATION REQUIREMENT
    // ==============================================================
    section('TEST 2: EVERY QUALIFICATION REQUIREMENT');
    info('Testing every basic level qualification requirement (Levels 1 - 30) for under-qualified staking, directs, and fully-qualified states.');

    let currentTestSponsorId = null;
    let currentTestDirectsCount = 50;

    // Direct our stub to use dynamic counts for the specific user under test
    User.countDocuments = async function (query) {
      if (query.sponsor) {
        if (query.sponsor.toString() === currentTestSponsorId?.toString()) {
          return currentTestDirectsCount;
        }
        return 50; // Keep others qualified to bypass chain
      }
      return originalCountDocuments.apply(this, arguments);
    };

    for (let level = 1; level <= 30; level++) {
      const reqs = LEVEL_REQUIREMENTS[level - 1];
      const sponsor = chain[31 - level - 1];
      currentTestSponsorId = sponsor._id;

      // Calculate effective minimum staking required (including leadership overrides)
      let leadershipStaking = 0;
      if (level >= 11 && level <= 20) {
        leadershipStaking = 1000;
      } else if (level >= 21 && level <= 29) {
        leadershipStaking = 1500;
      } else if (level === 30) {
        leadershipStaking = 3000;
      }
      let effectiveStaking = Math.max(reqs.staking, leadershipStaking);

      // Scenario A: Under-qualified Staking (Set staking to effectiveStaking - 1)
      await User.updateOne({ _id: sponsor._id }, { $set: { totalInvestment: effectiveStaking - 1, levelIncome: 0, availableBalance: 0, promotionalIncome: 0, totalEarning: 0, fastrackQualified: true } });
      currentTestDirectsCount = reqs.directs;
      await distributeLevelIncome(u31._id, 100, u31.userId);
      const sponsorA = await User.findById(sponsor._id);
      if (sponsorA.levelIncome !== 0) {
        fail(`Level ${level} qualification bypass: Staking under-qualified got payout of $${sponsorA.levelIncome}`);
      }

      // Scenario B: Under-qualified Directs (Set directs to directs - 1)
      await User.updateOne({ _id: sponsor._id }, { $set: { totalInvestment: effectiveStaking, levelIncome: 0, availableBalance: 0, promotionalIncome: 0, totalEarning: 0, fastrackQualified: true } });
      currentTestDirectsCount = reqs.directs - 1;
      await distributeLevelIncome(u31._id, 100, u31.userId);
      const sponsorB = await User.findById(sponsor._id);
      if (sponsorB.levelIncome !== 0) {
        fail(`Level ${level} qualification bypass: Directs under-qualified got payout of $${sponsorB.levelIncome}`);
      }

      // Scenario C: Fully Qualified
      await User.updateOne({ _id: sponsor._id }, { $set: { totalInvestment: effectiveStaking, levelIncome: 0, availableBalance: 0, promotionalIncome: 0, totalEarning: 0, fastrackQualified: true } });
      currentTestDirectsCount = reqs.directs;
      await distributeLevelIncome(u31._id, 100, u31.userId);
      const sponsorC = await User.findById(sponsor._id);
      const expectedPayout = round6((50 * LEVEL_PERCENTAGES[level - 1]) / 100);
      if (Math.abs(sponsorC.levelIncome - expectedPayout) > 0.0001) {
        fail(`Level ${level} fully qualified payout error: expected $${expectedPayout}, got $${sponsorC.levelIncome}`);
      }
    }
    pass('All 30 levels correctly rejected under-qualified staking, rejected under-qualified directs, and processed fully-qualified payouts perfectly.');

    // Restore standard countDocuments for other tests
    User.countDocuments = originalCountDocuments;

    // ==============================================================
    // TEST 3: LEADERSHIP CONDITIONS
    // ==============================================================
    section('TEST 3: LEADERSHIP CONDITIONS');

    // Level 11 Sponsor is chain[19]
    const l11Sponsor = chain[19];
    info(`Testing Level 11 Leadership Override for Sponsor ${l11Sponsor.userId}`);

    // Under-qualified: Stake = $900, Directs = 12
    await User.updateOne({ _id: l11Sponsor._id }, { $set: { totalInvestment: 900, levelIncome: 0, availableBalance: 0, promotionalIncome: 0, totalEarning: 0 } });
    User.countDocuments = async (query) => query.sponsor?.toString() === l11Sponsor._id.toString() ? 12 : 50;
    await distributeLevelIncome(u31._id, 100, u31.userId);
    const l11ResA = await User.findById(l11Sponsor._id);
    if (l11ResA.levelIncome === 0) {
      pass('Level 11: Stake = $900 fails leadership requirement (payout $0).');
    } else {
      fail(`Level 11: Stake = $900 bypassed leadership check! Got $${l11ResA.levelIncome}`);
    }

    // Fully qualified: Stake = $1000, Directs = 12
    await User.updateOne({ _id: l11Sponsor._id }, { $set: { totalInvestment: 1000, levelIncome: 0, availableBalance: 0, promotionalIncome: 0, totalEarning: 0 } });
    await distributeLevelIncome(u31._id, 100, u31.userId);
    const l11ResB = await User.findById(l11Sponsor._id);
    const l11Expected = round6((50 * 5) / 100); // L11 = 5% -> $2.50
    if (Math.abs(l11ResB.levelIncome - l11Expected) < 0.0001) {
      pass(`Level 11: Stake = $1000 passes leadership requirement (payout $${l11ResB.levelIncome}).`);
    } else {
      fail(`Level 11: Staking = $1000 failed to qualify. Got $${l11ResB.levelIncome}`);
    }

    // Level 30 Sponsor is chain[0]
    const l30Sponsor = chain[0];
    info(`Testing Level 30 Fastrack Leadership Condition for Sponsor ${l30Sponsor.userId}`);

    // Under-qualified: fastrackQualified = false
    await User.updateOne({ _id: l30Sponsor._id }, { $set: { totalInvestment: 3000, fastrackQualified: false, levelIncome: 0, availableBalance: 0, promotionalIncome: 0, totalEarning: 0 } });
    User.countDocuments = async (query) => query.sponsor?.toString() === l30Sponsor._id.toString() ? 35 : 50;
    await distributeLevelIncome(u31._id, 100, u31.userId);
    const l30ResA = await User.findById(l30Sponsor._id);
    if (l30ResA.levelIncome === 0) {
      pass('Level 30: fastrackQualified = false fails leadership requirement (payout $0).');
    } else {
      fail(`Level 30: fastrackQualified = false bypassed check! Got $${l30ResA.levelIncome}`);
    }

    // Fully qualified: fastrackQualified = true
    await User.updateOne({ _id: l30Sponsor._id }, { $set: { totalInvestment: 3000, fastrackQualified: true, levelIncome: 0, availableBalance: 0, promotionalIncome: 0, totalEarning: 0 } });
    await distributeLevelIncome(u31._id, 100, u31.userId);
    const l30ResB = await User.findById(l30Sponsor._id);
    const l30Expected = round6((50 * 12) / 100); // L30 = 12% -> $6.00
    if (Math.abs(l30ResB.levelIncome - l30Expected) < 0.0001) {
      pass(`Level 30: fastrackQualified = true passes leadership requirement (payout $${l30ResB.levelIncome}).`);
    } else {
      fail(`Level 30: fastrackQualified = true failed to qualify. Got $${l30ResB.levelIncome}`);
    }

    // Restore countDocuments
    User.countDocuments = originalCountDocuments;

    // ==============================================================
    // TEST 4: RANK PROMOTIONS
    // ==============================================================
    section('TEST 4: RANK PROMOTIONS');

    // Register User for promotions (Must have >= 300 investment to qualify for salary cron)
    const { user: userPromo } = await setupUser('User Promo', `test_comp_promo_${timestamp}@test.com`, null, { totalInvestment: 300 });
    info(`Created Promo User (${userPromo.userId}) with $300 staking.`);

    // Run salary cron first with no directs
    global.mockLegCounts = [];
    await runSalaryCron();
    const promoRes1 = await User.findById(userPromo._id);
    if (promoRes1.rank === 'None' && promoRes1.availableBalance === 0) {
      pass('Rank remains "None" with no directs. Expected.');
    } else {
      fail(`Failed: expected rank None and balance 0, got rank: ${promoRes1.rank}, balance: ${promoRes1.availableBalance}`);
    }

    // Satisfy L1: 5 active directs
    // Mock getLegCounts stub to return 5 active directs
    global.mockLegCounts = [
      { id: new mongoose.Types.ObjectId(), rank: 'None', count: 0 },
      { id: new mongoose.Types.ObjectId(), rank: 'None', count: 0 },
      { id: new mongoose.Types.ObjectId(), rank: 'None', count: 0 },
      { id: new mongoose.Types.ObjectId(), rank: 'None', count: 0 },
      { id: new mongoose.Types.ObjectId(), rank: 'None', count: 0 }
    ];

    await runSalaryCron();
    const promoRes2 = await User.findById(userPromo._id);
    // Expected:
    // Rank becomes L1
    // claimedRankBonuses includes L1
    // Available Balance gets L1 Bonus ($100) + L1 Half Salary ($15) = $115
    if (promoRes2.rank === 'L1' && promoRes2.claimedRankBonuses.includes('L1') && promoRes2.availableBalance === 115) {
      pass('User promoted to L1. Awarded $100 promotional bonus and $15 half salary (availableBalance = $115).');
    } else {
      fail(`Promotion to L1 failed. Rank: ${promoRes2.rank}, Bonuses: ${promoRes2.claimedRankBonuses}, Balance: ${promoRes2.availableBalance}`);
    }

    // Run cron again to ensure no duplicate bonus is credited
    await User.updateOne({ _id: userPromo._id }, { $set: { availableBalance: 0 } }); // reset balance to isolate next cycle salary
    await runSalaryCron();
    const promoRes3 = await User.findById(userPromo._id);
    // Expected: rank remains L1. Receives $15 half salary, but no second $100 rank bonus.
    if (promoRes3.rank === 'L1' && promoRes3.availableBalance === 15) {
      pass('Re-running salary cron does not credit rank bonus a second time (credited half salary $15 only).');
    } else {
      fail(`Duplicate bonus or salary error. Balance: ${promoRes3.availableBalance}`);
    }

    // ==============================================================
    // TEST 5: RANK SKIPPING
    // ==============================================================
    section('TEST 5: RANK SKIPPING');

    const { user: userSkip } = await setupUser('User Skip', `test_comp_skip_${timestamp}@test.com`, null, { totalInvestment: 300 });
    info(`Created Skip User (${userSkip.userId}) with $300 investment.`);

    // Mock legs to directly satisfy L4 requirements
    // L4 requirements in salaryCron: checkRank('L1', 4, 500) -> 4 L1 directs, 500 total team, strong leg 150 (30%), other legs 350 (70%)
    global.mockLegCounts = [
      { id: new mongoose.Types.ObjectId(), rank: 'L1', count: 150 }, // Strong leg
      { id: new mongoose.Types.ObjectId(), rank: 'L1', count: 100 },
      { id: new mongoose.Types.ObjectId(), rank: 'L1', count: 100 },
      { id: new mongoose.Types.ObjectId(), rank: 'L1', count: 100 },
      { id: new mongoose.Types.ObjectId(), rank: 'None', count: 50 }
    ];

    await runSalaryCron();
    const skipRes = await User.findById(userSkip._id);

    // Expected:
    // Old rank = None -> Promoted to L4 directly
    // Missed rank bonuses credited: L1 ($100), L2 ($300), L3 ($800), L4 ($2000) -> Total bonuses = $3200
    // Half salary for L4 (1200 / 2) = $600
    // Total availableBalance = 3200 + 600 = $3800
    // claimedRankBonuses equals ['L1', 'L2', 'L3', 'L4']
    const expectedSkipBonus = 3200;
    const expectedSkipSalary = 600;
    const expectedSkipTotal = expectedSkipBonus + expectedSkipSalary;

    if (skipRes.rank === 'L4' &&
      skipRes.claimedRankBonuses.length === 4 &&
      skipRes.claimedRankBonuses.includes('L1') &&
      skipRes.claimedRankBonuses.includes('L2') &&
      skipRes.claimedRankBonuses.includes('L3') &&
      skipRes.claimedRankBonuses.includes('L4') &&
      skipRes.availableBalance === expectedSkipTotal) {
      pass(`Rank successfully skipped from None to L4! Credited L1-L4 promotional bonuses ($3,200) and half salary ($600). Total availableBalance = $3,800.`);
    } else {
      fail(`Rank skipping failed! Rank: ${skipRes.rank}, Bonuses: ${skipRes.claimedRankBonuses}, Balance: ${skipRes.availableBalance}`);
    }

    // ==============================================================
    // TEST 6: SALARY PAYMENTS
    // ==============================================================
    section('TEST 6: SALARY PAYMENTS');

    const { user: userSalary } = await setupUser('User Salary', `test_comp_salary_${timestamp}@test.com`, null, {
      totalInvestment: 300,
      rank: 'L7',
      claimedRankBonuses: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7']
    });
    info(`Created Salary User (${userSalary.userId}) at Rank L7.`);

    // Stub mock legs to remain L7
    global.mockLegCounts = [
      { id: new mongoose.Types.ObjectId(), rank: 'L1', count: 1500 }, // Strong leg
      { id: new mongoose.Types.ObjectId(), rank: 'L1', count: 1000 },
      { id: new mongoose.Types.ObjectId(), rank: 'L1', count: 1000 },
      { id: new mongoose.Types.ObjectId(), rank: 'L1', count: 1000 },
      { id: new mongoose.Types.ObjectId(), rank: 'L1', count: 500 },
      { id: new mongoose.Types.ObjectId(), rank: 'L1', count: 0 },
      { id: new mongoose.Types.ObjectId(), rank: 'L1', count: 0 }
    ];

    // Execution 1: First payment (e.g. 15th)
    await runSalaryCron();
    const salRes1 = await User.findById(userSalary._id);
    // L7 Salary = $10,000 monthly -> Half salary = $5,000
    if (salRes1.availableBalance === 5000 && salRes1.totalEarning === 5000 && salRes1.promotionalIncome === 5000) {
      pass('Salary Payment 1 (15th) credited $5,000 successfully.');
    } else {
      fail(`Salary Payment 1 failed. Balance: ${salRes1.availableBalance}, TotalEarned: ${salRes1.totalEarning}`);
    }

    // Execution 2: Second payment (e.g. 28th)
    await runSalaryCron();
    const salRes2 = await User.findById(userSalary._id);
    if (salRes2.availableBalance === 10000 && salRes2.totalEarning === 10000 && salRes2.promotionalIncome === 10000) {
      pass('Salary Payment 2 (28th) credited another $5,000. Total month = $10,000. Verified.');
    } else {
      fail(`Salary Payment 2 failed. Balance: ${salRes2.availableBalance}, TotalEarned: ${salRes2.totalEarning}`);
    }

    // ==============================================================
    // TEST 7: MARGIN BONUS
    // ==============================================================
    section('TEST 7: MARGIN BONUS');

    const { user: userMargin, userPkg: pkgMargin } = await setupUser('User Margin', `test_comp_margin_${timestamp}@test.com`, null, { totalInvestment: 1000, rank: 'L5' });
    info(`Created Margin User (${userMargin.userId}) with rank L5 ($1,000 staking package, 1% daily base profit).`);

    // Run forced mining cron cycle
    await runMiningCronCycle(true);

    // Fetch updated user and package
    const updatedUserMargin = await User.findById(userMargin._id);
    const updatedPkgMargin = await UserPackage.findById(pkgMargin._id);

    // Daily ROI = 1.0% + Margin L5 (+3.0%) = 4% daily.
    // Daily amount = 1000 * 4% = $40.
    // Half-daily cycle (runs twice a day) = $20.
    // Split: 70% compounding reinvested = $14, 30% available balance = $6.
    const expectedMarginIncome = 20;
    const expectedCompoundingBalance = 1014;
    const expectedAvailableBalance = 6;

    const marginIncomeLog = await MiningIncome.findOne({ user: userMargin._id });

    if (marginIncomeLog &&
      marginIncomeLog.amount === expectedMarginIncome &&
      updatedUserMargin.availableBalance === expectedAvailableBalance &&
      updatedUserMargin.miningIncome === expectedMarginIncome &&
      updatedPkgMargin.compoundingBalance === expectedCompoundingBalance) {
      pass(`Margin Bonus (+3.0% for L5) added successfully! Total daily profit rate: 4%. Generated ROI: $20. Split: 70% compounding reinvested ($14), 30% available ($6).`);
    } else {
      fail(`Margin bonus calculations failed! Log: ${marginIncomeLog?.amount}, Balance: ${updatedUserMargin.availableBalance}, Compounding: ${updatedPkgMargin.compoundingBalance}`);
    }

    // ==============================================================
    // TEST 8: 4X CAP PROTECTION
    // ==============================================================
    section('TEST 8: 4X CAP PROTECTION');

    const { user: userCap, userPkg: pkgCap } = await setupUser(
      'User Cap',
      `test_comp_cap_${timestamp}@test.com`,
      null,
      { totalInvestment: 100, totalEarning: 398, availableBalance: 0 },
      { amount: 100, totalEarned: 398, dailyProfitPercent: 20.0 } // 20% of 100 = $20 daily / 2 = $10 cycle profit
    );
    info(`Created Capped User (${userCap.userId}) close to 4x limit. Investment = $100, Max Cap = $400, Current Earnings = $398.`);

    // Run forced mining cron cycle. Next cycle would normally yield $10.
    await runMiningCronCycle(true);

    const updatedUserCap = await User.findById(userCap._id);
    const updatedPkgCap = await UserPackage.findById(pkgCap._id);

    // Expected:
    // Profit truncated to exactly remaining capacity: 400 - 398 = $2
    // totalEarning hits $400 exactly
    // isActive becomes false
    // Package status becomes 'completed'
    if (updatedUserCap.totalEarning === 400 &&
      updatedUserCap.isActive === false &&
      updatedPkgCap.status === 'completed' &&
      updatedPkgCap.totalEarned === 400) {
      pass('4x Cap Protection truncated payout to exactly $2, set totalEarning = $400, marked user inactive, and completed package.');
    } else {
      fail(`Cap protection calculation failed! User Earning: ${updatedUserCap.totalEarning}, isActive: ${updatedUserCap.isActive}, Package Status: ${updatedPkgCap.status}, Earned: ${updatedPkgCap.totalEarned}`);
    }

    // Run cron again to verify no additional payouts are credited
    await runMiningCronCycle(true);
    const updatedUserCap2 = await User.findById(userCap._id);
    if (updatedUserCap2.totalEarning === 400) {
      pass('Subsequent mining cycle successfully blocked. No further payouts credited after cap hit.');
    } else {
      fail(`Cap leak discovered! Earning increased to ${updatedUserCap2.totalEarning}`);
    }

    // ==============================================================
    // TEST 9: FASTRACK DOUBLE ROI
    // ==============================================================
    section('TEST 9: FASTRACK DOUBLE ROI');

    const { user: userFast, userPkg: pkgFast } = await setupUser(
      'User Fast',
      `test_comp_fast_${timestamp}@test.com`,
      null,
      { totalInvestment: 1000, fastrackQualified: true },
      { amount: 1000, compoundingBalance: 1000, dailyProfitPercent: 1.0 } // 1.0% of 1000 / 2 = $5 normal profit
    );
    info(`Created Fastrack User (${userFast.userId}). normal profit = $5.`);

    // Run mining cycle
    await runMiningCronCycle(true);

    const updatedUserFast = await User.findById(userFast._id);
    const updatedPkgFast = await UserPackage.findById(pkgFast._id);

    // Expected:
    // Profit is doubled due to fastrack: $5 * 2 = $10
    // Split: 70% reinvest compounding = $7.00, 30% available balance = $3.00
    // compoundingBalance should become 1000 + 7 = 1007
    // availableBalance should become 3.00
    if (updatedUserFast.miningIncome === 10 &&
      updatedUserFast.availableBalance === 3 &&
      updatedPkgFast.compoundingBalance === 1007) {
      pass('Fastrack double ROI credited $10 instead of $5. Splits are calculated from the doubled $10 amount (70% compounded: $7, 30% available: $3).');
    } else {
      fail(`Fastrack Double ROI failed! Income: ${updatedUserFast.miningIncome}, Balance: ${updatedUserFast.availableBalance}, Compounded: ${updatedPkgFast.compoundingBalance}`);
    }

    // ==============================================================
    // CLEANUP
    // ==============================================================
    await cleanupTestData();

    section('FINAL SYSTEM VALIDATION SUCCESS');
    console.log(`${colors.green}  ✅ Level percentages`);
    console.log(`  ✅ Level qualifications`);
    console.log(`  ✅ Leadership conditions`);
    console.log(`  ✅ Fastrack qualification`);
    console.log(`  ✅ Margin bonuses`);
    console.log(`  ✅ Rank promotions`);
    console.log(`  ✅ Rank bonuses`);
    console.log(`  ✅ Salary payments`);
    console.log(`  ✅ 4x cap protection`);
    console.log(`  ✅ 30-level traversal`);
    console.log(`  ✅ Skip-unqualified uplines${colors.reset}`);

    console.log(`\n${colors.bold}${colors.green}*** All 9 core business logic tests completed successfully and passed! ***${colors.reset}`);
    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('Test Execution Error:', error);
    await cleanupTestData();
    await mongoose.disconnect();
    process.exit(1);
  }
}

runSuite();
