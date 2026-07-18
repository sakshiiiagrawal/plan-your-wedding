import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.middleware';
import * as commsController from '../controllers/communications.controller';

const audienceFields = {
  guest_ids: z.array(z.string().uuid()).min(1).optional(),
  rsvp_filter: z.enum(['pending', 'confirmed', 'declined', 'tentative']).optional(),
  side: z.string().optional(),
};

export const sendCampaignSchema = z.object({
  channel: z.string().optional(),
  template_name: z.string().min(1),
  event_id: z.string().uuid().optional(),
  ...audienceFields,
});

export const sendPollSchema = z.object({
  channel: z.string().optional(),
  question: z.string().min(1).max(1000),
  options: z.array(z.string().min(1).max(100)).min(2).max(10),
  ...audienceFields,
});

export const sendTextSchema = z.object({
  channel: z.string().optional(),
  guest_id: z.string().uuid(),
  body: z.string().min(1).max(4096),
});

const router = Router();

router.get('/channels', commsController.getChannels);
router.get('/templates', commsController.getTemplates);
router.post('/templates/sync', commsController.syncTemplates);
router.post('/send', validateBody(sendCampaignSchema), commsController.sendCampaign);
router.post('/messages', validateBody(sendTextSchema), commsController.sendTextMessage);
router.get('/messages', commsController.getMessages);
router.get('/conversations', commsController.getConversations);
router.get('/conversations/:guestId/messages', commsController.getThread);
router.post('/conversations/:guestId/read', commsController.markConversationRead);
router.get('/reachability', commsController.getReachability);
router.post('/polls', validateBody(sendPollSchema), commsController.sendPoll);
router.get('/polls', commsController.getPolls);
router.delete('/polls/:id', commsController.deletePoll);

export default router;
