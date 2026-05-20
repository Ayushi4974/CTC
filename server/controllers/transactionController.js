const Transaction = require('../models/Transaction');
const UserPackage = require('../models/UserPackage');
const ReferralIncome = require('../models/ReferralIncome');
const Package = require('../models/Package'); // Populate packageId

const getTransactionHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Fetch standard transactions (deposits, withdrawals, salaries, etc.)
    const txsPromise = Transaction.find({ user: userId });

    // Fetch user packages (investments)
    const pkgsPromise = UserPackage.find({ user: userId }).populate('packageId');

    // Fetch referral income
    const referralsPromise = ReferralIncome.find({ user: userId });

    const [txs, pkgs, referrals] = await Promise.all([txsPromise, pkgsPromise, referralsPromise]);

    // Map packages to unified transaction format
    const investmentHistory = pkgs.map(pkg => ({
      _id: pkg._id,
      userId: pkg.userId,
      user: pkg.user,
      type: 'investment',
      description: `Purchased ${pkg.packageId?.name || 'Standard Package'}`,
      amount: pkg.amount,
      txHash: pkg.txHash || 'System',
      status: pkg.status === 'cancelled' ? 'failed' : 'success',
      createdAt: pkg.startDate || pkg.createdAt
    }));

    // Map referrals to unified transaction format
    const referralHistory = referrals.map(ref => ({
      _id: ref._id,
      userId: ref.userId,
      user: ref.user,
      type: 'referral',
      description: `Direct Referral Commission from ${ref.fromUserId}`,
      amount: ref.income,
      txHash: 'System',
      status: 'success',
      createdAt: ref.createdAt
    }));

    // Format normal transactions to include a description if missing
    const formattedTxs = txs.map(tx => {
      const txObj = tx.toObject();
      if (!txObj.description) {
        if (txObj.type === 'deposit') txObj.description = 'Account Funding';
        else if (txObj.type === 'withdrawal') txObj.description = 'Funds Withdrawal';
        else if (txObj.type === 'bonus') txObj.description = 'Rank Achievement Bonus';
        else if (txObj.type === 'salary') txObj.description = 'Leadership Salary';
        else txObj.description = 'Platform Activity';
      }
      return txObj;
    });

    // Combine all history
    const combinedHistory = [...formattedTxs, ...investmentHistory, ...referralHistory]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(combinedHistory);
  } catch (error) {
    next(error);
  }
};

module.exports = { getTransactionHistory };
