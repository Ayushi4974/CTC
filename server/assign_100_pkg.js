const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const User = require('./models/User');
const Package = require('./models/Package');
const UserPackage = require('./models/UserPackage');
const Transaction = require('./models/Transaction');
const AuditLog = require('./models/AuditLog');

async function run() {
  console.log('Assigning $100 Package 1 to user CTC43214...');

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not defined in env');
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  const user = await User.findOne({ userId: 'CTC43214' });
  if (!user) {
    console.error('User CTC43214 not found in database!');
    process.exit(1);
  }
  console.log(`Found User: ${user.fullName} (ID: ${user._id}), Current Pins: ${user.pins}, Active: ${user.isActive}`);

  let pkg = await Package.findOne({ name: 'Package 1' });
  if (!pkg) {
    // Fallback: look for any package containing 100
    pkg = await Package.findOne({ minAmount: { $lte: 100 }, maxAmount: { $gte: 100 } });
  }

  if (!pkg) {
    console.error('No suitable Package found in the database!');
    process.exit(1);
  }
  console.log(`Using Package: ${pkg.name} (ID: ${pkg._id}), dailyProfit: ${pkg.dailyProfit}%`);

  // Deactivate any existing active packages for user to avoid duplicate conflicts
  const deact = await UserPackage.updateMany({ user: user._id, status: 'active' }, { $set: { status: 'completed' } });
  if (deact.modifiedCount > 0) {
    console.log(`Deactivated ${deact.modifiedCount} existing active packages for this user.`);
  }

  // Create UserPackage
  const isZeroPin = false;
  const userPackage = await UserPackage.create({
    userId: user.userId,
    user: user._id,
    packageId: pkg._id,
    amount: 100,
    compoundingBalance: 100,
    dailyProfitPercent: pkg.dailyProfit,
    endDate: new Date(Date.now() + pkg.validity * 24 * 60 * 60 * 1000),
    isBVEligible: true,
    isZeroPin,
    isStaked: false,
    stakingDuration: 0,
    stakingEnabled: false,
    stakingPeriod: 0,
    autoCompounding: false,
    status: 'active'
  });
  console.log(`Created active UserPackage document: ${userPackage._id}`);

  // Update User
  user.activePackage = pkg._id;
  user.totalInvestment = 100;
  user.pins = 1; // Revert user back to 1 Pin (Standard Package User)
  user.isActive = true;
  await user.save();
  console.log(`Updated User document (totalInvestment: $100, isActive: true, activePackage set).`);

  // Create Audit Log
  await AuditLog.create({
    action: 'PACKAGE_ACTIVATION',
    userId: user._id,
    packageId: userPackage._id,
    amount: 100,
    details: {
      isManualAssignment: true,
      targetUser: user.userId,
      reason: 'Assigned via script'
    }
  });
  console.log('Created AuditLog entry.');

  // Create Transaction Log
  await Transaction.create({
    userId: user.userId,
    user: user._id,
    type: 'deposit',
    amount: 100,
    txHash: 'MANUAL_SCRIPT_ASSIGN',
    status: 'success',
    description: `Manual package assignment: ${pkg.name}`
  });
  console.log('Created Transaction log entry.');

  console.log('Package assignment complete successfully!');
  process.exit(0);
}

run().catch(err => {
  console.error('Error during assignment:', err);
  process.exit(1);
});
