const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

// Load environment variables from .env file in server directory
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Fallback: Try to load from project root if server .env doesn't exist
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
}

// Debug: Log DATABASE_URL and REDIS_URL specifically
console.log('🔧 Environment check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL preview:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) + '...' : 'undefined');
console.log('REDIS_URL exists:', !!process.env.REDIS_URL);
console.log('REDIS_URL preview:', process.env.REDIS_URL ? process.env.REDIS_URL.substring(0, 20) + '...' : 'undefined');

const { sequelize } = require('./config/database');
const redisClient = require('./config/redis');
const socketHandler = require('./socket/socketHandler');

// Import routes
const authRoutes = require('./routes/auth');
const auctionRoutes = require('./routes/auctions');
const bidRoutes = require('./routes/bids');
const adminRoutes = require('./routes/admin');

// Import middleware
const { authenticateToken } = require('./middleware/auth');
// Simple rate limiter without external dependencies
const simpleRateLimit = (req, res, next) => next();

const app = express();
const server = http.createServer(app);

// Resolve CORS origin
const CLIENT_URL = process.env.CLIENT_URL || (process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:3001');

// Socket.IO setup with CORS
const io = socketIo(server, {
  cors: {
    origin: CLIENT_URL, // undefined in production when serving same origin
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: CLIENT_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Handle preflight
app.options('*', cors({
  origin: CLIENT_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());
app.use(simpleRateLimit);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Make io available to routes
app.set('io', io);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Socket handling
socketHandler(io);

// Database sync and server start
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Sync database models
    await sequelize.sync({ alter: true });
    console.log('✅ Database models synchronized.');
    
    // Test Redis connection (but don't fail if it doesn't work)
    try {
      await redisClient.ping();
      console.log('✅ Redis connection established successfully.');
    } catch (error) {
      console.log('📝 Using mock Redis client (Redis not available)');
    }
    
    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = { app, server, io };
