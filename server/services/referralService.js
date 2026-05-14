const User = require('../models/User');
const ReferralIncome = require('../models/ReferralIncome');

const distributeDirectReferral = async (sponsorId, packageAmount, fromUserId, fromUserObjId) => {
  try {
    const sponsor = await User.findById(sponsorId);
    if (!sponsor || !sponsor.isActive) return;

    const percentage = 15;
    const income = (packageAmount * percentage) / 100;

    await ReferralIncome.create({
      userId: sponsor.userId,
      user: sponsor._id,
      fromUser: fromUserObjId,
      fromUserId: fromUserId,
      packageAmount,
      percentage,
      income,
      level: 1
    });

    sponsor.referralIncome += income;
    sponsor.totalEarning += income;
    sponsor.availableBalance += income;
    await sponsor.save();

  } catch (error) {
    console.error('Referral distribution error:', error);
  }
};

module.exports = { distributeDirectReferral };
