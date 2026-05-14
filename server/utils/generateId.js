const User = require('../models/User');

const generateUniqueUserId = async () => {
  let isUnique = false;
  let newUserId = '';

  while (!isUnique) {
    // Generate a random 5 digit number
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    newUserId = `CTC${randomNum}`;

    // Check if it exists
    const existingUser = await User.findOne({ userId: newUserId });
    if (!existingUser) {
      isUnique = true;
    }
  }

  return newUserId;
};

module.exports = { generateUniqueUserId };
