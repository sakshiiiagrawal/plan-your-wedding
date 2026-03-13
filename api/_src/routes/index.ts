import { Router } from 'express';
import authRoutes from './auth.routes';
import setupRoutes from './setup.routes';
import eventsRoutes from './events.routes';
import { getPublicEvents } from '../controllers/events.controller';
import venuesRoutes from './venues.routes';
import guestsRoutes from './guests.routes';
import accommodationsRoutes from './accommodations.routes';
import vendorsRoutes from './vendors.routes';
import budgetRoutes from './budget.routes';
import tasksRoutes from './tasks.routes';
import dashboardRoutes from './dashboard.routes';
import websiteContentRoutes from './website-content.routes';
import { getPublicWebsiteContent } from '../controllers/website-content.controller';
import weddingsRoutes from './weddings.routes';

const router = Router();

// Public
router.use('/setup-status', setupRoutes);

// Public slug lookup (no auth)
router.use('/weddings', weddingsRoutes);

// Public slug-scoped content (no auth)
router.get('/public/:slug/website-content/:section', getPublicWebsiteContent);
router.get('/public/:slug/events', getPublicEvents);

// Auth (login/register are public; /me uses global middleware)
router.use('/auth', authRoutes);

// Protected API routes
router.use('/dashboard', dashboardRoutes);
router.use('/events', eventsRoutes);
router.use('/guests', guestsRoutes);
router.use('/venues', venuesRoutes);
router.use('/accommodations', accommodationsRoutes);
router.use('/vendors', vendorsRoutes);
router.use('/budget', budgetRoutes);
router.use('/tasks', tasksRoutes);
router.use('/website-content', websiteContentRoutes);

export default router;
