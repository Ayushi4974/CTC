const Package = require('../models/Package');
const UserPackage = require('../models/UserPackage');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');
const { verifyTransaction } = require('../services/blockchainService');
const { distributeDirectReferral } = require('../services/referralService');

const getAllPackages = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id || req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    let filter = { status: true };

    if (user.pins === 0) {
      // 0-Pin users can ONLY see/purchase Zero Pin packages
      filter.isZeroPin = true;
    } else {
      // Normal users can ONLY see/purchase non-Zero Pin packages
      filter.isZeroPin = { $ne: true };
      
      // If user has no sponsor, hide referral-only packages
      if (!user.sponsor) {
        filter.isReferralOnly = { $ne: true };
      }
    }

    const packages = await Package.find(filter).sort({ minAmount: 1 });
    res.json(packages);
  } catch (error) {
    next(error);
  }
};

const buyPackage = async (req, res, next) => {
  try {
    const { packageId, amount, txHash, senderAddress } = req.body;

    if (!senderAddress) {
      return res.status(400).json({ message: 'Sender wallet address is required for verification.' });
    }

    const pkg = await Package.findById(packageId);
    if (!pkg) return res.status(404).json({ message: 'Package not found' });

    if (amount < pkg.minAmount || amount > pkg.maxAmount) {
      return res.status(400).json({ message: 'Invalid amount for this package' });
    }

    // Check for duplicate transaction
    const existingTx = await Transaction.findOne({ txHash });
    if (existingTx) {
      return res.status(400).json({ message: 'This transaction hash has already been used. Duplicate transactions are not allowed.' });
    }

    const verification = await verifyTransaction(txHash, amount, senderAddress);
    if (!verification.status) {
      return res.status(400).json({ message: verification.message });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Zero-pin restriction checks
    if (user.pins === 0) {
      if (!pkg.isZeroPin) {
        return res.status(400).json({ message: 'Only the standard $100-$500 Package is available for 0-Pin users.' });
      }
    } else {
      if (pkg.isZeroPin) {
        return res.status(400).json({ message: 'This package is only available for 0-Pin users.' });
      }
    }

    if (user.role === 'user' && (user.totalInvestment + amount) > 10000) {
      return res.status(400).json({ message: 'Standard users are limited to a maximum investment of $10,000.' });
    }

    // Multi-Package Rules: Prevent Package Stacking and Handle Upgrades
    const existingActivePkg = await UserPackage.findOne({ user: user._id, status: 'active' });
    if (existingActivePkg) {
      if (amount <= existingActivePkg.amount) {
        return res.status(400).json({ message: 'Upgrades must be of a higher value than your current active package.' });
      }
      // Upgrade logic: Mark old as upgraded, ROI generation will stop for it
      existingActivePkg.status = 'upgraded';
      await existingActivePkg.save();
    }

    const isBVEligible = true; // External deposits count towards BV
    const durationDays = pkg.validity;

    const userPackage = await UserPackage.create({
      userId: user.userId,
      user: user._id,
      packageId: pkg._id,
      amount,
      compoundingBalance: amount,
      dailyProfitPercent: pkg.dailyProfit,
      endDate: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
      isBVEligible,
      isStaked: false,
      stakingDuration: 0,
      isZeroPin: pkg.isZeroPin,
      stakingEnabled: false,
      stakingPeriod: 0,
      autoCompounding: false
    });

    // Note: user.isActive is NOT set to true here. Admin must manually activate the user ID.
    user.activePackage = pkg._id;
    user.totalInvestment += amount; // Expands their 4x global cap
    await user.save();

    await AuditLog.create({                                                                         
      
      action: 'PACKAGE_ACTIVATION',
      userId: user._id,
      packageId: userPackage._id,
      amount: amount,
      details: {
        txHash,
        isUpgrade: !!existingActivePkg,
        oldPackageId: existingActivePkg ? existingActivePkg._id : null
      }
    });

    await Transaction.create({
      userId: user.userId,
      user: user._id,
      type: 'deposit',
      amount,
      txHash,
      walletAddress: senderAddress,
      chainId: verification.chainId,
      tokenContract: verification.tokenContract,
      blockNumber: verification.blockNumber,
      confirmationCount: verification.confirmationCount,
      status: 'success'
    });

    if (user.sponsor) {
      // Direct referral income is disabled in this project
      // await distributeDirectReferral(user.sponsor, amount, user.userId, user._id);

      // Check Fastrack Bonus for Sponsor
      const sponsor = await User.findById(user.sponsor);
      if (sponsor && !sponsor.fastrackQualified && sponsor.activePackage) {
        const sponsorPkg = await UserPackage.findOne({ user: sponsor._id, status: 'active' }).sort({ createdAt: -1 });
        if (sponsorPkg) {
          const tenDaysAgo = new Date();
          tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

          if (sponsorPkg.createdAt >= tenDaysAgo) {
            // Count directs with same or higher package (excluding 0-pin users)
            const directsWithQualifyingPkg = await UserPackage.countDocuments({
              user: { $in: await User.find({ sponsor: sponsor._id, pins: { $gt: 0 } }).distinct('_id') },
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

const startStaking = async (req, res, next) => {
  try {
    const { userPackageId, period } = req.body;

    if (!userPackageId || !period) {
      return res.status(400).json({ message: 'Package ID and Staking Period are required.' });
    }

    const periodNum = Number(period);
    if (![30, 90, 180, 360].includes(periodNum)) {
      return res.status(400).json({ message: 'Invalid staking duration. Must be 30, 90, 180, or 360 days.' });
    }

    const userPkg = await UserPackage.findOne({ _id: userPackageId, user: req.user._id });
    if (!userPkg) {
      return res.status(404).json({ message: 'Active package not found.' });
    }

    if (userPkg.status !== 'active') {
      return res.status(400).json({ message: 'Staking can only be enabled on active packages.' });
    }

    if (userPkg.stakingEnabled) {
      return res.status(400).json({ message: 'Staking is already enabled on this package.' });
    }

    userPkg.stakingEnabled = true;
    userPkg.stakingPeriod = periodNum;
    userPkg.stakingStartDate = new Date();
    userPkg.stakingEndDate = new Date(Date.now() + periodNum * 24 * 60 * 60 * 1000);
    userPkg.autoCompounding = true;
    
    // Maintain backward compatibility with old fields
    userPkg.isStaked = true;
    userPkg.stakingDuration = periodNum;

    await userPkg.save();

    await AuditLog.create({
      action: 'STAKING_ACTIVATION',
      userId: req.user._id,
      packageId: userPkg._id,
      amount: userPkg.amount,
      details: { period: periodNum, stakingEndDate: userPkg.stakingEndDate }
    });

    res.status(200).json({ 
      message: `Staking enabled successfully for ${periodNum} days.`, 
      userPackage: userPkg 
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllPackages, buyPackage, getUserPackages, startStaking };
