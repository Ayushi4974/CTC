const SystemSettings = require('../models/SystemSettings');
const AuditLog = require('../models/AuditLog');

const checkTreasuryHealth = async () => {
  try {
    const settings = await SystemSettings.findOne() || await SystemSettings.create({});
    
    // Dynamic Mode checks
    if (settings.treasuryReserves < settings.emergencyThreshold) {
      if (!settings.treasuryProtectionMode) {
        settings.treasuryProtectionMode = true;
        settings.globalRoiMultiplier = 0.5; // reduce ROI to 50%
        settings.withdrawalFreeze = true; // freeze withdrawals temporarily
        
        await settings.save();
        
        await AuditLog.create({
          action: 'TREASURY_MODE_CHANGE',
          details: { 
            reason: 'Reserves fell below emergency threshold', 
            reserves: settings.treasuryReserves,
            threshold: settings.emergencyThreshold
          }
        });
      }
    } else {
       if (settings.treasuryProtectionMode) {
         // Auto-recover (or this can be left to admin only)
         settings.treasuryProtectionMode = false;
         settings.globalRoiMultiplier = 1.0;
         settings.withdrawalFreeze = false;
         
         await settings.save();
         
         await AuditLog.create({
            action: 'TREASURY_MODE_CHANGE',
            details: { 
              reason: 'Reserves recovered above emergency threshold', 
              reserves: settings.treasuryReserves,
              threshold: settings.emergencyThreshold
            }
          });
       }
    }
    
    return settings;
  } catch (error) {
    console.error('Treasury health check failed', error);
  }
};

module.exports = {
  checkTreasuryHealth
};
