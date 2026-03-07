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

// API Routes
router.use('/auth', authRoutes);
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
