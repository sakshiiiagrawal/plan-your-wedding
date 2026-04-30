import type { Request, Response, NextFunction } from 'express';
import { searchPlaces } from '../services/geocode.service';

export const search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const q = String(req.query.q ?? '').trim();
    if (!q || q.length < 2) {
      res.json({ results: [], provider: 'none' });
      return;
    }
    const data = await searchPlaces(q);
    res.json(data);
  } catch (error) {
    next(error);
  }
};
