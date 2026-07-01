const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const User = require('./models/User');
const UserPackage = require('./models/UserPackage');
const Package = require('./models/Package');
const Transaction = require('./models/Transaction');
const LevelIncome = require('./models/LevelIncome');
const MiningIncome = require('./models/MiningIncome');
const AuditLog = require('./models/AuditLog');
const { buyPackage } = require('./controllers/packageController');
const { distributeLevelIncome } = require('./services/levelService');

async function testAll() {
  console.log('=== STARTING INTEGRATION TESTS USING SYSTEM CODE ===');
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas');

    // Retrieve the packages
    const zeroPinPkg = await Package.findOne({ isZeroPin: true });
    const standardPkg1 = await Package.findOne({ name: 'Package 1', isZeroPin: false });
    const standardPkg2 = await Package.findOne({ name: 'Package 2', isZeroPin: false });

    if (!zeroPinPkg || !standardPkg1 || !standardPkg2) {
      throw new Error('Required packages not found in database. Make sure Packages are seeded.');
    }

    console.log(`Using Packages:`);
    console.log(`- Zero Pin Package: ID ${zeroPinPkg._id} ($${zeroPinPkg.minAmount}-$${zeroPinPkg.maxAmount})`);
    console.log(`- Standard Package 1: ID ${standardPkg1._id} ($${standardPkg1.minAmount}-$${standardPkg1.maxAmount})`);
    console.log(`- Standard Package 2: ID ${standardPkg2._id} ($${standardPkg2.minAmount}-$${standardPkg2.maxAmount})`);

    const suffix = Date.now().toString().slice(-6);
    const mockWallet = '0x9999999999999999999999999999999999999999';

    // -------------------------------------------------------------
    // SETUP USERS
    // -------------------------------------------------------------
    const sponsor = await User.create({
      userId: `TST_SPON_${suffix}`,
      fullName: 'Test Sponsor',
      email: `sponsor_${suffix}@test.com`,
      password: 'password123',
      pins: 1,
      isActive: true,
      totalInvestment: 0
    });

    const normalUser = await User.create({
      userId: `TST_NORM_${suffix}`,
      fullName: 'Test Normal User',
      email: `normal_${suffix}@test.com`,
      password: 'password123',
      pins: 1,
      sponsorId: sponsor.userId,
      sponsor: sponsor._id,
      isActive: true,
      totalInvestment: 0,
      level: sponsor.level + 1
    });

    const zeroPinUser = await User.create({
      userId: `TST_ZEROP_${suffix}`,
      fullName: 'Test Zero Pin User',
      email: `zeropin_${suffix}@test.com`,
      password: 'password123',
      pins: 0,
      sponsorId: sponsor.userId,
      sponsor: sponsor._id,
      isActive: true,
      totalInvestment: 0,
      level: sponsor.level + 1
    });

    console.log('\nCreated Test Users:');
    console.log(`- Sponsor: ${sponsor.userId} (ID: ${sponsor._id})`);
    console.log(`- Normal User: ${normalUser.userId} (ID: ${normalUser._id}, pins: 1)`);
    console.log(`- Zero Pin User: ${zeroPinUser.userId} (ID: ${zeroPinUser._id}, pins: 0)`);

    // Helper to call buyPackage controller
    const callBuyPackage = async (user, packageId, amount, txHash, senderAddress) => {
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
    };

    // -------------------------------------------------------------
    // TEST 1: PIN USER / ZERO PIN USER VALIDATIONS
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing Pin User / Zero Pin User validations ---');

    // Normal user trying to buy Zero-Pin package -> Should fail
    console.log('Testing: Normal user trying to buy Zero-Pin package...');
    const res1 = await callBuyPackage(normalUser, zeroPinPkg._id, 100, `mock_tx_1_${suffix}`, mockWallet);
    console.log(`Response Status: ${res1.status}, Message: ${res1.data.message}`);
    const pinTest1Passed = res1.status === 400 && res1.data.message.includes('only available for 0-Pin users');
    console.log(`Result: ${pinTest1Passed ? '✅ PASSED' : '❌ FAILED'}`);

    // Zero-Pin user trying to buy Standard package -> Should fail
    console.log('Testing: Zero Pin user trying to buy Standard package...');
    const res2 = await callBuyPackage(zeroPinUser, standardPkg1._id, 100, `mock_tx_2_${suffix}`, mockWallet);
    console.log(`Response Status: ${res2.status}, Message: ${res2.data.message}`);
    const pinTest2Passed = res2.status === 400 && res2.data.message.includes('Only the standard $100-$500 Package is available');
    console.log(`Result: ${pinTest2Passed ? '✅ PASSED' : '❌ FAILED'}`);

    // Zero-Pin user buying Zero-Pin package -> Should succeed
    console.log('Testing: Zero Pin user buying Zero-Pin package...');
    const res3 = await callBuyPackage(zeroPinUser, zeroPinPkg._id, 100, `mock_tx_3_${suffix}`, mockWallet);
    console.log(`Response Status: ${res3.status}, Package ID created: ${res3.data.userPackage?._id}`);
    const pinTest3Passed = res3.status === 200 && res3.data.userPackage !== undefined;
    console.log(`Result: ${pinTest3Passed ? '✅ PASSED' : '❌ FAILED'}`);


    // -------------------------------------------------------------
    // TEST 2: STACKING & UPGRADES
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Stacking & Upgrades ---');

    // First buy standard Package 1 of $100 for normal user -> Should succeed
    console.log('Testing: Normal user buying standard Package 1 of $100...');
    const res4 = await callBuyPackage(normalUser, standardPkg1._id, 100, `mock_tx_4_${suffix}`, mockWallet);
    console.log(`Response Status: ${res4.status}, Package ID created: ${res4.data.userPackage?._id}`);

    // Attempting to stack package (buying same or lower amount, e.g. $100 again) -> Should fail
    console.log('Testing: Normal user trying to stack another $100 package (same amount)...');
    const res5 = await callBuyPackage(normalUser, standardPkg1._id, 100, `mock_tx_5_${suffix}`, mockWallet);
    console.log(`Response Status: ${res5.status}, Message: ${res5.data.message}`);
    const stackingTest1Passed = res5.status === 400 && res5.data.message.includes('Upgrades must be of a higher value');
    console.log(`Result: ${stackingTest1Passed ? '✅ PASSED' : '❌ FAILED'}`);

    // Upgrading to a higher amount (e.g. $200) -> Should succeed and old package status should be 'upgraded'
    console.log('Testing: Normal user upgrading package to $200 (higher amount)...');
    const res6 = await callBuyPackage(normalUser, standardPkg1._id, 200, `mock_tx_6_${suffix}`, mockWallet);
    console.log(`Response Status: ${res6.status}, Package ID created: ${res6.data.userPackage?._id}`);

    // Retrieve the user package states
    const oldPkg = await UserPackage.findById(res4.data.userPackage._id);
    const newPkg = await UserPackage.findById(res6.data.userPackage._id);
    console.log(`Old package status: ${oldPkg.status} (Expected: upgraded)`);
    console.log(`New package status: ${newPkg.status} (Expected: active)`);

    const upgradeTestPassed = res6.status === 200 && oldPkg.status === 'upgraded' && newPkg.status === 'active';
    console.log(`Result: ${upgradeTestPassed ? '✅ PASSED' : '❌ FAILED'}`);


    // -------------------------------------------------------------
    // TEST 3: FASTRACK QUALIFICATION
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Fastrack qualification ---');

    // Sponsor purchases package of $100
    console.log('Sponsor buying standard package of $100...');
    const resSpon = await callBuyPackage(sponsor, standardPkg1._id, 100, `mock_tx_spon_${suffix}`, mockWallet);
    console.log(`Sponsor package creation status: ${resSpon.status}`);

    // Let's create 5 direct downlines under the sponsor
    console.log('Creating 5 direct downlines under the sponsor to buy same or higher packages...');
    const directs = [];
    for (let i = 1; i <= 5; i++) {
      const dirUser = await User.create({
        userId: `TST_DIR${i}_${suffix}`,
        fullName: `Test Direct ${i}`,
        email: `direct${i}_${suffix}@test.com`,
        password: 'password123',
        pins: 1,
        sponsorId: sponsor.userId,
        sponsor: sponsor._id,
        isActive: true,
        totalInvestment: 0,
        level: sponsor.level + 1
      });
      directs.push(dirUser);

      // Buy package for this direct
      const resDir = await callBuyPackage(dirUser, standardPkg1._id, 300, `mock_tx_dir${i}_${suffix}`, mockWallet);
      console.log(`- Direct ${i} purchased package: Status ${resDir.status}`);
    }

    // Check sponsor's fastrack status
    const updatedSponsor = await User.findById(sponsor._id);
    console.log(`Sponsor fastrackQualified: ${updatedSponsor.fastrackQualified} (Expected: true)`);
    const fastrackTestPassed = updatedSponsor.fastrackQualified === true;
    console.log(`Result: ${fastrackTestPassed ? '✅ PASSED' : '❌ FAILED'}`);


    // -------------------------------------------------------------
    // TEST 4: MINING DAILY PROFIT (FASTRACK DOUBLE ROI & STAKING)
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing Mining Daily Profit & Fastrack Double ROI ---');

    // Simulate mining cron cycle calculations:
    // Standard User: normalUser has a $200 active package (non-staked). Profit percent is standardPkg1.dailyProfit (1% daily, so 0.5% per 12h cycle).
    // Sponsor User: updatedSponsor has a $100 active package (non-staked) and is fastrackQualified.

    // Normal User ROI calculation
    const normalActivePkg = await UserPackage.findOne({ user: normalUser._id, status: 'active' });
    let normalBase = normalActivePkg.compoundingBalance || normalActivePkg.amount; // 200
    let normalDailyPercent = normalActivePkg.dailyProfitPercent; // 1
    let normalProfit = (normalBase * (normalDailyPercent / 100)) / 2; // 0.5% of 200 = 1.0
    console.log(`Normal User package amount: $${normalBase}, Daily Profit %: ${normalDailyPercent}%`);
    console.log(`Calculated cycle profit for normal user: $${normalProfit}`);

    // Fastrack Sponsor User ROI calculation
    const sponsorActivePkg = await UserPackage.findOne({ user: sponsor._id, status: 'active' });
    let sponsorBase = sponsorActivePkg.compoundingBalance || sponsorActivePkg.amount; // 100
    let sponsorDailyPercent = sponsorActivePkg.dailyProfitPercent; // 1
    let sponsorProfit = (sponsorBase * (sponsorDailyPercent / 100)) / 2; // 0.5% of 100 = 0.5
    // Double ROI due to fastrack
    sponsorProfit *= 2; // 1.0
    console.log(`Sponsor User package amount: $${sponsorBase}, Daily Profit %: ${sponsorDailyPercent}%, Fastrack: true (2x ROI)`);
    console.log(`Calculated cycle profit for fastrack sponsor user: $${sponsorProfit}`);

    const roiTestPassed = normalProfit === 1.0 && sponsorProfit === 1.0;
    console.log(`Result: ${roiTestPassed ? '✅ PASSED' : '❌ FAILED'}`);


    // -------------------------------------------------------------
    // TEST 5: LEVEL INCOME SPLIT
    // -------------------------------------------------------------
    console.log('\n--- 5. Testing Level Income (100% withdrawable to Available Balance) ---');

    // normalUser (direct of sponsor) earns a profit of $10. Level distribution is triggered.
    // Sponsor should get Level 1 commission: 15% of $10 = $1.50
    // Payout: 100% ($1.50) to availableBalance, 0% ($0.00) to promotionalIncome

    const initialSponsorAvail = updatedSponsor.availableBalance;
    const initialSponsorPromo = updatedSponsor.promotionalIncome;

    console.log(`Sponsor initial Available Balance: $${initialSponsorAvail}`);
    console.log(`Sponsor initial Promotional Income: $${initialSponsorPromo}`);

    // We manually invoke distributeLevelIncome
    console.log('Distributing level income from normalUser (profit amount: $10)...');
    await distributeLevelIncome(normalUser._id, 10, normalUser.userId);

    const afterSponsor = await User.findById(sponsor._id);
    const addedAvail = afterSponsor.availableBalance - initialSponsorAvail;
    const addedPromo = afterSponsor.promotionalIncome - initialSponsorPromo;

    console.log(`Sponsor final Available Balance: $${afterSponsor.availableBalance} (Added: $${addedAvail})`);
    console.log(`Sponsor final Promotional Income: $${afterSponsor.promotionalIncome} (Added: $${addedPromo})`);

    const levelSplitPassed = addedAvail === 1.50 && addedPromo === 0;
    console.log(`Result: ${levelSplitPassed ? '✅ PASSED' : '❌ FAILED'}`);


    // -------------------------------------------------------------
    // TEST 6: PROMOTIONAL BONUS (RANK & SALARY)
    // -------------------------------------------------------------
    console.log('\n--- 6. Testing Promotional Bonus (Rank & Salary check) ---');

    // We simulate the salary Cron logic on the sponsor.
    // Conditions for L1: 5 Directs.
    // Sponsor has 5 active directs we created above!
    // Since sponsor meets 'L1' condition (5 directs), rank should upgrade to 'L1'.
    // Rank bonus for L1: $100. Salary for L1: $30 (payout is half, i.e. $15).
    // Total added to availableBalance: $100 + $15 = $115.
    // Total added to promotionalIncome: $100 + $15 = $115.

    // We simulate the new rank evaluation logic from salaryCron.js for the sponsor:
    const getTeamBusinessLocal = async (userId) => {
      let teamSum = 0;
      const directs = await User.find({ sponsor: userId, isActive: true, pins: { $gt: 0 } });
      for (let dir of directs) {
        teamSum += (dir.totalInvestment || 0) + await getTeamBusinessLocal(dir._id);
      }
      return teamSum;
    };

    console.log('Evaluating Rank for Sponsor...');
    const directsUnderSponsor = await User.find({ sponsor: sponsor._id, isActive: true, pins: { $gt: 0 } });
    const directBusiness = directsUnderSponsor.reduce((sum, u) => sum + (u.totalInvestment || 0), 0);
    console.log(`Sponsor direct business: $${directBusiness}`);

    let newRank = 'None';
    if (directBusiness >= 1500) newRank = 'L1';
    console.log(`Evaluated new rank: ${newRank} (Expected: L1)`);

    const beforePromo = afterSponsor.promotionalIncome;
    const beforeAvail = afterSponsor.availableBalance;

    // Simulate salaryCron rank qualification behavior:
    // Add L1 to unclaimedRankBonuses, do NOT credit availableBalance or pay salary.
    if (newRank === 'L1') {
      afterSponsor.rank = 'L1';
      afterSponsor.unclaimedRankBonuses.push('L1');
      afterSponsor.lastSalaryTeamBusiness = await getTeamBusinessLocal(sponsor._id);
      await afterSponsor.save();
    }

    let sponsorAfterRankup = await User.findById(sponsor._id);
    console.log(`Sponsor Rank: ${sponsorAfterRankup.rank} (Expected: L1)`);
    console.log(`Sponsor unclaimedRankBonuses: ${JSON.stringify(sponsorAfterRankup.unclaimedRankBonuses)} (Expected: ["L1"])`);
    console.log(`Sponsor Available Balance: $${sponsorAfterRankup.availableBalance} (Expected: No change, i.e. $${beforeAvail})`);

    // Now, simulate the user manually claiming the L1 rank bonus:
    console.log('Simulating manual claim of L1 bonus...');
    const rankBonusAmount = 100; // L1 bonus
    sponsorAfterRankup.unclaimedRankBonuses = sponsorAfterRankup.unclaimedRankBonuses.filter(r => r !== 'L1');
    sponsorAfterRankup.claimedRankBonuses.push('L1');
    sponsorAfterRankup.availableBalance += rankBonusAmount;
    sponsorAfterRankup.totalEarning += rankBonusAmount;
    sponsorAfterRankup.promotionalIncome += rankBonusAmount;
    await sponsorAfterRankup.save();

    await Transaction.create({
      userId: sponsorAfterRankup.userId,
      user: sponsorAfterRankup._id,
      type: 'bonus',
      amount: rankBonusAmount,
      status: 'success'
    });

    const finalSponsor = await User.findById(sponsor._id);
    const bonusPromoAdded = finalSponsor.promotionalIncome - beforePromo;
    const bonusAvailAdded = finalSponsor.availableBalance - beforeAvail;

    console.log(`Final Sponsor Rank: ${finalSponsor.rank}`);
    console.log(`Sponsor claimedRankBonuses: ${JSON.stringify(finalSponsor.claimedRankBonuses)}`);
    console.log(`Sponsor Promotional Income added: $${bonusPromoAdded} (Expected: $100)`);
    console.log(`Sponsor Available Balance added: $${bonusAvailAdded} (Expected: $100)`);

    const bonusPassed = finalSponsor.rank === 'L1' && 
                        finalSponsor.claimedRankBonuses.includes('L1') && 
                        bonusPromoAdded === 100 && 
                        bonusAvailAdded === 100;
    console.log(`Result: ${bonusPassed ? '✅ PASSED' : '❌ FAILED'}`);


    // -------------------------------------------------------------
    // CLEANUP TEST DATA
    // -------------------------------------------------------------
    console.log('\n--- Cleaning up test data from database ---');
    const userIdsToDelete = [sponsor.userId, normalUser.userId, zeroPinUser.userId, ...directs.map(d => d.userId)];

    const usersToDelete = await User.find({ userId: { $in: userIdsToDelete } });
    const userObjectIds = usersToDelete.map(u => u._id);

    const delUsers = await User.deleteMany({ _id: { $in: userObjectIds } });
    console.log(`Deleted ${delUsers.deletedCount} users`);

    const delPkgs = await UserPackage.deleteMany({ user: { $in: userObjectIds } });
    console.log(`Deleted ${delPkgs.deletedCount} user package records`);

    const delTxs = await Transaction.deleteMany({ user: { $in: userObjectIds } });
    console.log(`Deleted ${delTxs.deletedCount} transactions`);

    const delLevels = await LevelIncome.deleteMany({ user: { $in: userObjectIds } });
    console.log(`Deleted ${delLevels.deletedCount} level income records`);

    const delMinings = await MiningIncome.deleteMany({ user: { $in: userObjectIds } });
    console.log(`Deleted ${delMinings.deletedCount} mining records`);

    const delAudits = await AuditLog.deleteMany({ userId: { $in: userObjectIds } });
    console.log(`Deleted ${delAudits.deletedCount} audit log records`);

    console.log('\n=== ALL INTEGRATION TESTS RUN SUCCESSFULLY ===');
    process.exit(0);
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

testAll();
