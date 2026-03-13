import type { Request, Response, NextFunction } from 'express';
import * as repo from '../repositories/weddings.repository';

export const getWeddingBySlug = async (
  req: Request<{ slug: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await repo.findBySlug(req.params.slug);
    if (!data) {
      res.json({ exists: false });
      return;
    }
    res.json({ exists: true, userId: data.id });
  } catch (error) {
    next(error);
  }
};
