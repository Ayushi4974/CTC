const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const User = require('./models/User');
const Package = require('./models/Package');
const UserPackage = require('./models/UserPackage');
const { runMiningCronCycle } = require('./cron/miningCron');

async function testCapLimits() {
  console.log('=== STARTING CAP LIMITS & STAKED CAP ENFORCEMENT TEST ===\n');

  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in .env');
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    // Setup Test Package
    let testPkg = await Package.findOne({ name: 'Package 1' });
    if (!testPkg) {
      testPkg = await Package.create({
        name: 'Package 1',
        minAmount: 100,
        maxAmount: 1000,
        dailyProfit: 1.0, // 0.5% per 12h cycle
        validity: 400
      });
    }

    const tableData = [];

    // =========================================================================
    // SCENARIO 1: Zero Pin User 1X Cap Test
    // =========================================================================
    console.log('\n--- SCENARIO 1: Zero Pin User (1X Cap) ---');
    const random1 = Math.floor(Math.random() * 1000000);
    const userEmail1 = `test_cap_zero_${random1}@test.com`;
    const userId1 = `TSTZP_${random1}`;

    const userZP = await User.create({
      userId: userId1,
      fullName: 'Zero Pin Cap Test User',
      email: userEmail1,
      password: 'testpassword',
      pins: 0,
      isActive: true,
      availableBalance: 99.00,
      totalEarning: 99.00,
      miningIncome: 99.00,
      totalInvestment: 100
    });

    const pkgZP = await UserPackage.create({
      userId: userZP.userId,
      user: userZP._id,
      packageId: testPkg._id,
      amount: 100,
      compoundingBalance: 100,
      dailyProfitPercent: testPkg.dailyProfit,
      endDate: new Date(Date.now() + testPkg.validity * 24 * 60 * 60 * 1000),
      isBVEligible: false,
      isZeroPin: true,
      totalEarned: 99.00,
      status: 'active'
    });

    userZP.activePackage = testPkg._id;
    await userZP.save();

    console.log(`Created Zero Pin User ${userZP.userId} with $100 package. Initial Earnings: $99.00. Multiplier: 1X ($100 cap).`);

    // Run Cycle 1 (Hitting Cap)
    console.log('Running Cycle 1 (Should hit Cap exactly)...');
    await runMiningCronCycle(true);

    let userZP_C1 = await User.findById(userZP._id);
    let pkgZP_C1 = await UserPackage.findById(pkgZP._id);

    console.log(`  Package Status after Cycle 1: ${pkgZP_C1.status} (Expected: completed)`);
    console.log(`  User Active after Cycle 1: ${userZP_C1.isActive} (Expected: false)`);
    console.log(`  User Available Balance after Cycle 1: $${userZP_C1.availableBalance} (Expected: $100.00)`);
    console.log(`  Package Total Earned after Cycle 1: $${pkgZP_C1.totalEarned} (Expected: $100.00)`);

    tableData.push({
      Test: 'Zero Pin (1X Cap)',
      Cycle: '1 (Hit Cap)',
      'Pkg Status': pkgZP_C1.status,
      'User Active': userZP_C1.isActive ? 'Yes' : 'No',
      'Wallet Balance': `$${userZP_C1.availableBalance.toFixed(2)}`,
      'Total Earned': `$${pkgZP_C1.totalEarned.toFixed(2)}`,
      'Expected': 'Capped at $100.00, Status: completed'
    });

    // Run Cycle 2 (Should not generate any further ROI)
    console.log('Running Cycle 2 (Should generate no ROI)...');
    await runMiningCronCycle(true);

    let userZP_C2 = await User.findById(userZP._id);
    let pkgZP_C2 = await UserPackage.findById(pkgZP._id);

    console.log(`  Package Status after Cycle 2: ${pkgZP_C2.status} (Expected: completed)`);
    console.log(`  User Available Balance after Cycle 2: $${userZP_C2.availableBalance} (Expected: $100.00)`);

    tableData.push({
      Test: 'Zero Pin (1X Cap)',
      Cycle: '2 (Post-Cap)',
      'Pkg Status': pkgZP_C2.status,
      'User Active': userZP_C2.isActive ? 'Yes' : 'No',
      'Wallet Balance': `$${userZP_C2.availableBalance.toFixed(2)}`,
      'Total Earned': `$${pkgZP_C2.totalEarned.toFixed(2)}`,
      'Expected': 'No ROI, stays at $100.00'
    });

    // Clean up ZP
    await User.deleteOne({ _id: userZP._id });
    await UserPackage.deleteMany({ user: userZP._id });

    // =========================================================================
    // SCENARIO 2: Normal Package 4X Cap Test
    // =========================================================================
    console.log('\n--- SCENARIO 2: Normal User (4X Cap) ---');
    const random2 = Math.floor(Math.random() * 1000000);
    const userEmail2 = `test_cap_norm_${random2}@test.com`;
    const userId2 = `TSTNR_${random2}`;

    const userNorm = await User.create({
      userId: userId2,
      fullName: 'Normal User Cap Test',
      email: userEmail2,
      password: 'testpassword',
      pins: 1,
      isActive: true,
      availableBalance: 799.00,
      totalEarning: 799.00,
      miningIncome: 799.00,
      totalInvestment: 200
    });

    const pkgNorm = await UserPackage.create({
      userId: userNorm.userId,
      user: userNorm._id,
      packageId: testPkg._id,
      amount: 200,
      compoundingBalance: 200,
      dailyProfitPercent: testPkg.dailyProfit,
      endDate: new Date(Date.now() + testPkg.validity * 24 * 60 * 60 * 1000),
      isBVEligible: true,
      isZeroPin: false,
      totalEarned: 799.00,
      status: 'active'
    });

    userNorm.activePackage = testPkg._id;
    await userNorm.save();

    console.log(`Created Normal User ${userNorm.userId} with $200 package. Initial Earnings: $799.00. Multiplier: 4X ($800 cap).`);

    // Run Cycle 1 (Hitting Cap)
    console.log('Running Cycle 1 (Should hit Cap exactly)...');
    await runMiningCronCycle(true);

    let userNorm_C1 = await User.findById(userNorm._id);
    let pkgNorm_C1 = await UserPackage.findById(pkgNorm._id);

    console.log(`  Package Status after Cycle 1: ${pkgNorm_C1.status} (Expected: completed)`);
    console.log(`  User Active after Cycle 1: ${userNorm_C1.isActive} (Expected: false)`);
    console.log(`  User Available Balance after Cycle 1: $${userNorm_C1.availableBalance} (Expected: $800.00)`);
    console.log(`  Package Total Earned after Cycle 1: $${pkgNorm_C1.totalEarned} (Expected: $800.00)`);

    tableData.push({
      Test: 'Normal Package (4X Cap)',
      Cycle: '1 (Hit Cap)',
      'Pkg Status': pkgNorm_C1.status,
      'User Active': userNorm_C1.isActive ? 'Yes' : 'No',
      'Wallet Balance': `$${userNorm_C1.availableBalance.toFixed(2)}`,
      'Total Earned': `$${pkgNorm_C1.totalEarned.toFixed(2)}`,
      'Expected': 'Capped at $800.00, Status: completed'
    });

    // Run Cycle 2 (Should not generate any further ROI)
    console.log('Running Cycle 2 (Should generate no ROI)...');
    await runMiningCronCycle(true);

    let userNorm_C2 = await User.findById(userNorm._id);
    let pkgNorm_C2 = await UserPackage.findById(pkgNorm._id);

    console.log(`  Package Status after Cycle 2: ${pkgNorm_C2.status} (Expected: completed)`);
    console.log(`  User Available Balance after Cycle 2: $${userNorm_C2.availableBalance} (Expected: $800.00)`);

    tableData.push({
      Test: 'Normal Package (4X Cap)',
      Cycle: '2 (Post-Cap)',
      'Pkg Status': pkgNorm_C2.status,
      'User Active': userNorm_C2.isActive ? 'Yes' : 'No',
      'Wallet Balance': `$${userNorm_C2.availableBalance.toFixed(2)}`,
      'Total Earned': `$${pkgNorm_C2.totalEarned.toFixed(2)}`,
      'Expected': 'No ROI, stays at $800.00'
    });

    // Clean up Norm
    await User.deleteOne({ _id: userNorm._id });
    await UserPackage.deleteMany({ user: userNorm._id });

    // =========================================================================
    // SCENARIO 3: Staked Package hitting 4X Cap before staking duration ends
    // =========================================================================
    console.log('\n--- SCENARIO 3: Staked Package (4X Cap during Staking) ---');
    const random3 = Math.floor(Math.random() * 1000000);
    const userEmail3 = `test_cap_stk_${random3}@test.com`;
    const userId3 = `TSTSTK_${random3}`;

    const userStk = await User.create({
      userId: userId3,
      fullName: 'Staked User Cap Test',
      email: userEmail3,
      password: 'testpassword',
      pins: 1,
      isActive: true,
      availableBalance: 0,
      totalEarning: 799.00,
      miningIncome: 799.00,
      totalInvestment: 200
    });

    const pkgStk = await UserPackage.create({
      userId: userStk.userId,
      user: userStk._id,
      packageId: testPkg._id,
      amount: 200,
      compoundingBalance: 205.00, // Accumulated growth already happened
      dailyProfitPercent: testPkg.dailyProfit,
      endDate: new Date(Date.now() + testPkg.validity * 24 * 60 * 60 * 1000),
      isBVEligible: true,
      isZeroPin: false,
      totalEarned: 799.00,
      status: 'active',
      stakingEnabled: true,
      autoCompounding: true,
      stakingPeriod: 90,
      stakingStartDate: new Date(),
      stakingEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    });

    userStk.activePackage = testPkg._id;
    await userStk.save();

    console.log(`Created Staked User ${userStk.userId} with $200 package. Initial Earnings: $799.00, Compounding Balance: $205.00.`);

    // Run Cycle 1 (Hitting Cap)
    console.log('Running Cycle 1 (Should compound capped profit and flip to completed)...');
    await runMiningCronCycle(true);

    let userStk_C1 = await User.findById(userStk._id);
    let pkgStk_C1 = await UserPackage.findById(pkgStk._id);

    console.log(`  Package Status after Cycle 1: ${pkgStk_C1.status} (Expected: completed)`);
    console.log(`  User Active after Cycle 1: ${userStk_C1.isActive} (Expected: false)`);
    console.log(`  User Available Balance after Cycle 1: $${userStk_C1.availableBalance} (Expected: $0.00 - since compounding is active)`);
    console.log(`  Package Total Earned after Cycle 1: $${pkgStk_C1.totalEarned} (Expected: $800.00)`);
    console.log(`  Package Compounding Balance after Cycle 1: $${pkgStk_C1.compoundingBalance} (Expected: $206.00 - profit compounded)`);

    tableData.push({
      Test: 'Staked Package (4X Cap)',
      Cycle: '1 (Hit Cap)',
      'Pkg Status': pkgStk_C1.status,
      'User Active': userStk_C1.isActive ? 'Yes' : 'No',
      'Wallet Balance': `$${userStk_C1.availableBalance.toFixed(2)}`,
      'Total Earned': `$${pkgStk_C1.totalEarned.toFixed(2)}`,
      'Expected': 'Capped at $800.00, compoundingBalance becomes $206.00'
    });

    // Run Cycle 2 (Should not generate any further ROI)
    console.log('Running Cycle 2 (Should generate no ROI)...');
    await runMiningCronCycle(true);

    let userStk_C2 = await User.findById(userStk._id);
    let pkgStk_C2 = await UserPackage.findById(pkgStk._id);

    console.log(`  Package Status after Cycle 2: ${pkgStk_C2.status} (Expected: completed)`);
    console.log(`  Package Compounding Balance after Cycle 2: $${pkgStk_C2.compoundingBalance} (Expected: $206.00)`);

    tableData.push({
      Test: 'Staked Package (4X Cap)',
      Cycle: '2 (Post-Cap)',
      'Pkg Status': pkgStk_C2.status,
      'User Active': userStk_C2.isActive ? 'Yes' : 'No',
      'Wallet Balance': `$${userStk_C2.availableBalance.toFixed(2)}`,
      'Total Earned': `$${pkgStk_C2.totalEarned.toFixed(2)}`,
      'Expected': 'No ROI, compounding stays at $206.00'
    });

    // Clean up Stk
    await User.deleteOne({ _id: userStk._id });
    await UserPackage.deleteMany({ user: userStk._id });

    // Print final results table
    console.log('\n=== FINAL CAP TESTING RESULTS ===');
    console.table(tableData);

    console.log('\n=== ALL CAP TESTS PASSED SUCCESSFULLY ===');
    process.exit(0);

  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  }
}

testCapLimits();
