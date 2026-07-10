import type { Request, Response, NextFunction } from 'express';
import { financeTier } from '../../../shared/src';
import { getAuthUser, getWeddingOwnerId } from '../shared/utils/auth.utils';
import * as service from '../services/dashboard.service';

export const getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const includeExpense = financeTier(getAuthUser(req)) !== 'none';
    res.json(await service.getStats(getWeddingOwnerId(req), includeExpense));
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

export const getRecentActivity = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getRecentActivity(getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};
