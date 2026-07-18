import type { Request, Response, NextFunction } from 'express';
import * as comms from '../services/communications';
import { getWeddingId } from '../shared/utils/auth.utils';

const channelOf = (req: Request): string | undefined =>
  typeof req.query.channel === 'string' ? req.query.channel : undefined;

export const getChannels = (_req: Request, res: Response): void => {
  res.json(comms.listChannels());
};

export const getTemplates = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await comms.getTemplates(channelOf(req)));
  } catch (error) {
    next(error);
  }
};

export const syncTemplates = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await comms.syncTemplates(channelOf(req)));
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
    res.json(await comms.sendCampaign(getWeddingId(req), req.body));
  } catch (error) {
    next(error);
  }
};

export const sendTextMessage = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await comms.sendTextMessage(getWeddingId(req), req.body));
  } catch (error) {
    next(error);
  }
};

export const getConversations = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await comms.listConversations(getWeddingId(req), channelOf(req)));
  } catch (error) {
    next(error);
  }
};

export const getThread = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(
      await comms.getThread(getWeddingId(req), req.params.guestId as string, channelOf(req)),
    );
  } catch (error) {
    next(error);
  }
};

export const markConversationRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await comms.markConversationRead(
      getWeddingId(req),
      req.params.guestId as string,
      channelOf(req),
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};

export const getReachability = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const raw = typeof req.query.guest_ids === 'string' ? req.query.guest_ids : '';
    const guestIds = raw.split(',').filter(Boolean);
    res.json(await comms.getReachability(getWeddingId(req), guestIds, channelOf(req)));
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
    res.json(await comms.sendPoll(getWeddingId(req), req.body));
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
    res.json(await comms.listPolls(getWeddingId(req)));
  } catch (error) {
    next(error);
  }
};

export const deletePoll = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await comms.deletePoll(getWeddingId(req), req.params.id as string);
    res.sendStatus(204);
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
    res.json(await comms.listMessages(getWeddingId(req)));
  } catch (error) {
    next(error);
  }
};
