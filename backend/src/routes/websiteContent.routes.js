const express = require('express');
const router = express.Router();
const websiteContentController = require('../controllers/websiteContent.controller');

router.get('/', websiteContentController.getAll);
router.get('/hero', websiteContentController.getHeroContent);
router.get('/couple', websiteContentController.getCoupleContent);
router.get('/story', websiteContentController.getOurStory);
router.get('/:section', websiteContentController.getBySection);
router.put('/:section', websiteContentController.update);

module.exports = router;
