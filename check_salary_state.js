const mongoose = require('mongoose');
const User = require('./server/models/User');
const Transaction = require('./server/models/Transaction');
const Withdrawal = require('./server/models/Withdrawal');
require('dotenv').config({path: './server/.env'});

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const userIds = ['CTC11893', 'CTC33482'];
  
  for (const userId of userIds) {
    console.log(`\n=================== USER: ${userId} ===================`);
    const user = await User.findOne({ userId });
    if (!user) {
      console.log(`User ${userId} not found`);
      continue;
    }
    
    console.log('User details:');
    console.log({
      _id: user._id,
      userId: user.userId,
      availableBalance: user.availableBalance,
      totalEarning: user.totalEarning,
      promotionalIncome: user.promotionalIncome,
      salaryIncome: user.salaryIncome, // check if it exists
      levelIncome: user.levelIncome,
    });
    
    console.log('\nTransactions:');
    const txs = await Transaction.find({ user: user._id }).sort({ createdAt: -1 }).limit(10);
    txs.forEach(t => {
      console.log(`- type=${t.type}, amount=${t.amount}, status=${t.status}, remark=${t.remark}, date=${t.createdAt.toISOString()}`);
    });
    
    console.log('\nWithdrawals:');
    const withdrawals = await Withdrawal.find({ user: user._id }).sort({ createdAt: -1 }).limit(10);
    withdrawals.forEach(w => {
      console.log(`- amount=${w.amount}, netAmount=${w.netAmount}, status=${w.status}, date=${w.createdAt.toISOString()}`);
    });
  }
  
  process.exit();
}).catch(err => {
  console.error(err);
  process.exit(1);
});
