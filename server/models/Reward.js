const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rewardType: { type: String, required: true }, // e.g. BMW
  level: { type: String, required: true }, // e.g. L7
  achievedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'delivered'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('Reward', rewardSchema);
