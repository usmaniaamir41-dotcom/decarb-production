const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./db');
const FoodListing = require('./models/FoodListing');

// Config environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── CORS ─────────────────────────────────────────────────────────────────────
// Allow the Vercel frontend + localhost dev
const allowedOrigins = [
  process.env.FRONTEND_URL,           // e.g. https://decarb-io.vercel.app
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean); // remove undefined if FRONTEND_URL not set

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (curl, Render health checks, mobile, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // In development / if FRONTEND_URL not set yet, allow all
    if (!process.env.FRONTEND_URL) return callback(null, true);
    callback(new Error('CORS: origin not allowed — ' + origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing — 10mb limit to support base64 image uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/food', require('./routes/food'));
app.use('/api/order', require('./routes/order'));
app.use('/api/analytics', require('./routes/analytics'));

// Health check endpoint (used by Render to confirm service is live)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// ── Auto-Expiry Engine ────────────────────────────────────────────────────────
// Runs every 30 seconds to expire listings whose pickup window has passed
setInterval(async () => {
  try {
    const now = new Date();
    const availableListings = await FoodListing.find({ status: 'available' });
    const expiredListings = availableListings.filter(item => new Date(item.pickup_time) < now);

    for (let listing of expiredListings) {
      await FoodListing.findByIdAndUpdate(listing._id, {
        $set: { status: 'expired' }
      });
      console.log(`[Auto-Expiry]: "${listing.title}" (${listing._id}) expired.`);
    }
  } catch (err) {
    console.error('[Auto-Expiry Engine] Error:', err.message);
  }
}, 30000);

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function startServer() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`==================================================================`);
    console.log(`  decarb.io Backend running on port ${PORT}`);
    console.log(`  Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`  CORS origin : ${process.env.FRONTEND_URL || 'open (dev mode)'}`);
    console.log(`==================================================================`);
  });
}

startServer();
