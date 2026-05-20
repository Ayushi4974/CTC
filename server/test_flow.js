require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Package = require('./models/Package');
const UserPackage = require('./models/UserPackage');
const { distributeDirectReferral } = require('./services/referralService');
const { distributeLevelIncome } = require('./services/levelService');
const MiningIncome = require('./models/MiningIncome');
const ReferralIncome = require('./models/ReferralIncome');
const LevelIncome = require('./models/LevelIncome');
const AuditLog = require('./models/AuditLog');

const round6 = (num) => Math.round(num * 1000000) / 1000000;

async function runTest() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB for Testing Flow...');

  const timestamp = Date.now();
  
  // Cleanup previous test data just in case
  await User.deleteMany({ email: { $regex: 'testflow' } });

  // Ensure Package 1 exists for testing
  let pkg1 = await Package.findOne({ minAmount: 100 });
  if (!pkg1) {
    pkg1 = await Package.create({
      name: 'Package 1',
      minAmount: 100,
      maxAmount: 1000,
      dailyProfit: 1.0, // 1% daily = 0.5% every 12h
      validity: 365,
      isReferralOnly: false,
      status: true
    });
  }

  // Helper to create a user
  const createUser = async (name, email, sponsorId = null) => {
    return await User.create({
      userId: `USR${timestamp}${Math.floor(Math.random()*1000)}`,
      fullName: name,
      email: email,
      password: 'hashedpassword',
      referralCode: `REF${timestamp}${Math.floor(Math.random()*1000)}`,
      sponsor: sponsorId,
      isActive: false
    });
  };

  // Helper to buy package
  const buyPackage = async (user, amount) => {
    const userPkg = await UserPackage.create({
      userId: user.userId,
      user: user._id,
      packageId: pkg1._id,
      amount: amount,
      compoundingBalance: amount,
      status: 'active',
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      dailyProfitPercent: pkg1.dailyProfit / 2 // mining cron assumes dailyProfitPercent is already half or it divides it?
      // Wait, let's check miningCron: `(baseAmount * (totalDailyPercent / 100)) / 2`. So totalDailyPercent should be the FULL daily profit.
    });
    
    // In packageController, dailyProfitPercent is set to pkg.dailyProfit
    userPkg.dailyProfitPercent = pkg1.dailyProfit;
    await userPkg.save();

    user.isActive = true;
    user.totalInvestment += amount;
    await user.save();

    if (user.sponsor) {
      await distributeDirectReferral(user.sponsor, amount, user.userId, user._id);
    }
    return userPkg;
  };

  try {
    console.log('--- SETUP ACCOUNTS ---');
    const userA = await createUser('Test User A', `testflowA_${timestamp}@test.com`);
    
    // User A buys $100 package
    await buyPackage(userA, 100);
    console.log('User A bought $100 package.');

    console.log('\n--- STEP 1: TEST PROMOTIONAL BONUS ---');
    const userB = await createUser('Test User B', `testflowB_${timestamp}@test.com`, userA._id);
    await buyPackage(userB, 100);
    console.log('User B bought $100 package.');

    const userA_AfterB = await User.findById(userA._id);
    console.log(`User A availableBalance: $${userA_AfterB.availableBalance}`);
    if (userA_AfterB.availableBalance === 15) {
      console.log('✅ PASS: Direct Referral Bonus is 15% ($15)');
    } else {
      console.error(`❌ FAIL: Direct Referral Bonus is ${userA_AfterB.availableBalance}, expected 15`);
    }

    console.log('\n--- STEP 2: TEST FASTRACK BONUS ---');
    const userC = await createUser('Test User C', `testflowC_${timestamp}@test.com`, userA._id);
    const userD = await createUser('Test User D', `testflowD_${timestamp}@test.com`, userA._id);
    const userE = await createUser('Test User E', `testflowE_${timestamp}@test.com`, userA._id);
    const userF = await createUser('Test User F', `testflowF_${timestamp}@test.com`, userA._id);

    await buyPackage(userC, 100);
    await buyPackage(userD, 100);
    await buyPackage(userE, 100);
    await buyPackage(userF, 100);

    // Manually trigger fastrack logic as it's done in packageController
    const checkFastrack = async (sponsorId) => {
      const sponsor = await User.findById(sponsorId);
      const sponsorPkg = await UserPackage.findOne({ user: sponsor._id, status: 'active' });
      const directsWithQualifyingPkg = await UserPackage.countDocuments({
        user: { $in: await User.find({ sponsor: sponsor._id }).distinct('_id') },
        amount: { $gte: sponsorPkg.amount },
        status: 'active'
      });
      if (directsWithQualifyingPkg >= 5) {
        sponsor.fastrackQualified = true;
        await sponsor.save();
      }
    };
    await checkFastrack(userA._id);

    const userA_Fastrack = await User.findById(userA._id);
    console.log(`User A fastrackQualified: ${userA_Fastrack.fastrackQualified}`);
    if (userA_Fastrack.fastrackQualified === true) {
      console.log('✅ PASS: 5 directs activated Fastrack Bonus');
    } else {
      console.error('❌ FAIL: Fastrack Bonus did not activate');
    }

    console.log('\n--- STEP 3: TEST MINING CRON (AUTO-COMPOUND) ---');
    // Simulate mining cron for B
    const simulateMining = async (user, userPkg) => {
       const u = await User.findById(user._id);
       let profitAmount = (userPkg.compoundingBalance * (userPkg.dailyProfitPercent / 100)) / 2;
       if (u.fastrackQualified) profitAmount *= 2;
       profitAmount = round6(profitAmount);

       const reinvestAmount = round6(profitAmount * 0.70);
       const withdrawableAmount = round6(profitAmount - reinvestAmount);

       u.availableBalance += withdrawableAmount;
       userPkg.compoundingBalance += reinvestAmount;
       await u.save();
       await userPkg.save();
       
       return profitAmount;
    };

    const pkgB = await UserPackage.findOne({ user: userB._id });
    const profitB = await simulateMining(userB, pkgB);
    const uB = await User.findById(userB._id);
    const pkgBAfter = await UserPackage.findById(pkgB._id);
    
    // Expecting dynamic profit calculation based on DB value
    const expectedProfit = round6((100 * (pkgB.dailyProfitPercent / 100)) / 2);
    const expectedReinvest = round6(expectedProfit * 0.70);
    const expectedAvailable = round6(expectedProfit * 0.30);
    
    console.log(`User B Profit Generated: $${profitB}`);
    console.log(`User B Available Balance (30%): $${uB.availableBalance}`);
    console.log(`User B Compounding Balance (70%): $${pkgBAfter.compoundingBalance}`);
    
    if (profitB === expectedProfit && uB.availableBalance === expectedAvailable && pkgBAfter.compoundingBalance === (100 + expectedReinvest)) {
       console.log('✅ PASS: Mining profit split 70/30 accurately for normal user.');
    } else {
       console.error('❌ FAIL: Auto-compound calculation is incorrect for normal user.');
    }

    const pkgA = await UserPackage.findOne({ user: userA._id });
    const profitA = await simulateMining(userA, pkgA);
    const expectedFastrackProfit = expectedProfit * 2;
    console.log(`User A Profit Generated (Fastrack): $${profitA}`);
    if (profitA === expectedFastrackProfit) {
       console.log('✅ PASS: Fastrack successfully doubled ROI.');
    } else {
       console.error(`❌ FAIL: Expected ${expectedFastrackProfit} Fastrack ROI, got ${profitA}`);
    }

    console.log('\n--- STEP 4: TEST LEVEL BONUS (50/50 SPLIT) ---');
    // Simulate level distribution from User B's mining profit to User A
    await distributeLevelIncome(userB._id, profitB, userB.userId);
    
    const uA_Final = await User.findById(userA._id);
    const levelBase = profitB * 0.20; // Package 1 scalar
    const levelTotal = levelBase * 0.15; // 15% for Level 1
    const expectedPromo = round6(levelTotal * 0.50);
    
    console.log(`User A Promotional Income: $${uA_Final.promotionalIncome}`);
    console.log(`User A Final Available Balance: $${uA_Final.availableBalance}`);

    if (uA_Final.promotionalIncome === expectedPromo) {
       console.log('✅ PASS: Level Bonus successfully applied 50/50 split.');
    } else {
       console.error(`❌ FAIL: Expected Promotional Income ${expectedPromo}, got ${uA_Final.promotionalIncome}`);
    }

    console.log('\n--- CLEANUP ---');
    await User.deleteMany({ email: { $regex: 'testflow' } });
    console.log('Test data removed.');
    process.exit(0);

  } catch (err) {
    console.error('TEST ERROR:', err);
    process.exit(1);
  }
}

runTest();
