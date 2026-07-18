import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.middleware';
import * as whatsappController from '../controllers/whatsapp.controller';

const audienceFields = {
  guest_ids: z.array(z.string().uuid()).min(1).optional(),
  rsvp_filter: z.enum(['pending', 'confirmed', 'declined', 'tentative']).optional(),
  side: z.string().optional(),
};

export const sendCampaignSchema = z.object({
  template_name: z.string().min(1),
  event_id: z.string().uuid().optional(),
  ...audienceFields,
});

export const sendPollSchema = z.object({
  question: z.string().min(1).max(1000),
  options: z.array(z.string().min(1).max(100)).min(2).max(10),
  ...audienceFields,
});

const router = Router();

router.get('/templates', whatsappController.getTemplates);
router.post('/templates/sync', whatsappController.syncTemplates);
router.post('/send', validateBody(sendCampaignSchema), whatsappController.sendCampaign);
router.post('/polls', validateBody(sendPollSchema), whatsappController.sendPoll);
router.get('/polls', whatsappController.getPolls);
router.get('/messages', whatsappController.getMessages);

export default router;
