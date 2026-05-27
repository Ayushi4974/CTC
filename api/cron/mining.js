const connectDB = require('../../server/config/db');
const { runMiningCronCycle } = require('../../server/cron/miningCron');

module.exports = async (req, res) => {
  try {
    console.log('VERCEL CRON STARTED');

    await connectDB();

    const result = await runMiningCronCycle(false);

    return res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    console.error('VERCEL CRON ERROR:', error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
