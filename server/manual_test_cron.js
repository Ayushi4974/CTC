require('dotenv').config();
const mongoose = require('mongoose');
const { runMiningCronCycle } = require('./cron/miningCron');

const runManualCron = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected!');

    console.log('Starting manual trigger of Mining Cron...');
    // Passing true as the argument forces the cron to run, bypassing scheduled hour and weekend checks
    const result = await runMiningCronCycle(true);
    console.log('Execution Result:', result);

    console.log('Disconnecting from database...');
    await mongoose.disconnect();
    console.log('Disconnected! Manual test completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error during manual cron execution:', error);
    process.exit(1);
  }
};

runManualCron();
