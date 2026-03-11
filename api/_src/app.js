const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const errorMiddleware = require('./middleware/error.middleware');
const { verifyToken } = require('./middleware/auth.middleware');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV === 'development') return callback(null, true);
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public paths that do NOT require a token
const PUBLIC_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/setup-status',
];

// Public path prefixes (any path starting with these is public)
const PUBLIC_PREFIXES = [
  '/api/v1/weddings/',
  '/api/v1/public/',
];

// Global auth middleware — skips public paths and public GET website-content
app.use((req, res, next) => {
  const path = req.path;

  // Exact public paths
  if (PUBLIC_PATHS.includes(path)) return next();

  // Public path prefixes (weddings lookup, public slug-scoped data)
  if (PUBLIC_PREFIXES.some(prefix => path.startsWith(prefix))) return next();

  // Public GET on website-content (wedding website reads)
  if (req.method === 'GET' && path.startsWith('/api/v1/website-content')) return next();

  // Everything else requires a valid token
  return verifyToken(req, res, next);
});

// API routes
app.use('/api/v1', routes);

// Error handling
app.use(errorMiddleware);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app;
