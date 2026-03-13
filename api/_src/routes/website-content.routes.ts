import { Router } from 'express';
import * as ctrl from '../controllers/website-content.controller';

const router = Router();

// Specific paths before /:section
router.get('/hero', ctrl.getHeroContent);
router.get('/couple', ctrl.getCoupleContent);
router.get('/story', ctrl.getOurStory);
router.get('/', ctrl.getAll);
router.get('/:section', ctrl.getBySection);
router.put('/:section', ctrl.update);

export default router;
