const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const User = require('./models/User');
const Package = require('./models/Package');
const UserPackage = require('./models/UserPackage');
const Transaction = require('./models/Transaction');
const MiningIncome = require('./models/MiningIncome');
const LevelIncome = require('./models/LevelIncome');
const ReferralIncome = require('./models/ReferralIncome');
const Withdrawal = require('./models/Withdrawal');
const KYC = require('./models/KYC');
const Reward = require('./models/Reward');
const AuditLog = require('./models/AuditLog');

async function testDeleteUserFlow() {
  console.log('=== STARTING ADMIN USER DELETE FLOW TEST ===\n');

  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in .env');
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    // 1. Create a dummy Sponsor User (Top level)
    const sponsorObj = await User.create({
      userId: 'TEST_SPONSOR',
      fullName: 'Test Sponsor User',
      email: 'test_sponsor_del@test.com',
      password: 'testpassword',
      isActive: true
    });
    console.log(`Created Sponsor: ${sponsorObj.userId}`);

    // 2. Create target User to be deleted (linked to sponsorObj)
    const targetUser = await User.create({
      userId: 'TEST_TARGET',
      fullName: 'Test Target User',
      email: 'test_target_del@test.com',
      password: 'testpassword',
      sponsor: sponsorObj._id,
      sponsorId: sponsorObj.userId,
      isActive: true
    });
    console.log(`Created Target User (to be deleted): ${targetUser.userId}`);

    // 3. Create dummy Downline User (linked to targetUser)
    const downlineUser = await User.create({
      userId: 'TEST_DOWNLINE',
      fullName: 'Test Downline User',
      email: 'test_downline_del@test.com',
      password: 'testpassword',
      sponsor: targetUser._id,
      sponsorId: targetUser.userId,
      isActive: true
    });
    console.log(`Created Downline User (linked to target): ${downlineUser.userId}`);

    // 4. Create associated records for Target User
    const userPkg = await UserPackage.create({
      userId: targetUser.userId,
      user: targetUser._id,
      amount: 100,
      compoundingBalance: 100,
      dailyProfitPercent: 1.0
    });

    const tx = await Transaction.create({
      userId: targetUser.userId,
      user: targetUser._id,
      type: 'deposit',
      amount: 100,
      status: 'success'
    });

    const miningInc = await MiningIncome.create({
      userId: targetUser.userId,
      user: targetUser._id,
      amount: 1.0,
      percentage: 1.0
    });

    const lvlInc = await LevelIncome.create({
      userId: targetUser.userId,
      user: targetUser._id,
      fromUser: downlineUser._id,
      fromUserId: downlineUser.userId,
      level: 1,
      percentage: 10,
      amount: 0.10
    });

    const refInc = await ReferralIncome.create({
      userId: sponsorObj.userId,
      user: sponsorObj._id,
      fromUser: targetUser._id,
      fromUserId: targetUser.userId,
      income: 10.0
    });

    const kyc = await KYC.create({
      userId: targetUser.userId,
      user: targetUser._id,
      status: 'pending'
    });

    const withdrawal = await Withdrawal.create({
      userId: targetUser.userId,
      user: targetUser._id,
      amount: 50,
      deduction: 5,
      finalAmount: 45,
      walletAddress: '0x1234567890abcdef',
      status: 'pending'
    });

    const reward = await Reward.create({
      userId: targetUser.userId,
      user: targetUser._id,
      rewardType: 'Bike',
      level: 'L3'
    });

    const audit = await AuditLog.create({
      action: 'ROI_GENERATION',
      userId: targetUser._id,
      amount: 1.0
    });

    console.log('Created associated records for Target User (Packages, Transactions, Incomes, KYC, Withdrawals, Rewards, AuditLogs).');

    // 5. Execute Delete Logic (simulated)
    console.log('\n--- SIMULATING DELETE USER PROCESS ---');
    
    // Update direct referrals' sponsor pointers to bypass the deleted user
    const parentSponsor = targetUser.sponsor || null;
    const parentSponsorId = targetUser.sponsorId || '';
    
    await User.updateMany(
      { sponsor: targetUser._id },
      { $set: { sponsor: parentSponsor, sponsorId: parentSponsorId } }
    );
    console.log(`Updated referral tree: Referral direct downlines now point to sponsor ${parentSponsorId || 'None'}`);

    // Delete associated records
    await UserPackage.deleteMany({ user: targetUser._id });
    await Transaction.deleteMany({ user: targetUser._id });
    await MiningIncome.deleteMany({ user: targetUser._id });
    await LevelIncome.deleteMany({ $or: [{ user: targetUser._id }, { fromUser: targetUser._id }] });
    await ReferralIncome.deleteMany({ $or: [{ user: targetUser._id }, { fromUser: targetUser._id }] });
    await Withdrawal.deleteMany({ user: targetUser._id });
    await KYC.deleteMany({ user: targetUser._id });
    await Reward.deleteMany({ user: targetUser._id });
    await AuditLog.deleteMany({ userId: targetUser._id });
    console.log('Deleted all associated cascading records.');

    // Delete target user
    await User.deleteOne({ _id: targetUser._id });
    console.log('Deleted target user document.');

    // 6. Verify Results
    console.log('\n--- VERIFYING RESULTS ---');
    
    const findTarget = await User.findById(targetUser._id);
    console.log(`Target User in DB: ${findTarget ? 'FOUND (FAIL)' : 'NOT FOUND (PASS)'}`);

    const findDownline = await User.findById(downlineUser._id);
    console.log(`Downline Sponsor ID: ${findDownline.sponsorId} (Expected: ${sponsorObj.userId})`);
    console.log(`Downline Sponsor Object ID matches top sponsor: ${findDownline.sponsor.toString() === sponsorObj._id.toString() ? 'YES (PASS)' : 'NO (FAIL)'}`);

    const checkPkgs = await UserPackage.find({ user: targetUser._id });
    console.log(`Target User Packages count: ${checkPkgs.length} (Expected: 0)`);

    const checkTxs = await Transaction.find({ user: targetUser._id });
    console.log(`Target User Transactions count: ${checkTxs.length} (Expected: 0)`);

    const checkMining = await MiningIncome.find({ user: targetUser._id });
    console.log(`Target User Mining Incomes count: ${checkMining.length} (Expected: 0)`);

    const checkLvls = await LevelIncome.find({ $or: [{ user: targetUser._id }, { fromUser: targetUser._id }] });
    console.log(`Target User Level Incomes count (as sender or receiver): ${checkLvls.length} (Expected: 0)`);

    const checkRefs = await ReferralIncome.find({ $or: [{ user: targetUser._id }, { fromUser: targetUser._id }] });
    console.log(`Target User Referral Incomes count (as sender or receiver): ${checkRefs.length} (Expected: 0)`);

    const checkKYC = await KYC.find({ user: targetUser._id });
    console.log(`Target User KYC count: ${checkKYC.length} (Expected: 0)`);

    const checkWithdrawals = await Withdrawal.find({ user: targetUser._id });
    console.log(`Target User Withdrawals count: ${checkWithdrawals.length} (Expected: 0)`);

    const checkRewards = await Reward.find({ user: targetUser._id });
    console.log(`Target User Rewards count: ${checkRewards.length} (Expected: 0)`);

    const checkAudits = await AuditLog.find({ userId: targetUser._id });
    console.log(`Target User Audit logs count: ${checkAudits.length} (Expected: 0)`);

    // Clean up remaining test users
    console.log('\n--- CLEANING UP ---');
    await User.deleteOne({ _id: sponsorObj._id });
    await User.deleteOne({ _id: downlineUser._id });
    console.log('Cleanup complete.');

    if (!findTarget && findDownline.sponsorId === sponsorObj.userId && checkPkgs.length === 0 && checkTxs.length === 0) {
      console.log('\n=== TEST PASSED SUCCESSFULLY ===');
      process.exit(0);
    } else {
      console.log('\n=== TEST FAILED ===');
      process.exit(1);
    }

  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  }
}

testDeleteUserFlow();
