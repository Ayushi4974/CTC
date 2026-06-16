const mongoose = require('mongoose');
const Withdrawal = require('./models/Withdrawal');
require('dotenv').config({ path: './.env' });

const TARGET_ID = '6a2fe479dbd8367f1a0f2178';

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Connected to MongoDB');

  // Pehle existing record dekho
  const before = await Withdrawal.findById(TARGET_ID);
  if (!before) {
    console.error(`❌ Withdrawal ID ${TARGET_ID} not found`);
    process.exit(1);
  }

  console.log('\n📋 BEFORE:');
  console.log(`  amount      : ${before.amount}`);
  console.log(`  deduction   : ${before.deduction}`);
  console.log(`  finalAmount : ${before.finalAmount}`);
  console.log(`  status      : ${before.status}`);
  console.log(`  userId      : ${before.userId}`);

  // Update karo
  const result = await Withdrawal.updateOne(
    { _id: new mongoose.Types.ObjectId(TARGET_ID) },
    {
      $set: {
        amount: 141.13,
        deduction: 14.113,
        finalAmount: 127.017
      }
    }
  );

  if (result.modifiedCount === 0) {
    console.warn('⚠️  No document was modified (values may already be correct)');
    process.exit(0);
  }

  // Verify karo
  const after = await Withdrawal.findById(TARGET_ID);
  console.log('\n✅ AFTER:');
  console.log(`  amount      : ${after.amount}`);
  console.log(`  deduction   : ${after.deduction}`);
  console.log(`  finalAmount : ${after.finalAmount}`);

  console.log('\n🎉 Withdrawal record successfully updated!');
  process.exit(0);
}).catch(err => {
  console.error('DB connection error:', err);
  process.exit(1);
});
