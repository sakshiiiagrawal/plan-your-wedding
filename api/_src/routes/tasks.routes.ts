import { Router } from 'express';
import { validateBody } from '../middleware/validate.middleware';
import {
  createTaskSchema,
  updateTaskSchema,
  updateStatusSchema,
} from '../validators/tasks.validator';
import * as ctrl from '../controllers/tasks.controller';

const router = Router();

router.get('/', ctrl.getAll);
router.get('/stats', ctrl.getStats);
router.get('/overdue', ctrl.getOverdue);
router.get('/upcoming', ctrl.getUpcoming);
router.get('/:id', ctrl.getById);
router.post('/', validateBody(createTaskSchema), ctrl.create);
router.put('/:id', validateBody(updateTaskSchema), ctrl.update);
router.put('/:id/status', validateBody(updateStatusSchema), ctrl.updateStatus);
router.delete('/:id', ctrl.remove);

export default router;
