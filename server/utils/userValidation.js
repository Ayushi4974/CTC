const UserPackage = require('../models/UserPackage');

/**
 * Validates if a user is truly ACTIVE based on strict production rules.
 * @param {Object} user - The User document
 * @param {Object} [activePackage=null] - Optional pre-fetched active package
 * @returns {Promise<boolean>}
 */
const isStrictlyActiveUser = async (user, activePackage = null) => {
  if (!user) return false;
  
  // 1. Account not blocked/suspended
  if (user.isBlocked || user.isActive === false) return false;

  // 2. If a specific package is provided, evaluate that package
  if (activePackage) {
    const multiplier = activePackage.isZeroPin ? 1 : 4;
    
    // Global cap check using this package's multiplier
    if (user.totalInvestment && user.totalInvestment > 0) {
      if (user.totalEarning >= user.totalInvestment * multiplier) {
        return false;
      }
    }
    
    if (activePackage.status !== 'active') return false;
    if (activePackage.endDate && activePackage.endDate < new Date()) return false;
    if (activePackage.amount && activePackage.amount > 0) {
      if (activePackage.totalEarned >= activePackage.amount * multiplier) {
        return false;
      }
    }
    return true;
  }

  // 3. If no specific package is provided, check if the user has AT LEAST ONE active, non-expired, non-capped package
  const activePkgs = await UserPackage.find({ user: user._id, status: 'active' });
  if (activePkgs.length === 0) return false;

  // Check if user has at least one valid active package
  let hasValidPackage = false;
  for (const pkg of activePkgs) {
    const multiplier = pkg.isZeroPin ? 1 : 4;
    
    // Check global cap
    if (user.totalInvestment && user.totalInvestment > 0) {
      if (user.totalEarning >= user.totalInvestment * multiplier) {
        continue; // Try next package
      }
    }
    
    // Check package expiration
    if (pkg.endDate && pkg.endDate < new Date()) {
      continue;
    }
    
    // Check package cap
    if (pkg.amount && pkg.amount > 0) {
      if (pkg.totalEarned >= pkg.amount * multiplier) {
        continue;
      }
    }
    
    hasValidPackage = true;
    break;
  }

  return hasValidPackage;
};

module.exports = {
  isStrictlyActiveUser
};
