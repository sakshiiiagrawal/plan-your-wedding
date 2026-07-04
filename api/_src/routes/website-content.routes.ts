import { Router } from 'express';
import multer from 'multer';
import * as ctrl from '../controllers/website-content.controller';
import * as mediaCtrl from '../controllers/media.controller';
import { validateBody } from '../middleware/validate.middleware';
import { deleteGalleryImageSchema } from '../validators/media.validator';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Specific paths before /:section
router.get('/hero', ctrl.getHeroContent);
router.get('/couple', ctrl.getCoupleContent);
router.get('/story', ctrl.getOurStory);
router.get('/gallery', ctrl.getGalleryContent);
router.post('/gallery/images', upload.single('file'), mediaCtrl.uploadGalleryImage);
router.delete(
  '/gallery/images',
  validateBody(deleteGalleryImageSchema),
  mediaCtrl.deleteGalleryImage,
);
router.get('/', ctrl.getAll);
router.get('/:section', ctrl.getBySection);
router.put('/:section', ctrl.update);

export default router;
