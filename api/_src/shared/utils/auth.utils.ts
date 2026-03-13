import type { Request } from 'express';
import { UnauthorizedError } from '../errors/HttpError';
import type { AuthenticatedUser } from '../../types/express';

export function getAuthUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new UnauthorizedError('Authentication required');
  return req.user;
}

export function getWeddingOwnerId(req: Request): string {
  const user = getAuthUser(req);
  return user.role === 'admin' ? user.id : (user.created_by ?? user.id);
}
