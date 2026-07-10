import type { Request, Response, NextFunction } from 'express';
import { can, canAccessSection, type MemberPermission, type WeddingSection } from '../../../shared/src';
import { getAuthUser } from '../shared/utils/auth.utils';
import { ForbiddenError } from '../shared/errors/HttpError';

/** Route/router decorator: 403 unless the caller's allowedSections cover `s`. */
export const requireSection =
  (s: WeddingSection) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!canAccessSection(getAuthUser(req), s)) {
      next(new ForbiddenError('You do not have access to this section'));
      return;
    }
    next();
  };

/** Route decorator: 403 unless the caller holds permission `p` (admins implicitly do). */
export const requirePermission =
  (p: MemberPermission) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!can(getAuthUser(req), p)) {
      next(new ForbiddenError('You do not have permission to do this'));
      return;
    }
    next();
  };
