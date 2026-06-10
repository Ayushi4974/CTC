const mongoose = require('mongoose');
const User = require('./models/User');
const UserPackage = require('./models/UserPackage');
const Package = require('./models/Package');
const MiningIncome = require('./models/MiningIncome');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const user = await User.findOne({ userId: 'CTC27896' });
  if (!user) {
    console.log('User CTC27896 not found');
    process.exit();
  }

  console.log('=== User Details ===');
  console.log({
    userId: user.userId,
    fullName: user.fullName,
    pins: user.pins,
    isActive: user.isActive,
    totalInvestment: user.totalInvestment,
    miningIncome: user.miningIncome,
    availableBalance: user.availableBalance
  });

  const activePkgs = await UserPackage.find({ user: user._id }).populate('packageId');
  console.log(`\n=== Active Packages (${activePkgs.length}) ===`);
  activePkgs.forEach(pkg => {
    console.log({
      packageId: pkg.packageId ? pkg.packageId._id : null,
      packageName: pkg.packageId ? pkg.packageId.name : 'N/A',
      amount: pkg.amount,
      dailyProfitPercent: pkg.dailyProfitPercent,
      isZeroPin: pkg.isZeroPin,
      status: pkg.status,
      createdAt: pkg.createdAt
    });
  });

  const miningIncomes = await MiningIncome.find({ user: user._id });
  console.log(`\n=== Mining Income History (${miningIncomes.length} records) ===`);
  miningIncomes.forEach(mi => {
    console.log({
      amount: mi.amount,
      percentage: mi.percentage,
      createdAt: mi.createdAt
    });
  });

  process.exit();
}).catch(err => {
  console.error(err);
  process.exit(1);
});
