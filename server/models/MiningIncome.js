const mongoose = require('mongoose');

const miningIncomeSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
  userPackageId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserPackage' },
  amount: { type: Number, required: true },
  percentage: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, default: 'credited' }
}, { timestamps: true });

module.exports = mongoose.model('MiningIncome', miningIncomeSchema);
