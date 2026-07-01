const cron = require('node-cron');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const getTeamBusiness = async (userId) => {
  let teamSum = 0;
  const directs = await User.find({ sponsor: userId, isActive: true, pins: { $gt: 0 } });
  for (let dir of directs) {
    teamSum += (dir.totalInvestment || 0) + await getTeamBusiness(dir._id);
  }
  return teamSum;
};

const getLegBusinesses = async (userId) => {
  const directs = await User.find({ sponsor: userId, isActive: true, pins: { $gt: 0 } });
  const legBusinesses = [];
  for (let dir of directs) {
    const legBusiness = (dir.totalInvestment || 0) + await getTeamBusiness(dir._id);
    legBusinesses.push({ id: dir._id, business: legBusiness });
  }
  return legBusinesses;
};

const salaryMap = {
  'L1': 60, 'L2': 300, 'L3': 1000, 'L4': 2400, 'L5': 4800, 'L6': 10000,
  'L7': 20000, 'L8': 35000, 'L9': 50000, 'L10': 100000, 'L11': 200000, 'L12': 500000
};

const rankBonusMap = {
  'L1': 100, 'L2': 300, 'L3': 800, 'L4': 2000, 'L5': 5000, 'L6': 10000,
  'L7': 15000, 'L8': 25000, 'L9': 50000, 'L10': 100000, 'L11': 200000, 'L12': 500000
};

const runSalaryCron = async () => {
  console.log('Running salary bonus cron...');
  try {
    const eligibleUsers = await User.find({ isActive: true, totalInvestment: { $gte: 300 } });
    const capped = [];
    const pendingBonuses = [];

    for (let user of eligibleUsers) {
      // Enforce 4x Earning Cap before processing
      if (user.totalEarning >= user.totalInvestment * 4) {
        user.isActive = false;
        await user.save();
        console.log(`[CAP] User ID: ${user.userId} (${user.fullName}) deactivated due to 4x earning cap (Earned: $${user.totalEarning}, Invested: $${user.totalInvestment})`);
        capped.push({ userId: user.userId, fullName: user.fullName, totalEarning: user.totalEarning, totalInvestment: user.totalInvestment });
        continue;
      }

      // Evaluate Rank
      let newRank = user.rank || 'None';
      if (!user.isRankManuallySet) {
        const directs = await User.find({ sponsor: user._id, isActive: true, pins: { $gt: 0 } });
        const directBusiness = directs.reduce((sum, u) => sum + (u.totalInvestment || 0), 0);

        const legBusinesses = await getLegBusinesses(user._id);
        const totalTeamBusiness = legBusinesses.reduce((acc, leg) => acc + leg.business, 0);

        let strongLegBusiness = 0;
        let otherLegsBusiness = 0;
        if (legBusinesses.length > 0) {
          const sortedLegs = legBusinesses.sort((a, b) => b.business - a.business);
          strongLegBusiness = sortedLegs[0].business;
          otherLegsBusiness = totalTeamBusiness - strongLegBusiness;
        }

        // Determine rank based on business volume conditions
        newRank = 'None';
        if (directBusiness >= 1500) newRank = 'L1';

        const checkRank = (requiredTeamBusiness) => {
          const requiredStrong = requiredTeamBusiness * 0.30;
          const requiredOther = requiredTeamBusiness * 0.70;
          return strongLegBusiness >= requiredStrong && otherLegsBusiness >= requiredOther && totalTeamBusiness >= requiredTeamBusiness;
        };

        if (checkRank(5000)) newRank = 'L2';
        if (checkRank(15000)) newRank = 'L3';
        if (checkRank(52500)) newRank = 'L4';
        if (checkRank(105000)) newRank = 'L5';
        if (checkRank(180000)) newRank = 'L6';
        if (checkRank(600000)) newRank = 'L7';
        if (checkRank(1500000)) newRank = 'L8';
        if (checkRank(3600000)) newRank = 'L9';
        if (checkRank(15000000)) newRank = 'L10';
        if (checkRank(30000000)) newRank = 'L11';
        if (checkRank(60000000)) newRank = 'L12';
      }

      const oldRank = user.rank || 'None';
      
      // Handle One-Time Promotional Bonus additions for reaching a new rank (added to unclaimedRankBonuses)
      const ranksOrder = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11', 'L12'];
      if (newRank !== 'None') {
        const targetRankIndex = ranksOrder.indexOf(newRank);
        if (targetRankIndex !== -1) {
          let updated = false;
          for (let i = 0; i <= targetRankIndex; i++) {
            const rankToAward = ranksOrder[i];
            if (!user.claimedRankBonuses) {
              user.claimedRankBonuses = [];
            }
            if (!user.unclaimedRankBonuses) {
              user.unclaimedRankBonuses = [];
            }
            if (!user.claimedRankBonuses.includes(rankToAward) && !user.unclaimedRankBonuses.includes(rankToAward)) {
              user.unclaimedRankBonuses.push(rankToAward);
              updated = true;
              console.log(`[BONUS QUALIFIED] User ID: ${user.userId} (${user.fullName}) qualified for Rank ${rankToAward} bonus. Added to unclaimed.`);
              pendingBonuses.push({ userId: user.userId, fullName: user.fullName, rank: rankToAward });
            }
          }
          if (updated || user.rank !== newRank) {
            user.rank = newRank;
            // Also initialize/update baseline when they rank up
            user.lastSalaryTeamBusiness = await getTeamBusiness(user._id);
            await user.save();
          }
        }
      } else {
        if (user.rank !== newRank) {
          user.rank = newRank;
          await user.save();
        }
      }
    }
    console.log('Salary cron finished successfully.');
    return {
      success: true,
      capped,
      pendingBonuses
    };
  } catch (error) {
    console.error('Error in salary cron:', error);
    return { success: false, error: error.message };
  }
};

