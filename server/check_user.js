const mongoose = require('mongoose');
const User = require('./models/User');
const AuditLog = require('./models/AuditLog');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const user = await User.findOne({ userId: 'CTC79536' });
  if (!user) {
    console.log('User CTC79536 not found');
    process.exit();
  }

  console.log('--- User Document ---');
  console.log({
    userId: user.userId,
    fullName: user.fullName,
    availableBalance: user.availableBalance,
    promotionalIncome: user.promotionalIncome,
    levelIncome: user.levelIncome,
    miningIncome: user.miningIncome,
    totalEarning: user.totalEarning,
    totalInvestment: user.totalInvestment,
    isActive: user.isActive
  });

  console.log('--- Audit Logs for User ---');
  const logs = await AuditLog.find({ userId: user._id });
  console.log(`Found ${logs.length} audit logs:`);
  logs.forEach(l => {
    console.log(`  Log: action=${l.action}, date=${l.createdAt.toISOString()}, details=`, JSON.stringify(l.details));
  });

  process.exit();
}).catch(err => {
  console.error(err);
  process.exit(1);
});
