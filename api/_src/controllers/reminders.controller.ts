import type { Request, Response, NextFunction } from 'express';
import { canAccessSection } from '../../../shared/src';
import { getAuthUser, getWeddingOwnerId } from '../shared/utils/auth.utils';
import { env } from '../config/env';
import * as service from '../services/reminders.service';

export const getFeed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = getAuthUser(req);
    // No requireSection mount — each half of the feed is gated here instead,
    // so a member without budget access never sees payment amounts.
    res.json(
      await service.buildFeed(getWeddingOwnerId(req), {
        includeTasks: canAccessSection(user, 'tasks'),
        includePayments: canAccessSection(user, 'budget'),
        paymentLeadDays: user.reminderPrefs?.payment_lead_days ?? 7,
      }),
    );
  } catch (e) {
    next(e);
  }
};

// Vercel Cron entry point — public path, guarded by CRON_SECRET instead of a
// user token. With no secret configured it always 401s (safe default).
export const runDailyDigest = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!env.CRON_SECRET || req.headers.authorization !== `Bearer ${env.CRON_SECRET}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    res.json(await service.sendDailyDigests());
  } catch (e) {
    next(e);
  }
};
