const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
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
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
