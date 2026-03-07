const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');

router.get('/stats', dashboardController.getStats);
router.get('/summary', dashboardController.getSummary);
router.get('/countdown', dashboardController.getCountdown);

module.exports = router;
