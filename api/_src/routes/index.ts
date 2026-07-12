import { Router } from 'express';
import authRoutes from './auth.routes';
import setupRoutes from './setup.routes';
import eventsRoutes from './events.routes';
import { getPublicEvents } from '../controllers/events.controller';
import venuesRoutes from './venues.routes';
import guestsRoutes from './guests.routes';
import vendorsRoutes from './vendors.routes';
import expenseRoutes from './expense.routes';
import tasksRoutes from './tasks.routes';
import remindersRoutes from './reminders.routes';
import { runDailyDigest } from '../controllers/reminders.controller';
import dashboardRoutes from './dashboard.routes';
import websiteContentRoutes from './website-content.routes';
import { getPublicWebsiteContent } from '../controllers/website-content.controller';
import { submitPublicRsvp } from '../controllers/guests.controller';
import { validateBody } from '../middleware/validate.middleware';
import { publicRsvpSchema } from '../validators/guests.validator';
import { publicRsvpLimiter } from '../middleware/rate-limit.middleware';
import weddingsRoutes from './weddings.routes';
import geocodeRoutes from './geocode.routes';
import membersRoutes from './members.routes';
import pagesRoutes from './pages.routes';
import { getPublicPages } from '../controllers/pages.controller';
import { requireSection } from '../middleware/access.middleware';
import { applyFinanceTier } from '../middleware/finance-visibility';

const router = Router();

// Public
router.use('/setup-status', setupRoutes);

// Public slug lookup (no auth)
router.use('/weddings', weddingsRoutes);

// Public slug-scoped content (no auth)
router.get('/public/:slug/website-content/:section', getPublicWebsiteContent);
router.get('/public/:slug/events', getPublicEvents);
router.get('/public/:slug/pages', getPublicPages);
router.post(
  '/public/:slug/rsvp',
  publicRsvpLimiter,
  validateBody(publicRsvpSchema),
  submitPublicRsvp,
);

// Cron (public path in app.ts; guarded inside by CRON_SECRET, not a user token)
router.get('/cron/daily-digest', runDailyDigest);

// Auth (login/register are public; /me uses global middleware)
router.use('/auth', authRoutes);

// Protected API routes. geocode/dashboard/members stay unguarded by section
// (dashboard is an overview, members gates itself via requirePermission).
router.use('/geocode', geocodeRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/events', requireSection('events'), eventsRoutes);
router.use('/guests', requireSection('guests'), guestsRoutes);
router.use('/venues', requireSection('venues'), applyFinanceTier, venuesRoutes);
router.use('/vendors', requireSection('vendors'), applyFinanceTier, vendorsRoutes);
router.use('/expense', requireSection('budget'), applyFinanceTier, expenseRoutes);
router.use('/tasks', requireSection('tasks'), tasksRoutes);
// No requireSection: the feed's task/payment halves are gated per-caller in
// the controller (a member may hold tasks but not budget access, or vice versa).
router.use('/reminders', remindersRoutes);
router.use('/website-content', requireSection('website'), websiteContentRoutes);
router.use('/members', membersRoutes);
router.use('/pages', requireSection('website'), pagesRoutes);

export default router;
