const connectDB = require('../../server/config/db');
const { runMiningCronCycle } = require('../../server/cron/miningCron');

module.exports = async (req, res) => {
  console.log('============================================');
  console.log('[VERCEL CRON] ✅ CRON JOB IS RUNNING');
  console.log(`[VERCEL CRON] Triggered at: ${new Date().toUTCString()}`);
  console.log('============================================');

  try {
    await connectDB();
    console.log('[VERCEL CRON] MongoDB connected');

    const result = await runMiningCronCycle(false);

    if (result.success) {
      console.log('============================================');
      console.log('[VERCEL CRON] ✅ CRON JOB FINISHED SUCCESSFULLY');
      console.log(`[VERCEL CRON] Completed at: ${new Date().toUTCString()}`);
      console.log('============================================');
      return res.status(200).json({ success: true, result });

    } else {
      // Cron ran but was skipped (weekend, locked, already done)
      console.warn('============================================');
      console.warn(`[VERCEL CRON] ⚠️ CRON JOB SKIPPED — Reason: ${result.reason}`);
      console.warn(`[VERCEL CRON] Time: ${new Date().toUTCString()}`);
      console.warn('============================================');
      return res.status(200).json({ success: false, result });
    }

  } catch (error) {
    console.error('============================================');
    console.error('[VERCEL CRON] ❌ CRON JOB ERROR — FAILED TO RUN');
    console.error(`[VERCEL CRON] Error: ${error.message}`);
    console.error(`[VERCEL CRON] Time: ${new Date().toUTCString()}`);
    console.error('============================================');
    return res.status(500).json({ success: false, error: error.message });
  }
};
