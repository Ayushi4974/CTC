require('dotenv').config();
const mongoose = require('mongoose');
const Package = require('./models/Package');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ctc').then(async () => {
  console.log('Connected to MongoDB.');
  
  const allPkgs = await Package.find();
  console.log('--- ALL PACKAGES IN DB ---');
  allPkgs.forEach(p => {
    console.log(`ID: ${p._id}, Name: "${p.name}", Status: ${p.status}, Min: ${p.minAmount}, Max: ${p.maxAmount}, DailyProfit: ${p.dailyProfit}%, Referral: ${p.isReferralOnly}`);
  });
  
  // Clean up:
  // 1. Any package named "PACKAGE 4" (all caps) should be disabled or deleted, as we have seeded "Package 4"
  // 2. Any other package that doesn't match the standard ones should have status: false
  const validNames = ['Package 1', 'Package 2', 'Package 3', 'Package 4', 'Referral Package'];
  
  for (const pkg of allPkgs) {
    if (!validNames.includes(pkg.name)) {
      pkg.status = false;
      await pkg.save();
      console.log(`Disabled package: "${pkg.name}" (ID: ${pkg._id})`);
    }
  }

  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
