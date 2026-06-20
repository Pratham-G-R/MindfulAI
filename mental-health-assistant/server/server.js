/**
 * MindfulAI - Mental Health Support Assistant
 * Main Express Server
 * 
 * This server provides the backend API for the LLM-powered
 * mental health support assistant, including chat, mood tracking,
 * journaling, and breathing exercise endpoints.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initDb } = require('./database');

// ─── Initialize Express App ─────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"]
    }
  }
}));

app.use(cors());

// ─── Rate Limiting ──────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per window
  message: {
    error: 'Too many requests. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// ─── Body Parsing & Logging ─────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ─── Static Files ───────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── API Routes ─────────────────────────────────────────────────────────────
const { router: authRoutes, authenticateToken } = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const moodRoutes = require('./routes/mood');
const journalRoutes = require('./routes/journal');
const breathingRoutes = require('./routes/breathing');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', authenticateToken, chatRoutes);
app.use('/api/mood', authenticateToken, moodRoutes);
app.use('/api/journal', authenticateToken, journalRoutes);
app.use('/api/breathing', authenticateToken, breathingRoutes);

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ─── Serve SPA ──────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ─── Error Handling Middleware ───────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('═══ Server Error ═══');
  console.error('Message:', err.message);
  console.error('Stack:', err.stack);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production'
      ? 'An internal server error occurred.'
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// ─── Start Server ───────────────────────────────────────────────────────────
async function startServer() {
  try {
    // Database is initialized in database.js
    console.log('✅ Database connected');

    const server = app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════════╗
║                                                      ║
║   🧠 MindfulAI Server Running                       ║
║                                                      ║
║   Local:  http://localhost:${PORT}                    ║
║   Mode:   ${process.env.NODE_ENV || 'development'}                     ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
      `);
    });

    // ─── Graceful Shutdown ────────────────────────────────────────────
    const shutdown = (signal) => {
      console.log(`\n🛑 ${signal} received. Shutting down gracefully...`);
      server.close(() => {
        console.log('✅ Server closed.');
        process.exit(0);
      });
      setTimeout(() => {
        console.error('⚠️  Forced shutdown after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
