require('dotenv').config();
const mongoose = require('mongoose');
const Package = require('./models/Package');

const packages = [
  {
    name: 'Package',
    minAmount: 100,
    maxAmount: 500,
    dailyProfit: 0.5, // 0.25% every 12 hours => 0.5% daily
    validity: 36500, // Lifetime
    isReferralOnly: false,
    isZeroPin: true,
    status: true
  },
  {
    name: 'Package 1',
    minAmount: 100,
    maxAmount: 1000,
    dailyProfit: 1.0, // 0.5% every 12 hours => 1.0% daily
    validity: 36500, // Lifetime (approx 100 years)
    isReferralOnly: false,
    status: true
  },
  {
    name: 'Package 2',
    minAmount: 1500,
    maxAmount: 5000,
    dailyProfit: 1.2, // 0.6% every 12 hours => 1.2% daily
    validity: 36500, // Lifetime (approx 100 years)
    isReferralOnly: false,
    status: true
  },
  {
    name: 'Package 3',
    minAmount: 10000,
    maxAmount: 25000,
    dailyProfit: 1.4, // 0.7% every 12 hours => 1.4% daily
    validity: 36500, // Lifetime (approx 100 years)
    isReferralOnly: false,
    status: true
  },
  {
    name: 'Package 4',
    minAmount: 50000,
    maxAmount: 50000,
    dailyProfit: 1.6, // 0.8% every 12 hours => 1.6% daily
    validity: 36500, // Lifetime (approx 100 years)
    isReferralOnly: false,
    status: true
  },
  {
    name: 'Referral Package',
    minAmount: 20,
    maxAmount: 20,
    dailyProfit: 0.5, // 0.25% every 12 hours => 0.5% daily
    validity: 365, // 365 Days
    isReferralOnly: true,
    status: true
  }
];

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ctc').then(async () => {
  console.log('Connected to MongoDB.');
  
  // Clear all existing packages first
  await Package.deleteMany({});
  console.log('Deleted all existing packages from database.');
  
  for (const pkgData of packages) {
    const updatedPkg = await Package.findOneAndUpdate(
      { name: pkgData.name },
      { $set: pkgData },
      { new: true, upsert: true }
    );
    console.log(`Package "${updatedPkg.name}" upserted successfully: min=${updatedPkg.minAmount}, max=${updatedPkg.maxAmount}, dailyProfit=${updatedPkg.dailyProfit}%, validity=${updatedPkg.validity} days`);
  }
  
  console.log('Seeding complete.');
  process.exit(0);
}).catch(err => {
  console.error('Error seeding packages:', err);
  process.exit(1);
});
