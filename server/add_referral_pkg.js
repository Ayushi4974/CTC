require('dotenv').config();
const mongoose = require('mongoose');
const Package = require('./models/Package');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Connected to DB');

  const existing = await Package.findOne({ name: 'Referral Package' });
  if (existing) {
    console.log('Referral package already exists!');
    process.exit(0);
  }

  const pkg = new Package({
    name: 'Referral Package',
    minAmount: 20,
    maxAmount: 20,
    dailyProfit: 0.5,
    validity: 36500, // practically unlimited
    isReferralOnly: true,
    status: true
  });

  await pkg.save();
  console.log('Referral package added successfully!');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
