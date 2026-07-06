import { Router } from 'express';
import { validateBody } from '../middleware/validate.middleware';
import {
  inviteMemberSchema,
  acceptInviteSchema,
  updateMemberRoleSchema,
} from '../validators/members.validator';
import * as membersController from '../controllers/members.controller';

const router = Router();

const { requireAdmin } = membersController;

router.get('/', membersController.list);
router.post('/invite', requireAdmin, validateBody(inviteMemberSchema), membersController.invite);
router.post('/accept', validateBody(acceptInviteSchema), membersController.accept);
router.patch('/:id', requireAdmin, validateBody(updateMemberRoleSchema), membersController.updateRole);
router.delete('/:id', requireAdmin, membersController.remove);

export default router;
