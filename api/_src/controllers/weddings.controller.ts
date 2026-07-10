import type { Request, Response, NextFunction } from 'express';
import * as repo from '../repositories/weddings.repository';

export const getWeddingBySlug = async (
  req: Request<{ slug: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await repo.findBySlug(req.params.slug);
    // Existence is all the public callers (SlugGuard, onboarding availability
    // check) need — the owner's UUID stays private.
    res.json({ exists: Boolean(data) });
  } catch (error) {
    next(error);
  }
};
