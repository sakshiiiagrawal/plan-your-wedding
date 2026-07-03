import { Router } from 'express';
import { validateBody } from '../middleware/validate.middleware';
import {
  inviteMemberSchema,
  acceptInviteSchema,
  updateMemberRoleSchema,
} from '../validators/members.validator';
import * as membersController from '../controllers/members.controller';

const router = Router();

router.get('/', membersController.list);
router.post('/invite', validateBody(inviteMemberSchema), membersController.invite);
router.post('/accept', validateBody(acceptInviteSchema), membersController.accept);
router.patch('/:id', validateBody(updateMemberRoleSchema), membersController.updateRole);
router.delete('/:id', membersController.remove);

export default router;
