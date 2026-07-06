import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import routes from './routes/index';
import errorMiddleware from './middleware/error.middleware';
import { verifyToken } from './middleware/auth.middleware';
import { serveWithOgTags } from './controllers/og.controller';

const app = express();

// Deployed behind Vercel's proxy: trust the rightmost X-Forwarded-For hop so
// req.ip is the client IP (express-rate-limit throws without this)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins: string[] = [
  'http://localhost:5173',
  'http://localhost:3000',
  ...(env.FRONTEND_URL ? [env.FRONTEND_URL] : []),
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (env.NODE_ENV === 'development') return callback(null, true);
      // Vercel preview/PR deployments get a per-branch *.vercel.app origin that
      // won't match FRONTEND_URL exactly, so allow the whole subdomain.
      if (origin.endsWith('.vercel.app')) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);

// Logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public wedding pages rewritten here by Vercel get the SPA shell with
// per-wedding OpenGraph tags injected (WhatsApp/social link previews).
// Falls through to the normal chain for anything that isn't a wedding page.
app.get('/:slug', serveWithOgTags);
app.get('/:slug/:pageSlug', serveWithOgTags);

// Public paths that do NOT require a token
const PUBLIC_PATHS: string[] = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/auth/verify-email',
  '/api/v1/setup-status',
];

// Public path prefixes (any path starting with these is public)
const PUBLIC_PREFIXES: string[] = ['/api/v1/weddings/', '/api/v1/public/'];

// Top-level prefixes mounted in routes/index.ts. A path outside all of these
// isn't a real route at all, so it should 404 rather than 401 — otherwise an
// unauthenticated request can't tell "wrong URL" from "needs a token".
const PROTECTED_PREFIXES: string[] = [
  '/api/v1/auth/',
  '/api/v1/geocode',
  '/api/v1/dashboard',
  '/api/v1/events',
  '/api/v1/guests',
  '/api/v1/venues',
  '/api/v1/vendors',
  '/api/v1/expense',
  '/api/v1/tasks',
  '/api/v1/website-content',
  '/api/v1/members',
  '/api/v1/pages',
];

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Global auth middleware — skips public paths and public GET website-content
app.use((req, res, next) => {
  const path = req.path;

  // Exact public paths
  if (PUBLIC_PATHS.includes(path)) return next();

  // Public path prefixes (weddings lookup, public slug-scoped data)
  if (PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))) return next();

  // Not a registered route at all — 404, don't demand a token for a URL that
  // was never going to resolve to anything.
  if (!PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    res.status(404).json({ error: 'Route not found' });
    return;
  }

  // Everything else requires a valid token
  return verifyToken(req, res, () => {
    // Viewers are read-only across every resource (ponytail: one gate, not 90
    // edits). Self-scope account routes are exempt — the wedding role must not
    // block a viewer from managing their own account or accepting an invite.
    if (
      WRITE_METHODS.has(req.method) &&
      req.user?.role === 'viewer' &&
      !path.startsWith('/api/v1/auth/') &&
      path !== '/api/v1/members/accept'
    ) {
      res.status(403).json({ error: 'Viewers cannot make changes' });
      return;
    }
    next();
  });
});

// API routes
app.use('/api/v1', routes);

// 404 handler (after routes, before the error handler)
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling (must be last)
app.use(errorMiddleware);

export default app;
