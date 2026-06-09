const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['deposit', 'withdrawal', 'bonus', 'salary', 'release'], required: true },
  amount: { type: Number, required: true },
  txHash: { type: String },
  blockchain: { type: String, default: 'BEP20' },
  chainId: { type: String, default: '56' },
  tokenContract: { type: String },
  blockNumber: { type: Number },
  confirmationCount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  walletAddress: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
