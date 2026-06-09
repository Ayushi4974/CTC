const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const User = require('./models/User');
const UserPackage = require('./models/UserPackage');
const Transaction = require('./models/Transaction');
const AuditLog = require('./models/AuditLog');

async function run() {
  console.log('Permanently deleting all packages and associated logs for user CTC43214...');

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

  // Delete all UserPackage documents (active, completed, etc.) for this user
  const delPkgs = await UserPackage.deleteMany({ user: user._id });
  console.log(`Deleted UserPackage documents count: ${delPkgs.deletedCount}`);

  // Delete all deposit transaction logs for this user
  const delTxs = await Transaction.deleteMany({ 
    user: user._id, 
    type: 'deposit' 
  });
  console.log(`Deleted deposit Transaction documents count: ${delTxs.deletedCount}`);

  // Delete all package activation audit logs for this user
  const delLogs = await AuditLog.deleteMany({ 
    userId: user._id, 
    action: 'PACKAGE_ACTIVATION' 
  });
  console.log(`Deleted activation AuditLog documents count: ${delLogs.deletedCount}`);

  // Reset user model fields
  user.activePackage = null;
  user.totalInvestment = 0;
  user.isActive = false;
  await user.save();
  console.log('Reset User document fields (activePackage = null, totalInvestment = 0, isActive = false).');

  console.log('All packages and logs deleted successfully!');
  process.exit(0);
}

run().catch(err => {
  console.error('Error during permanent deletion:', err);
  process.exit(1);
});
