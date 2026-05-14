const Transaction = require('../models/Transaction');

const getTransactionHistory = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    next(error);
  }
};

module.exports = { getTransactionHistory };
