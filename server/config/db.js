const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    isConnected = conn.connections[0].readyState === 1;
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Auto-update SystemSettings to ensure manualWithdrawalApproval is true by default
    const SystemSettings = require('../models/SystemSettings');
    const settings = await SystemSettings.findOne();
    if (settings) {
      if (settings.manualWithdrawalApproval === undefined || settings.manualWithdrawalApproval === false) {
        settings.manualWithdrawalApproval = true;
        await settings.save();
        console.log('SystemSettings updated: manualWithdrawalApproval set to true');
      }
    } else {
      await SystemSettings.create({ manualWithdrawalApproval: true });
      console.log('SystemSettings created with manualWithdrawalApproval: true');
    }

    // Auto-backfill compoundingBalance for UserPackage if undefined
    const UserPackage = require('../models/UserPackage');
    const missingCompoundingPkgs = await UserPackage.find({ compoundingBalance: { $exists: false } });
    if (missingCompoundingPkgs.length > 0) {
      console.log(`[DB] Found ${missingCompoundingPkgs.length} packages with missing compoundingBalance. Backfilling...`);
      for (let p of missingCompoundingPkgs) {
        p.compoundingBalance = p.amount;
        await p.save();
      }
      console.log('[DB] Compounding balance backfill complete.');
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
