const Package = require('../models/Package');
const UserPackage = require('../models/UserPackage');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { verifyTransaction } = require('../services/blockchainService');
const { distributeDirectReferral } = require('../services/referralService');

const getAllPackages = async (req, res, next) => {
  try {
    const packages = await Package.find({ status: true });
    res.json(packages);
  } catch (error) {
    next(error);
  }
};

const buyPackage = async (req, res, next) => {
  try {
    const { packageId, amount, txHash } = req.body;
    
    const pkg = await Package.findById(packageId);
    if (!pkg) return res.status(404).json({ message: 'Package not found' });
    
    if (amount < pkg.minAmount || amount > pkg.maxAmount) {
      return res.status(400).json({ message: 'Invalid amount for this package' });
    }

    const verification = await verifyTransaction(txHash, amount);
    if (!verification.status) {
      return res.status(400).json({ message: verification.message });
    }

    const user = await User.findById(req.user._id);

    if (user.role === 'user' && (user.totalInvestment + amount) > 10000) {
      return res.status(400).json({ message: 'Standard users are limited to a maximum investment of $10,000.' });
    }
    
    const userPackage = await UserPackage.create({
      userId: user.userId,
      user: user._id,
      packageId: pkg._id,
      amount,
      dailyProfitPercent: pkg.dailyProfit,
      endDate: new Date(Date.now() + pkg.validity * 24 * 60 * 60 * 1000)
    });

    user.isActive = true;
    user.activePackage = pkg._id;
    user.totalInvestment += amount;
    await user.save();

    await Transaction.create({
      userId: user.userId,
      user: user._id,
      type: 'deposit',
      amount,
      txHash,
      status: 'success'
    });

    if (user.sponsor) {
      await distributeDirectReferral(user.sponsor, amount, user.userId, user._id);
      
      // Check Fastrack Bonus for Sponsor
      const sponsor = await User.findById(user.sponsor);
      if (sponsor && !sponsor.fastrackQualified && sponsor.activePackage) {
        const sponsorPkg = await UserPackage.findOne({ user: sponsor._id, status: 'active' }).sort({ createdAt: -1 });
        if (sponsorPkg) {
          const tenDaysAgo = new Date();
          tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
          
          if (sponsorPkg.createdAt >= tenDaysAgo) {
            // Count directs with same or higher package
            const directsWithQualifyingPkg = await UserPackage.countDocuments({
              user: { $in: await User.find({ sponsor: sponsor._id }).distinct('_id') },
              amount: { $gte: sponsorPkg.amount },
              status: 'active'
            });

            if (directsWithQualifyingPkg >= 5) {
              sponsor.fastrackQualified = true;
              await sponsor.save();
            }
          }
        }
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('new_deposit', { user: user.userId, amount });
      io.to(user._id.toString()).emit('notification', `Package ${pkg.name} activated successfully!`);
    }

    res.status(200).json({ message: 'Package activated successfully', userPackage });
  } catch (error) {
    next(error);
  }
};

const getUserPackages = async (req, res, next) => {
  try {
    const packages = await UserPackage.find({ user: req.user._id }).populate('packageId');
    res.json(packages);
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllPackages, buyPackage, getUserPackages };
