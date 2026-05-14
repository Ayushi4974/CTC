const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateUniqueUserId } = require('../utils/generateId');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { fullName, email, password, sponsorId } = req.body;

    // Validation
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Please add all required fields' });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    let sponsor = null;
    // Validate Sponsor
    if (sponsorId) {
      const sponsorUser = await User.findOne({ userId: sponsorId });
      if (!sponsorUser) {
        return res.status(400).json({ message: 'Invalid Sponsor ID' });
      }
      sponsor = sponsorUser._id;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate CTC User ID
    const newUserId = await generateUniqueUserId();

    // Create user
    const user = await User.create({
      userId: newUserId,
      fullName,
      email,
      password: hashedPassword,
      sponsorId: sponsorId || null,
      sponsor: sponsor,
    });

    if (user) {
      if (sponsor) {
        // Update direct sponsor
        await User.findByIdAndUpdate(sponsor, { $inc: { directTeam: 1, totalTeam: 1 } });
        
        // Traverse up the tree to update totalTeam for all ancestors
        let currentSponsorObj = await User.findById(sponsor);
        let currentSponsorId = currentSponsorObj ? currentSponsorObj.sponsor : null;
        let levelsChecked = 1;
        
        while (currentSponsorId && levelsChecked < 30) {
          const ancestor = await User.findByIdAndUpdate(currentSponsorId, { $inc: { totalTeam: 1 } });
          currentSponsorId = ancestor ? ancestor.sponsor : null;
          levelsChecked++;
        }
      }

      res.status(201).json({
        _id: user.id,
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user.id,
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isKYCVerified: user.isKYCVerified,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
};
