import { Router } from 'express';
import { validateBody } from '../middleware/validate.middleware';
import {
  createVendorSchema,
  updateVendorSchema,
  assignToEventSchema,
} from '../validators/vendors.validator';
import * as ctrl from '../controllers/vendors.controller';

const router = Router();

router.get('/', ctrl.getAll);
router.get('/categories', ctrl.getCategories);
router.get('/:id', ctrl.getById);
router.post('/', validateBody(createVendorSchema), ctrl.create);
router.put('/:id', validateBody(updateVendorSchema), ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/assign/:eventId', validateBody(assignToEventSchema), ctrl.assignToEvent);
router.delete('/:id/assign/:eventId', ctrl.removeFromEvent);
router.get('/:id/payments', ctrl.getPayments);

export default router;