// Check 7th Salary Qualification on 6th of the month
const check7thSalaryQualification = async () => {
  console.log('Running 7th salary qualification check...');
  try {
    const eligibleUsers = await User.find({ isActive: true, totalInvestment: { $gte: 300 } });
    for (let user of eligibleUsers) {
      if (!user.rank || user.rank === 'None') continue;

      const teamBusiness = await getTeamBusiness(user._id);
      const baseline = user.lastSalaryTeamBusiness || 0;
      
      // Qualify if team business increased by 10% or more.
      // If baseline is 0, any teamBusiness > 0 is considered an increase of 10%+.
      const isQualified = teamBusiness > 0 && (baseline === 0 || teamBusiness >= baseline * 1.10);
      
      if (isQualified) {
        user.qualifiedFor7thSalary = true;
        await user.save();
        console.log(`[QUALIFY 7TH] User ID: ${user.userId} qualified for 7th salary. Current team business: $${teamBusiness}, baseline: $${baseline}`);
      }
    }
    console.log('7th salary qualification check finished.');
  } catch (error) {
    console.error('Error in 7th salary qualification check:', error);
  }
};

// Pay 7th Salary on 7th of the month
const pay7thSalary = async () => {
  console.log('Running 7th salary payout...');
  try {
    const qualifiedUsers = await User.find({ qualifiedFor7thSalary: true, isActive: true });
    for (let user of qualifiedUsers) {
      if (!user.rank || user.rank === 'None') {
        user.qualifiedFor7thSalary = false;
        await user.save();
        continue;
      }

      // Check 4x Earning Cap before payout
      if (user.totalEarning >= user.totalInvestment * 4) {
        user.isActive = false;
        user.qualifiedFor7thSalary = false;
        await user.save();
        console.log(`[CAP] User ID: ${user.userId} deactivated due to 4x cap before 7th salary payout.`);
        continue;
      }

      const salaryPayout = salaryMap[user.rank];
      if (salaryPayout) {
        user.availableBalance += salaryPayout;
        user.totalEarning += salaryPayout;
        user.promotionalIncome += salaryPayout;
        user.lastSalaryTeamBusiness = await getTeamBusiness(user._id);
        user.qualifiedFor7thSalary = false; // Reset qualification flag
        await user.save();

        await Transaction.create({
          userId: user.userId,
          user: user._id,
          type: 'salary',
          amount: salaryPayout,
          status: 'success'
        });
        console.log(`[SALARY 7TH] User ID: ${user.userId} paid 7th salary for Rank ${user.rank}: $${salaryPayout}`);
      } else {
        user.qualifiedFor7thSalary = false;
        await user.save();
      }
    }
    console.log('7th salary payout finished.');
  } catch (error) {
    console.error('Error in 7th salary payout:', error);
  }
};

// Schedule Cron Jobs
// Run Rank Evaluation daily at midnight
cron.schedule("0 0 * * *", async () => {
  await runSalaryCron();
});

// Run 7th salary qualification check on 6th of the month at midnight
cron.schedule("0 0 6 * *", async () => {
  await check7thSalaryQualification();
});

// Run 7th salary payout on 7th of the month at midnight
cron.schedule("0 0 7 * *", async () => {
  await pay7thSalary();
});

module.exports = {
  runSalaryCron,
  check7thSalaryQualification,
  pay7thSalary,
  salaryMap,
  rankBonusMap,
  getTeamBusiness
};
