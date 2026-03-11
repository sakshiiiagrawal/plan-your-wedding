const express = require('express');
const router = express.Router();

const dashboardRoutes = require('./dashboard.routes');
const eventsRoutes = require('./events.routes');
const guestsRoutes = require('./guests.routes');
const venuesRoutes = require('./venues.routes');
const accommodationsRoutes = require('./accommodations.routes');
const vendorsRoutes = require('./vendors.routes');
const budgetRoutes = require('./budget.routes');
const tasksRoutes = require('./tasks.routes');
const authRoutes = require('./auth.routes');
const websiteContentRoutes = require('./websiteContent.routes');
const setupRoutes = require('./setup.routes');
const weddingsRoutes = require('./weddings.routes');
const { getPublicWebsiteContent } = require('../controllers/websiteContent.controller');
const { getPublicEvents } = require('../controllers/events.controller');

// Public
router.use('/setup-status', setupRoutes);

// Public slug lookup (no auth)
router.use('/weddings', weddingsRoutes);

// Public slug-scoped content (no auth)
router.get('/public/:slug/website-content/:section', getPublicWebsiteContent);
router.get('/public/:slug/events', getPublicEvents);

// Auth (login/register are public; /me and user-management use global middleware)
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

module.exports = router;
