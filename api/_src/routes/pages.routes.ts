import { Router } from 'express';
import * as ctrl from '../controllers/pages.controller';
import { validateBody } from '../middleware/validate.middleware';
import { createPageSchema, updatePageSchema } from '../validators/pages.validator';

const router = Router();

router.get('/', ctrl.list);
router.post('/', validateBody(createPageSchema), ctrl.create);
router.put('/:id', validateBody(updatePageSchema), ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
