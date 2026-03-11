const express = require('express');
const router = express.Router();
const { getWeddingBySlug } = require('../controllers/weddings.controller');

router.get('/:slug', getWeddingBySlug);

module.exports = router;
