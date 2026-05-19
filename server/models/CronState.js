const mongoose = require('mongoose');

const cronStateSchema = new mongoose.Schema({
  cronName: { type: String, required: true, unique: true },
  isRunning: { type: Boolean, default: false },
  lastRunAt: { type: Date },
  lastCycleId: { type: String }, // To prevent replay of the same cycle
  errorLog: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('CronState', cronStateSchema);
