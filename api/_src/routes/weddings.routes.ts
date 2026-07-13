import { Router } from 'express';
import {
  getWeddingBySlug,
  create,
  update,
  remove,
} from '../controllers/weddings.controller';
import { validateBody } from '../middleware/validate.middleware';
import { createWeddingSchema, updateWeddingSchema } from '../validators/weddings.validator';

const router = Router();

// Authed wedding management (app.ts keeps only GET /:slug public).
router.post('/', validateBody(createWeddingSchema), create);
router.patch('/:id', validateBody(updateWeddingSchema), update);
router.delete('/:id', remove);

// Public slug existence check — must stay after the management routes so
// POST/PATCH/DELETE don't fall through to it.
router.get('/:slug', getWeddingBySlug);

export default router;
