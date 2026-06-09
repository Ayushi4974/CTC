const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const User = require('./models/User');

async function runMigration() {
  console.log('=== STARTING USER LEVEL MIGRATION ===');
  try {
    // Connect to MongoDB
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in .env');
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Fetch all users
    const allUsers = await User.find({});
    console.log(`Found ${allUsers.length} total users in database.`);

    // Map by ID for quick lookup
    const userMap = new Map();
    allUsers.forEach(user => {
      userMap.set(user._id.toString(), user);
    });

    const levelCache = new Map(); // ObjectId string -> level

    // Recursive helper to calculate level
    function calculateUserLevel(userObjIdStr, path = new Set()) {
      if (levelCache.has(userObjIdStr)) {
        return levelCache.get(userObjIdStr);
      }

      const user = userMap.get(userObjIdStr);
      if (!user || !user.sponsor) {
        levelCache.set(userObjIdStr, 0);
        return 0;
      }

      const sponsorIdStr = user.sponsor.toString();

      // Check for circular reference
      if (path.has(sponsorIdStr)) {
        console.warn(`Circular sponsoring detected! User: ${user.userId}, Path: ${Array.from(path).join(' -> ')}`);
        levelCache.set(userObjIdStr, 0);
        return 0;
      }

      // If sponsor is not in database/map, treat user as level 0
      if (!userMap.has(sponsorIdStr)) {
        levelCache.set(userObjIdStr, 0);
        return 0;
      }

      path.add(sponsorIdStr);
      const sponsorLevel = calculateUserLevel(sponsorIdStr, path);
      path.delete(sponsorIdStr);

      const computedLevel = sponsorLevel + 1;
      levelCache.set(userObjIdStr, computedLevel);
      return computedLevel;
    }

    // Calculate level for all users
    console.log('Calculating levels...');
    const bulkUpdates = [];
    const printRows = [];

    for (const user of allUsers) {
      const computedLevel = calculateUserLevel(user._id.toString());
      
      printRows.push({
        _id: user._id.toString(),
        userId: user.userId,
        fullName: user.fullName,
        sponsorId: user.sponsorId || 'None',
        oldLevel: user.level,
        newLevel: computedLevel
      });

      // Update in DB if it changed
      if (user.level !== computedLevel) {
        bulkUpdates.push({
          updateOne: {
            filter: { _id: user._id },
            update: { $set: { level: computedLevel } }
          }
        });
      }
    }

    // Perform bulk write if there are updates
    if (bulkUpdates.length > 0) {
      console.log(`Updating ${bulkUpdates.length} users with new levels...`);
      const result = await User.bulkWrite(bulkUpdates);
      console.log(`Successfully updated levels for ${result.modifiedCount} users.`);
    } else {
      console.log('No user levels needed correction.');
    }

    // Print all users and their levels
    console.log('\n=== USER LEVEL STATUS REPORT ===');
    console.table(printRows.map(row => ({
      'User ID': row.userId,
      'Full Name': row.fullName,
      'Sponsor ID': row.sponsorId,
      'Old Level': row.oldLevel,
      'New Level': row.newLevel,
      'Status': row.oldLevel === row.newLevel ? 'Correct' : 'Updated'
    })));

    console.log('\n=== MIGRATION COMPLETED SUCCESSFULLY ===');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
