const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./models/User');
const Transaction = require('./models/Transaction');

const rankBonusMap = {
  'L1': 100, 'L2': 300, 'L3': 800, 'L4': 2000, 'L5': 5000, 'L6': 12000,
  'L7': 25000, 'L8': 100000, 'L9': 200000, 'L10': 500000, 'L11': 1000000, 'L12': 2000000
};

const reverseBonusMap = {
  100: 'L1', 300: 'L2', 800: 'L3', 2000: 'L4', 5000: 'L5', 12000: 'L6',
  25000: 'L7', 100000: 'L8', 200000: 'L9', 500000: 'L10', 1000000: 'L11', 2000000: 'L12'
};

const getTeamCount = async (userId) => {
  let count = 0;
  const directs = await User.find({ sponsor: userId, isActive: true });
  for (let dir of directs) {
    count += 1 + await getTeamCount(dir._id);
  }
  return count;
};

const getLegCounts = async (userId) => {
  const directs = await User.find({ sponsor: userId, isActive: true });
  const legCounts = [];
  for (let dir of directs) {
    const legCount = 1 + await getTeamCount(dir._id);
    legCounts.push({ id: dir._id, rank: dir.rank, count: legCount });
  }
  return legCounts;
};

async function backfill() {
  console.log('Connecting to database...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected successfully!');

  try {
    console.log('Starting fixed-point rank stabilization pass...');
    let anyRankChanged = true;
    let iteration = 1;

    // Phase 1: Stabilize ranks iteratively
    while (anyRankChanged) {
      console.log(`Iteration ${iteration}...`);
      anyRankChanged = false;
      const allUsers = await User.find({});

      for (let user of allUsers) {
        let newRank = 'None';

        // Only users with active state and >= 300 investment are eligible for L1-L12
        if (user.isActive && user.totalInvestment >= 300) {
          const legCounts = await getLegCounts(user._id);
          const totalTeam = legCounts.reduce((acc, leg) => acc + leg.count, 0);

          let strongLegCount = 0;
          let otherLegsCount = 0;
          if (legCounts.length > 0) {
            const sortedLegs = legCounts.sort((a, b) => b.count - a.count);
            strongLegCount = sortedLegs[0].count;
            otherLegsCount = totalTeam - strongLegCount;
          }

          if (legCounts.length >= 5) newRank = 'L1';

          const countDirectsWithRank = (rankPrefix) => 
            legCounts.filter(leg => leg.rank.startsWith(rankPrefix) || leg.rank === rankPrefix).length;

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
        if (newRank !== oldRank) {
          console.log(`Rank update detected for User ${user.userId}: ${oldRank} -> ${newRank}`);
          user.rank = newRank;
          await user.save();
          anyRankChanged = true;
        }
      }
      iteration++;
      if (iteration > 30) {
        console.warn('Reached maximum iteration guard. Terminating rank stabilization.');
        break;
      }
    }

    console.log('Ranks stabilized. Starting bonus backfill and claimedRankBonuses synchronization...');
    
    const allUsers = await User.find({});
    let totalCredited = 0;
    let usersUpdated = 0;

    for (let user of allUsers) {
      const userRank = user.rank || 'None';
      
      // Initialize if needed
      if (!user.claimedRankBonuses) {
        user.claimedRankBonuses = [];
      }

      // Find all successful or approved bonus transactions for this user
      const existingSuccessTx = await Transaction.find({
        userId: user.userId,
        type: 'bonus',
        status: 'success'
      });

      // Synchronize claimed list with existing bonus transactions
      const prevClaimedSet = new Set(user.claimedRankBonuses);
      for (let tx of existingSuccessTx) {
        const matchingRank = reverseBonusMap[tx.amount];
        if (matchingRank) {
          prevClaimedSet.add(matchingRank);
        }
      }
      user.claimedRankBonuses = Array.from(prevClaimedSet);

      let updated = false;

      // If user is qualified for a rank, check and award missing bonuses sequentially
      if (userRank !== 'None') {
        const ranksOrder = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11', 'L12'];
        const targetRankIndex = ranksOrder.indexOf(userRank);

        if (targetRankIndex !== -1) {
          for (let i = 0; i <= targetRankIndex; i++) {
            const rankToAward = ranksOrder[i];
            
            if (!user.claimedRankBonuses.includes(rankToAward)) {
              // Missed bonus detected! Let's award it.
              const rankBonusAmount = rankBonusMap[rankToAward];
              if (rankBonusAmount) {
                console.log(`Awarding missed ${rankToAward} bonus of $${rankBonusAmount} to User ${user.userId} (Current Rank: ${userRank})`);
                
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
                totalCredited += rankBonusAmount;
                updated = true;
              }
            }
          }
        }
      }

      // Save user record if we modified anything
      if (updated || prevClaimedSet.size !== user.claimedRankBonuses.length) {
        await user.save();
        usersUpdated++;
      }
    }

    console.log(`Backfill successfully finished.`);
    console.log(`Total users corrected / synced: ${usersUpdated}`);
    console.log(`Total promotional bonus funds distributed: $${totalCredited}`);

  } catch (error) {
    console.error('Error during backfill:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
  }
}

backfill();
