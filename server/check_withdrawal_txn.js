const mongoose = require('mongoose');
const Withdrawal = require('./models/Withdrawal');
const Transaction = require('./models/Transaction');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Connected to MongoDB\n');

  // === Withdrawals collection ===
  console.log('=== WITHDRAWALS collection (CTC11893) ===');
  const withdrawals = await Withdrawal.find({ userId: 'CTC11893' }).sort({ createdAt: -1 });
  withdrawals.forEach(w => {
    console.log(`  _id: ${w._id}`);
    console.log(`  amount: ${w.amount} | deduction: ${w.deduction} | finalAmount: ${w.finalAmount}`);
    console.log(`  status: ${w.status} | createdAt: ${w.createdAt?.toISOString()}`);
    console.log('  ---');
  });

  // === Transactions collection ===
  console.log('\n=== TRANSACTIONS collection (CTC11893, type=withdrawal) ===');
  const txns = await Transaction.find({ userId: 'CTC11893', type: 'withdrawal' }).sort({ createdAt: -1 });
  txns.forEach(t => {
    console.log(`  _id: ${t._id}`);
    console.log(`  amount: ${t.amount} | status: ${t.status}`);
    console.log(`  txHash: ${t.txHash}`);
    console.log(`  createdAt: ${t.createdAt?.toISOString()}`);
    console.log('  ---');
  });

  process.exit(0);
}).catch(err => {
  console.error('DB error:', err.message);
  process.exit(1);
});
