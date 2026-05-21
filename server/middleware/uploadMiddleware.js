const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// ─── Determine storage backend ────────────────────────────────────────────────
// If CLOUDINARY_CLOUD_NAME env var is set → use Cloudinary (production)
// Otherwise → use local disk (development)

const USE_CLOUDINARY = !!process.env.CLOUDINARY_CLOUD_NAME;

let storage;

if (USE_CLOUDINARY) {
  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      const userId = req.user?.userId || 'unknown';
      const fieldname = file.fieldname;
      return {
        folder:         'ctc-kyc',                          // Cloudinary folder
        public_id:      `${userId}-${fieldname}-${Date.now()}`,
        resource_type:  'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'svg'],
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      };
    },
  });

  console.log('📦 Upload storage: Cloudinary');
} else {
  // Local disk fallback for development
  const uploadDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const userId = req.user?.userId || 'user';
      cb(null, `${userId}-${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    },
  });

  console.log('📂 Upload storage: Local disk (development)');
}

// ─── File Type Filter ─────────────────────────────────────────────────────────
function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|svg/;
  const extname   = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype  = filetypes.test(file.mimetype);
  if (mimetype && extname) return cb(null, true);
  cb(new Error('Only image files (JPEG, JPG, PNG, SVG) are allowed.'));
}

// ─── Multer instance ──────────────────────────────────────────────────────────
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => checkFileType(file, cb),
});

module.exports = upload;
