import { Router } from 'express';
import { validateBody } from '../middleware/validate.middleware';
import {
  inviteMemberSchema,
  acceptInviteSchema,
  updateMemberSchema,
} from '../validators/members.validator';
import * as membersController from '../controllers/members.controller';
import { inviteLimiter } from '../middleware/rate-limit.middleware';
import { requirePermission } from '../middleware/access.middleware';

const router = Router();

const manage = requirePermission('members:manage');

router.get('/', membersController.list);
router.post('/invite', manage, inviteLimiter, validateBody(inviteMemberSchema), membersController.invite);
router.post('/accept', validateBody(acceptInviteSchema), membersController.accept);
// Self-scope: invites addressed to the logged-in user's email (no permission gate)
router.get('/pending', membersController.listPending);
router.post('/pending/:id/accept', membersController.acceptPending);
router.delete('/pending/:id', membersController.declinePending);
router.patch('/:id', manage, validateBody(updateMemberSchema), membersController.update);
router.delete('/:id', manage, membersController.remove);

export default router;
