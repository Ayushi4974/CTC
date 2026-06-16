const fs = require('fs');
const path = require('path');

// Read JSON data
const jsonPath = '/Users/thankiayushi/Desktop/CTC.users.json';
if (!fs.existsSync(jsonPath)) {
  console.error('JSON file not found at:', jsonPath);
  process.exit(1);
}

const rawData = fs.readFileSync(jsonPath, 'utf8');
const users = JSON.parse(rawData);

console.log(`Loaded ${users.length} users from JSON file.`);

// Build index maps for fast lookup
const userMap = {};
for (let u of users) {
  const id = u._id.$oid || u._id;
  userMap[id] = u;
}

const getDirects = (userId) => {
  return users.filter(u => {
    const sponsorId = u.sponsor ? (u.sponsor.$oid || u.sponsor) : null;
    return sponsorId === userId && u.isActive === true && u.pins > 0;
  });
};

const getTeamCount = (userId, visited = new Set()) => {
  if (visited.has(userId)) return 0;
  visited.add(userId);
  let count = 0;
  const directs = getDirects(userId);
  for (let dir of directs) {
    const dirId = dir._id.$oid || dir._id;
    count += 1 + getTeamCount(dirId, visited);
  }
  return count;
};

const getLegCounts = (userId) => {
  const directs = getDirects(userId);
  const legCounts = [];
  for (let dir of directs) {
    const dirId = dir._id.$oid || dir._id;
    const legCount = 1 + getTeamCount(dirId);
    legCounts.push({ id: dirId, rank: dir.rank || 'None', count: legCount });
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

const ranksOrder = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11', 'L12'];

// Identify eligible users: isActive: true, totalInvestment >= 300
const initialEligibleUsers = users.filter(u => u.isActive === true && u.totalInvestment >= 300);
console.log(`Found ${initialEligibleUsers.length} users who are active and have investment >= 300.`);

const cappedUsers = [];
const processedUsers = [];

for (let user of initialEligibleUsers) {
  const userIdStr = user._id.$oid || user._id;

  // Enforce 4x Earning Cap
  if (user.totalEarning >= user.totalInvestment * 4) {
    user.isActive = false; // deactivate in-memory
    cappedUsers.push({
      userId: user.userId,
      fullName: user.fullName,
      totalInvestment: user.totalInvestment,
      totalEarning: user.totalEarning
    });
    continue;
  }

  // Evaluate Rank
  let oldRank = user.rank || 'None';
  let newRank = oldRank;

  if (!user.isRankManuallySet) {
    const legCounts = getLegCounts(userIdStr);
    const totalTeam = legCounts.reduce((acc, leg) => acc + leg.count, 0);

    let strongLegCount = 0;
    let otherLegsCount = 0;
    if (legCounts.length > 0) {
      const sortedLegs = legCounts.sort((a, b) => b.count - a.count);
      strongLegCount = sortedLegs[0].count;
      otherLegsCount = totalTeam - strongLegCount;
    }

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

  // Calculate promotional bonuses claimed in this run
  const newlyClaimedBonuses = [];
  let promotionalBonusAmount = 0;

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
            promotionalBonusAmount += rankBonusAmount;
            newlyClaimedBonuses.push(rankToAward);
            user.claimedRankBonuses.push(rankToAward);
          }
        }
      }
    }
  }

  // Set the rank
  user.rank = newRank;

  // Calculate salary
  let salaryAmount = 0;
  if (salaryMap[newRank]) {
    salaryAmount = salaryMap[newRank];
  }

  processedUsers.push({
    userId: user.userId,
    fullName: user.fullName,
    oldRank,
    newRank,
    isRankManuallySet: !!user.isRankManuallySet,
    newlyClaimedBonuses,
    promotionalBonusAmount,
    salaryAmount,
    totalInvestment: user.totalInvestment,
    totalEarning: user.totalEarning
  });
}

console.log('\n--- CAPPED USERS (Excluded & Deactivated) ---');
console.log(`Total capped: ${cappedUsers.length}`);
cappedUsers.forEach(u => {
  console.log(`- ID: ${u.userId} | Name: ${u.fullName} | Invested: ${u.totalInvestment} | Earned: ${u.totalEarning} (>= 4x Cap)`);
});

console.log('\n--- ACTIVE & ELIGIBLE USERS PROCESSED ---');
console.log(`Total processed: ${processedUsers.length}`);
processedUsers.forEach(u => {
  const bonusStr = u.newlyClaimedBonuses.length > 0 ? `Bonus Ranks: ${u.newlyClaimedBonuses.join(', ')} ($${u.promotionalBonusAmount})` : 'No new Rank Bonus';
  const salaryStr = u.salaryAmount > 0 ? `Salary: $${u.salaryAmount} (Rank: ${u.newRank})` : `No Salary (Rank: ${u.newRank})`;
  console.log(`- ID: ${u.userId} | Name: ${u.fullName} | Old Rank: ${u.oldRank} | New Rank: ${u.newRank} (Manual: ${u.isRankManuallySet}) | ${salaryStr} | ${bonusStr}`);
});

console.log('\n--- SUMMARY STATISTICS ---');
const paidSalaryCount = processedUsers.filter(u => u.salaryAmount > 0).length;
const paidBonusCount = processedUsers.filter(u => u.promotionalBonusAmount > 0).length;
const totalSalaryPaid = processedUsers.reduce((sum, u) => sum + u.salaryAmount, 0);
const totalBonusPaid = processedUsers.reduce((sum, u) => sum + u.promotionalBonusAmount, 0);

console.log(`Users receiving salary: ${paidSalaryCount}`);
console.log(`Total salary payout: $${totalSalaryPaid}`);
console.log(`Users receiving promotional bonus: ${paidBonusCount}`);
console.log(`Total promotional bonus payout: $${totalBonusPaid}`);
