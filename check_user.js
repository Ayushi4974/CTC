const mongoose = require('mongoose');
const User = require('./server/models/User');
const Transaction = require('./server/models/Transaction');
require('dotenv').config({path: './server/.env'});

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const user = await User.findOne({ userId: 'CTC79536' });
  if (!user) {
    console.log('User CTC79536 not found');
    process.exit();
  }
  console.log('User Document:', JSON.stringify(user, null, 2));

  const txs = await Transaction.find({ user: user._id });
  console.log(`User has ${txs.length} transactions:`);
  txs.forEach(t => {
    console.log(`  Tx: type=${t.type}, amount=${t.amount}, status=${t.status}, date=${t.createdAt.toISOString()}`);
  });

  process.exit();
}).catch(err => {
  console.error(err);
  process.exit(1);
});
