const cron = require('node-cron');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const getTeamCount = async (userId) => {
  let count = 0;
  const directs = await User.find({ sponsor: userId, isActive: true, pins: { $gt: 0 } });
  for (let dir of directs) {
    count += 1 + await getTeamCount(dir._id);
  }
  return count;
};

const getLegCounts = async (userId) => {
  const directs = await User.find({ sponsor: userId, isActive: true, pins: { $gt: 0 } });
  const legCounts = [];
  for (let dir of directs) {
    const legCount = 1 + await getTeamCount(dir._id);
    legCounts.push({ id: dir._id, rank: dir.rank, count: legCount });
  }
  return legCounts;
};

const salaryMap = {
  'L1': 30, 'L2': 150, 'L3': 500, 'L4': 1200, 'L5': 2400, 'L6': 5000,
  'L7': 10000, 'L8': 60000, 'L9': 100000, 'L10': 300000, 'L11': 600000, 'L12': 1000000
};

const rankBonusMap = {
  'L1': 100, 'L2': 300, 'L3': 800, 'L4': 2000, 'L5': 5000, 'L6': 12000,
  'L7': 25000, 'L8': 100000, 'L9': 200000, 'L10': 500000, 'L11': 1000000, 'L12': 2000000
};

const runSalaryCron = async () => {
  console.log('Running salary bonus cron...');
  try {
    const eligibleUsers = await User.find({ isActive: true, totalInvestment: { $gte: 300 } });

    for (let user of eligibleUsers) {
      // Enforce 4x Earning Cap before salary payout
      if (user.totalEarning >= user.totalInvestment * 4) {
        user.isActive = false;
        await user.save();
        continue;
      }

      // Evaluate Rank
      let newRank = user.rank || 'None';
      if (!user.isRankManuallySet) {
        const legCounts = await getLegCounts(user._id);
        const totalTeam = legCounts.reduce((acc, leg) => acc + leg.count, 0);

        let strongLegCount = 0;
        let otherLegsCount = 0;
        if (legCounts.length > 0) {
          const sortedLegs = legCounts.sort((a, b) => b.count - a.count);
          strongLegCount = sortedLegs[0].count;
          otherLegsCount = totalTeam - strongLegCount;
        }

        // Determine rank based on conditions
        // L1: 5 Directs
        newRank = 'None';
        if (legCounts.length >= 5) newRank = 'L1';

        const countDirectsWithRank = (rankPrefix) => legCounts.filter(leg => leg.rank.startsWith(rankPrefix) || leg.rank === rankPrefix).length;

        const checkRank = (requiredDirectRank, requiredDirects, requiredTeam) => {
          const requiredStrong = requiredTeam * 0.30;
          const requiredOther = requiredTeam * 0.70;
          const hasDirects = countDirectsWithRank(requiredDirectRank) >= requiredDirects;
          const hasTeam = strongLegCount >= requiredStrong && otherLegsCount >= requiredOther && totalTeam >= requiredTeam;
          return hasDirects && hasTeam;
        };

        if (checkRank('L1', 2, 25)) newRank = 'L2';
        if (checkRank('L1', 3, 125)) newRank = 'L3';
        if (checkRank('L1', 4, 500)) newRank = 'L4';
        if (checkRank('L1', 5, 1000)) newRank = 'L5';
        if (checkRank('L1', 6, 2000)) newRank = 'L6';
        if (checkRank('L1', 7, 5000)) newRank = 'L7';
        if (checkRank('L7', 3, 20000)) newRank = 'L8';
        if (checkRank('L7', 4, 50000)) newRank = 'L9';
        if (checkRank('L8', 3, 100000)) newRank = 'L10';
        if (checkRank('L8', 4, 200000)) newRank = 'L11';
        if (checkRank('L9', 5, 300000)) newRank = 'L12';
      }

      const oldRank = user.rank || 'None';
      
      // Handle One-Time Promotional Bonus for reaching a new rank (and any missed intermediate ranks)
      const ranksOrder = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11', 'L12'];
      if (newRank !== 'None') {
        const targetRankIndex = ranksOrder.indexOf(newRank);
        if (targetRankIndex !== -1) {
          for (let i = 0; i <= targetRankIndex; i++) {
            const rankToAward = ranksOrder[i];
            if (!user.claimedRankBonuses) {
              user.claimedRankBonuses = [];
            }
            if (!user.claimedRankBonuses.includes(rankToAward)) {
              const rankBonusAmount = rankBonusMap[rankToAward];
              if (rankBonusAmount) {
                user.availableBalance += rankBonusAmount;
                user.totalEarning += rankBonusAmount;
                user.promotionalIncome += rankBonusAmount;

                await Transaction.create({
                  userId: user.userId,
                  user: user._id,
                  type: 'bonus',
                  amount: rankBonusAmount,
                  status: 'success'
                });

                user.claimedRankBonuses.push(rankToAward);
              }
            }
          }
        }
      }

      user.rank = newRank;

      if (salaryMap[newRank]) {
        // Paid 2 times a month, so half salary
        const salaryPayout = salaryMap[newRank] / 2;
        user.availableBalance += salaryPayout;
        user.totalEarning += salaryPayout;
        user.promotionalIncome += salaryPayout;
        await user.save();

        await Transaction.create({
          userId: user.userId,
          user: user._id,
          type: 'salary',
          amount: salaryPayout,
          status: 'success'
        });
      } else {
        await user.save();
      }
    }
    console.log('Salary cron finished successfully.');
    return { success: true };
  } catch (error) {
    console.error('Error in salary cron:', error);
    return { success: false, error: error.message };
  }
};

cron.schedule("0 0 15,28 * *", async () => {
  await runSalaryCron();
});

module.exports = { runSalaryCron };
