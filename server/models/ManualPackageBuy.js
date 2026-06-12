const mongoose = require('mongoose');

const manualPackageBuySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
  amount: { type: Number, required: true },
  networkType: { type: String, enum: ['Bep20', 'TRC 20'], required: true },
  txHash: { type: String, required: true },
  senderAddress: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectedAt: { type: Date },
  rejectionReason: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('ManualPackageBuy', manualPackageBuySchema);
