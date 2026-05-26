const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' });

const fixActiveUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find user A
    const userA = await User.findOne({ userId: 'CTC44874' });
    if (!userA) {
      console.error('User A (CTC44874) not found!');
      process.exit(1);
    }

    console.log(`Found User A: ${userA.fullName} (${userA.userId}), ID: ${userA._id}`);

    // Find direct downline users of A
    // Direct downlines have sponsorId as A's userId, or sponsor pointing to A's ObjectId
    const directs = await User.find({
      $or: [
        { sponsorId: userA.userId },
        { sponsor: userA._id }
      ]
    });

    console.log(`Total direct downline users found: ${directs.length}`);
    directs.forEach((d, idx) => {
      console.log(`${idx + 1}. User ID: ${d.userId}, Name: ${d.fullName}, isActive: ${d.isActive}`);
    });

    if (directs.length < 5) {
      console.warn('Warning: Less than 5 direct downline users found! Creating dummy direct downline users for A...');
      
      // Let's create dummy users if there are not enough directs
      const dummyCount = 5 - directs.length;
      for (let i = 1; i <= dummyCount; i++) {
        const dummyId = `CTC_DUMMY_${Date.now()}_${i}`;
        const newUser = await User.create({
          userId: dummyId,
          fullName: `Dummy Referral ${i}`,
          email: `dummy_${i}_${Date.now()}@gmail.com`,
          password: 'dummy_password_hash', // placeholder
          sponsorId: userA.userId,
          sponsor: userA._id,
          isActive: true
        });
        console.log(`Created new dummy user: ${newUser.fullName} (${newUser.userId}) with isActive: true`);
      }
    } else {
      // Set at least 5 of the existing direct downline users to isActive: true
      const countToActivate = Math.min(directs.length, 5);
      console.log(`Activating ${countToActivate} direct downline users...`);
      for (let i = 0; i < countToActivate; i++) {
        const direct = directs[i];
        direct.isActive = true;
        await direct.save();
        console.log(`Activated user: ${direct.fullName} (${direct.userId}), isActive set to true`);
      }
    }

    // Double check the count of active direct downlines
    const activeDirectsCount = await User.countDocuments({
      $or: [
        { sponsorId: userA.userId },
        { sponsor: userA._id }
      ],
      isActive: true
    });
    console.log(`Verification: Total active direct downline users of A: ${activeDirectsCount}`);

    process.exit(0);
  } catch (error) {
    console.error('Error fixing active users:', error);
    process.exit(1);
  }
};

fixActiveUsers();
