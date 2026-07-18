import type { Request, Response, NextFunction } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '../config/env';
import * as whatsappService from '../services/whatsapp.service';
import { getWeddingId } from '../shared/utils/auth.utils';

// --- Meta webhook (public) --------------------------------------------------

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
  // errors are logged inside handleWebhook, never surfaced.
  res.sendStatus(200);
  await whatsappService.handleWebhook(req.body);
};

// --- Admin (authenticated) --------------------------------------------------

export const getTemplates = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await whatsappService.getTemplates());
  } catch (error) {
    next(error);
  }
};

export const syncTemplates = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await whatsappService.syncTemplates());
  } catch (error) {
    next(error);
  }
};

export const sendCampaign = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await whatsappService.sendCampaign(getWeddingId(req), req.body));
  } catch (error) {
    next(error);
  }
};

export const sendPoll = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await whatsappService.sendPoll(getWeddingId(req), req.body));
  } catch (error) {
    next(error);
  }
};

export const getPolls = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await whatsappService.listPolls(getWeddingId(req)));
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await whatsappService.listMessages(getWeddingId(req)));
  } catch (error) {
    next(error);
  }
};
