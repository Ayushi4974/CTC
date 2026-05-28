require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Connect to database
connectDB();
if (process.env.NODE_ENV !== 'production') {
  require('./cron/miningCron');
  require('./cron/salaryCron');
}

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log('User connected via socket:', socket.id);
  
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false })); // Security headers
app.use(cors({ origin: true, credentials: true })); // Enable CORS dynamically
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: false })); // Parse URL-encoded bodies
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files

// Serve Frontend in Production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res, next) => {
    if (req.url.startsWith('/api')) return next();
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

app.use(morgan('dev')); // HTTP request logger

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api/', apiLimiter);

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/package', require('./routes/packageRoutes'));
app.use('/api/transaction', require('./routes/transactionRoutes'));
app.use('/api/withdrawal', require('./routes/withdrawalRoutes'));
app.use('/api/kyc', require('./routes/kycRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Cron endpoint — called by Vercel Cron or GitHub Actions every 12 hours
app.get('/api/cron/mining', async (req, res) => {
  // Security: only allow requests with valid CRON_SECRET token
  // Support both Vercel standard (Authorization: Bearer <token>) and legacy custom header (x-cron-token)
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = req.headers['x-cron-token'];
  const expectedBearer = `Bearer ${process.env.CRON_SECRET}`;

  const isAuthorized = 
    (token && token === process.env.CRON_SECRET) || 
    (authHeader && authHeader === expectedBearer);

  if (!isAuthorized) {
    console.warn('[CRON] ⛔ Unauthorized cron attempt blocked');
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  console.log('============================================');
  console.log('[CRON] ✅ CRON JOB IS RUNNING (via Vercel Cron)');
  console.log(`[CRON] Triggered at: ${new Date().toUTCString()}`);
  console.log('============================================');
  try {
    const { runMiningCronCycle } = require('./cron/miningCron');
    const result = await runMiningCronCycle(false);
    if (result.success) {
      console.log('[CRON] ✅ CRON JOB FINISHED SUCCESSFULLY');
    } else {
      console.warn(`[CRON] ⚠️ CRON SKIPPED — Reason: ${result.reason}`);
    }
    return res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('============================================');
    console.error('[CRON] ❌ CRON JOB ERROR — FAILED TO RUN');
    console.error(`[CRON] Error: ${error.message}`);
    console.error('============================================');
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Root route
app.get('/', (req, res) => {
  res.send('CTC API is running...');
});

// Error Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

module.exports = app;
