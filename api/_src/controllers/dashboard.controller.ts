import type { Request, Response, NextFunction } from 'express';
import { getWeddingOwnerId } from '../shared/utils/auth.utils';
import * as service from '../services/dashboard.service';

export const getCountdown = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getCountdown(getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(await service.getStats(getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const getSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getSummary(getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};
