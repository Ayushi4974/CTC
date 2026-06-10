const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const users = await User.find({ promotionalIncome: { $lt: 0 } });
  console.log(`Found ${users.length} users with negative promotionalIncome:`);
  users.forEach(u => {
    console.log(`  User: userId=${u.userId}, name=${u.fullName}, email=${u.email}, promotionalIncome=${u.promotionalIncome}`);
  });
  process.exit();
}).catch(err => {
  console.error(err);
  process.exit(1);
});
