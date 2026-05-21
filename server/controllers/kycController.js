const KYC = require('../models/KYC');

// Helper: extract the storable URL from a multer file object.
// - Cloudinary storage: file.path = full https://res.cloudinary.com/… URL
// - Disk storage:       file.filename = just the filename → store as /uploads/<filename>
const getFileUrl = (file) => {
  if (!file) return null;
  // Cloudinary gives a full URL in file.path
  if (file.path && file.path.startsWith('http')) return file.path;
  // Disk storage gives a local filename
  if (file.filename) return `/uploads/${file.filename}`;
  // Fallback
  if (file.path) return file.path;
  return null;
};

const uploadKYC = async (req, res, next) => {
  try {
    const { bankName, accountNumber, ifscCode } = req.body;

    const aadhaarFront = getFileUrl(req.files?.['aadharFront']?.[0]);
    const aadhaarBack  = getFileUrl(req.files?.['aadharBack']?.[0]);
    const panCard      = getFileUrl(req.files?.['panFront']?.[0]);
    const profilePic   = getFileUrl(req.files?.['profile']?.[0]);

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
      ifscCode,
    });

    // Update user's profile picture if one was uploaded
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
