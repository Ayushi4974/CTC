const mongoose = require('mongoose');
const Package = require('./server/models/Package');
const dotenv = require('dotenv');

dotenv.config({ path: './server/.env' });

const addTestingPackage = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const testingPkg = {
      name: 'Testing Package',
      description: 'Used for testing MetaMask transactions with $0.',
      minAmount: 0,
      maxAmount: 1000,
      dailyProfit: 0.1,
      validity: 365,
      status: true
    };

    const existing = await Package.findOne({ name: 'Testing Package' });
    if (existing) {
      console.log('Testing Package already exists');
    } else {
      await Package.create(testingPkg);
      console.log('Testing Package created successfully');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error adding testing package:', error);
    process.exit(1);
  }
};

addTestingPackage();
