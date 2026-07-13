import type { Request } from 'express';
import { UnauthorizedError, ForbiddenError } from '../errors/HttpError';
import type { AuthenticatedUser } from '../../types/express';

export function getAuthUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new UnauthorizedError('Authentication required');
  return req.user;
}

/**
 * The active wedding id — the tenant key every wedding-scoped table filters on
 * (its column is still named user_id for historical reasons; values are
 * wedding ids). Accounts with no wedding yet must create or join one first.
 */
export function getWeddingId(req: Request): string {
  const weddingId = getAuthUser(req).weddingId;
  if (!weddingId) throw new ForbiddenError('No active wedding — create or join one first');
  return weddingId;
}

/** @deprecated transitional alias from the user==wedding era; use getWeddingId. */
export const getWeddingOwnerId = getWeddingId;
