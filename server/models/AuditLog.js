const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { 
    type: String, 
    required: true,
    enum: [
      'ROI_GENERATION', 
      'LEVEL_INCOME', 
      'WITHDRAWAL', 
      'PACKAGE_ACTIVATION', 
      'CAP_COMPLETED', 
      'TREASURY_MODE_CHANGE', 
      'ADMIN_ACTION', 
      'PAYOUT_FAILURE',
      'EMERGENCY_ALERT'
    ]
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserPackage' },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // If initiated by admin
  amount: { type: Number, default: 0 },
  details: { type: Object, default: {} },
  status: { type: String, enum: ['success', 'failed', 'pending'], default: 'success' },
  ipAddress: { type: String }
}, { timestamps: true });

// Index for fast searching
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
