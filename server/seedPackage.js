require('dotenv').config();
const mongoose = require('mongoose');
const Package = require('./models/Package');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ctc').then(async () => {
  const existing = await Package.findOne({ name: 'Referral Package' });
  if (!existing) {
    await Package.create({
      name: 'Referral Package',
      minAmount: 20,
      maxAmount: 20,
      dailyProfit: 0.5,
      validity: 365,
      isReferralOnly: true,
      status: true
    });
    console.log('Referral Package created!');
  } else {
    console.log('Referral Package already exists.');
  }
  process.exit();
});
