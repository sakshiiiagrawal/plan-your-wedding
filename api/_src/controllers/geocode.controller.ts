import type { Request, Response, NextFunction } from 'express';
import { searchPlaces, getGooglePlaceDetails } from '../services/geocode.service';
import { BadRequestError } from '../shared/errors/HttpError';

export const search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const q = String(req.query.q ?? '').trim();
    if (!q || q.length < 2) {
      res.json({ results: [], provider: 'none' });
      return;
    }
    const session = req.query.session ? String(req.query.session) : undefined;
    const data = await searchPlaces(q, session);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const details = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const placeId = String(req.query.place_id ?? '').trim();
    if (!placeId) throw new BadRequestError('place_id is required');
    const session = req.query.session ? String(req.query.session) : undefined;
    const data = await getGooglePlaceDetails(placeId, session);
    res.json(data);
  } catch (error) {
    next(error);
  }
};
