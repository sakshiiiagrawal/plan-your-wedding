const express = require('express');
const router = express.Router();
const setupController = require('../controllers/setup.controller');

router.get('/', setupController.getSetupStatus);

module.exports = router;
