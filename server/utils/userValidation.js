const UserPackage = require('../models/UserPackage');

/**
 * Validates if a user is truly ACTIVE based on strict production rules.
 * @param {Object} user - The User document
 * @param {Object} [activePackage=null] - Optional pre-fetched active package
 * @returns {Promise<boolean>}
 */
const isStrictlyActiveUser = async (user, activePackage = null) => {
  if (!user) return false;
  
  // 1. Account not blocked/suspended (assuming user.isBlocked exists, falling back to isActive)
  if (user.isBlocked || user.isActive === false) return false;

  // 2. Mathematical Cap Check (1X for Zero Pin, 4X for normal packages)
  let pkgToCheck = activePackage;
  if (!pkgToCheck) {
    pkgToCheck = await UserPackage.findOne({ user: user._id, status: 'active' });
  }

  const multiplier = (pkgToCheck && pkgToCheck.isZeroPin) ? 1 : 4;

  if (user.totalInvestment && user.totalInvestment > 0) {
    if (user.totalEarning >= user.totalInvestment * multiplier) {
      return false; // Reached global cap
    }
  }

  // 3. Package Validation
  if (!pkgToCheck) return false; // No active package

  // 4. Package specific checks
  if (pkgToCheck.status !== 'active') return false;
  
  // 5. Package expiration check
  if (pkgToCheck.endDate && pkgToCheck.endDate < new Date()) return false;

  // 6. Package mathematical cap check
  if (pkgToCheck.amount && pkgToCheck.amount > 0) {
    if (pkgToCheck.totalEarned >= pkgToCheck.amount * multiplier) {
      return false;
    }
  }

  return true;
};

module.exports = {
  isStrictlyActiveUser
};
