import type { Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '../config/env';
import { whatsappProvider } from '../services/communications/whatsapp/provider';

// Meta webhook (public). The path /api/v1/public/whatsapp/webhook is
// registered with Meta — it must never move, whatever the admin API is called.

export const verifyWebhook = (req: Request, res: Response): void => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  if (mode === 'subscribe' && token && token === env.WHATSAPP_VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
    return;
  }
  res.sendStatus(403);
};

export const receiveWebhook = async (req: Request, res: Response): Promise<void> => {
  // Enforce Meta's payload signature when the app secret is configured
  if (env.WHATSAPP_APP_SECRET) {
    const raw = (req as Request & { rawBody?: Buffer }).rawBody;
    const header = req.get('x-hub-signature-256') ?? '';
    const expected =
      'sha256=' + createHmac('sha256', env.WHATSAPP_APP_SECRET).update(raw ?? '').digest('hex');
    const a = Buffer.from(header);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      res.sendStatus(403);
      return;
    }
  }
  // Always 200 fast — Meta disables webhooks that keep failing. Processing
  // errors are logged inside handleInbound, never surfaced.
  res.sendStatus(200);
  await whatsappProvider.handleInbound(req.body);
};
