const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const User = require('./models/User');
const UserPackage = require('./models/UserPackage');
const Transaction = require('./models/Transaction');
const AuditLog = require('./models/AuditLog');

async function run() {
  console.log('Removing manually assigned package for user CTC43214...');

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
  console.log(`Found User: ${user.fullName} (ID: ${user._id})`);

  // Delete the UserPackage document
  const delPkg = await UserPackage.deleteOne({ 
    user: user._id, 
    amount: 100, 
    status: 'active'
  });
  console.log(`Deleted active UserPackage documents count: ${delPkg.deletedCount}`);

  // Delete the deposit transaction
  const delTx = await Transaction.deleteOne({
    user: user._id,
    txHash: 'MANUAL_SCRIPT_ASSIGN'
  });
  console.log(`Deleted Transaction documents count: ${delTx.deletedCount}`);

  // Delete the activation AuditLog
  const delLog = await AuditLog.deleteOne({
    userId: user._id,
    action: 'PACKAGE_ACTIVATION',
    amount: 100,
    'details.reason': 'Assigned via script'
  });
  console.log(`Deleted AuditLog documents count: ${delLog.deletedCount}`);

  // Reset user document fields
  user.activePackage = null;
  user.totalInvestment = 0;
  user.isActive = false;
  await user.save();
  console.log('Reverted User document fields (activePackage = null, totalInvestment = 0, isActive = false).');

  console.log('Package removal completed successfully!');
  process.exit(0);
}

run().catch(err => {
  console.error('Error during removal:', err);
  process.exit(1);
});
