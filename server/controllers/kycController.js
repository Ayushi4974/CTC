const KYC = require('../models/KYC');

const uploadKYC = async (req, res, next) => {
  try {
    const { bankName, accountNumber, ifscCode } = req.body;
    
    const aadhaarFront = req.files && req.files['aadharFront'] ? `/uploads/${req.files['aadharFront'][0].filename}` : null;
    const aadhaarBack = req.files && req.files['aadharBack'] ? `/uploads/${req.files['aadharBack'][0].filename}` : null;
    const panCard = req.files && req.files['panFront'] ? `/uploads/${req.files['panFront'][0].filename}` : null;
    const profilePic = req.files && req.files['profile'] ? `/uploads/${req.files['profile'][0].filename}` : null;

    let kyc = await KYC.findOne({ user: req.user._id });
    if (kyc) {
      return res.status(400).json({ message: 'KYC already submitted' });
    }

    kyc = await KYC.create({
      userId: req.user.userId,
      user: req.user._id,
      aadhaarFront,
      aadhaarBack,
      panCard,
      bankName,
      accountNumber,
      ifscCode
    });

    // Optionally update user's profile picture if one was uploaded
    if (profilePic) {
      await require('../models/User').findByIdAndUpdate(req.user._id, { profilePic });
    }

    res.status(201).json({ message: 'KYC uploaded successfully', kyc });
  } catch (error) {
    next(error);
  }
};

const getKYCStatus = async (req, res, next) => {
  try {
    const kyc = await KYC.findOne({ user: req.user._id });
    res.json(kyc || { status: 'Not Submitted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadKYC, getKYCStatus };
