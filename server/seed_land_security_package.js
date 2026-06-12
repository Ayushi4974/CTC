require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const Package = require('./models/Package');

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('Error: MONGO_URI or MONGODB_URI is not defined in environment variables.');
  process.exit(1);
}

mongoose.connect(mongoUri).then(async () => {
  console.log('Connected to DB');

  const existing = await Package.findOne({ name: 'Land Security Package' });
  if (existing) {
    console.log('Land Security Package already exists! Updating parameters...');
    existing.minAmount = 5000;
    existing.maxAmount = 50000;
    existing.dailyProfit = 0.5;
    existing.validity = 365;
    existing.status = true;
    await existing.save();
    console.log('Land Security Package updated successfully!');
    process.exit(0);
  }

  const pkg = new Package({
    name: 'Land Security Package',
    minAmount: 5000,
    maxAmount: 50000,
    dailyProfit: 0.5,
    validity: 365,
    isReferralOnly: false,
    isZeroPin: false,
    status: true
  });

  await pkg.save();
  console.log('Land Security Package added successfully!');
  process.exit(0);
}).catch(err => {
  console.error('Database connection error:', err);
  process.exit(1);
});
