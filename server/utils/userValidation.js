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

  // 2. Mathematical 4x Cap Check
  if (user.totalInvestment && user.totalInvestment > 0) {
    if (user.totalEarning >= user.totalInvestment * 4) {
      return false; // Reached global 4x cap
    }
  }

  // 3. Package Validation
  let pkgToCheck = activePackage;
  if (!pkgToCheck) {
    pkgToCheck = await UserPackage.findOne({ user: user._id, status: 'active' });
  }

  if (!pkgToCheck) return false; // No active package

  // 4. Package specific checks
  if (pkgToCheck.status !== 'active') return false;
  
  // 5. Package expiration check
  if (pkgToCheck.endDate && pkgToCheck.endDate < new Date()) return false;

  // 6. Package mathematical cap check
  if (pkgToCheck.amount && pkgToCheck.amount > 0) {
    if (pkgToCheck.totalEarned >= pkgToCheck.amount * 4) {
      return false;
    }
  }

  return true;
};

module.exports = {
  isStrictlyActiveUser
};
