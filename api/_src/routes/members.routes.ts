import { Router } from 'express';
import { validateBody } from '../middleware/validate.middleware';
import {
  inviteMemberSchema,
  acceptInviteSchema,
  updateMemberSchema,
} from '../validators/members.validator';
import * as membersController from '../controllers/members.controller';
import { inviteLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

const { requireAdmin } = membersController;

router.get('/', membersController.list);
router.post(
  '/invite',
  requireAdmin,
  inviteLimiter,
  validateBody(inviteMemberSchema),
  membersController.invite,
);
router.post('/accept', validateBody(acceptInviteSchema), membersController.accept);
// Self-scope: invites addressed to the logged-in user's email (no admin gate)
router.get('/pending', membersController.listPending);
router.post('/pending/:id/accept', membersController.acceptPending);
router.delete('/pending/:id', membersController.declinePending);
router.patch('/:id', requireAdmin, validateBody(updateMemberSchema), membersController.update);
router.delete('/:id', requireAdmin, membersController.remove);

export default router;
