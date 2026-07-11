import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/database';
import { env } from '../config/env';
import type { AuthenticatedUser } from '../types/express';

// Resolving req.user costs 1-2 DB round-trips (users + optional wedding_members)
// on EVERY request. A single dashboard page fires ~8 concurrent requests with
// the same token — without this each pays that ~185ms lookup, and navigating
// between pages re-pays it. Cache the resolved user keyed by the exact token.
// jwt.verify still runs on every request (cheap, no DB) so signature/expiry are
// always enforced; the short TTL bounds how long a password change or revoked
// membership takes to kick in.
// ponytail: plain Map + TTL + size cap; swap for an LRU only if the live-token
// working set ever outgrows the cap.
const AUTH_CACHE_TTL_MS = 10_000;
const authCache = new Map<string, { user: AuthenticatedUser; exp: number }>();

function getCachedUser(token: string): AuthenticatedUser | null {
  const hit = authCache.get(token);
  if (!hit) return null;
  if (hit.exp < Date.now()) {
    authCache.delete(token);
    return null;
  }
  return hit.user;
}

function setCachedUser(token: string, user: AuthenticatedUser): void {
  if (authCache.size > 5000) authCache.clear();
  authCache.set(token, { user, exp: Date.now() + AUTH_CACHE_TTL_MS });
}

// Switching the active wedding / accepting an invite / password change alters a
// user's resolved scope. Tokens aren't reachable from those service functions,
// so clear the whole cache — these events are rare and the map is small.
export function invalidateAuthCache(): void {
  authCache.clear();
}

export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: string;
      email: string;
      iat?: number;
    };

    const cached = getCachedUser(token);
    if (cached) {
      req.user = cached;
      next();
      return;
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, slug, email_verified, currency, active_owner_id, password_changed_at')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      res.status(401).json({ error: 'User not found or has been deleted' });
      return;
    }

    // Tokens issued before the last password change/reset are dead — that's
    // the only way to cut off a stolen session on a 7-day JWT. iat is in whole
    // seconds, so compare at second granularity (a token minted in the same
    // second as the change must stay valid).
    if (
      user.password_changed_at &&
      decoded.iat !== undefined &&
      decoded.iat < Math.floor(new Date(user.password_changed_at).getTime() / 1000)
    ) {
      res.status(401).json({ error: 'Session expired. Please log in again.' });
      return;
    }

    let ownerId = user.id;
    let slug = user.slug;
    let currency = user.currency ?? 'INR';
    let role: AuthenticatedUser['role'] = 'admin';
    let allowedSections: string[] | null = null;
    let permissions: string[] = [];

    // Users default to their own wedding. A collaborator can switch into a
    // wedding they're an active member of (see setActiveWedding); that choice is
    // stored in active_owner_id. Re-validate the membership every request so a
    // revoked invite silently drops them back to their own wedding.
    if (user.active_owner_id && user.active_owner_id !== user.id) {
      const { data: membership } = await supabase
        .from('wedding_members')
        .select('role, allowed_sections, permissions, owner:users!owner_id(slug, currency)')
        .eq('member_id', user.id)
        .eq('owner_id', user.active_owner_id)
        .eq('status', 'active')
        .maybeSingle();

      if (membership) {
        const owner = membership.owner as unknown as {
          slug: string | null;
          currency: string | null;
        } | null;
        ownerId = user.active_owner_id;
        role = membership.role as AuthenticatedUser['role'];
        // Admins always get every section/permission, whatever the row says
        allowedSections =
          role === 'admin' ? null : ((membership.allowed_sections as string[] | null) ?? null);
        permissions = role === 'admin' ? [] : ((membership.permissions as string[] | null) ?? []);
        slug = owner?.slug ?? null;
        currency = owner?.currency ?? 'INR';
      }
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      ownerId,
      slug,
      emailVerified: user.email_verified ?? false,
      currency,
      role,
      allowedSections,
      permissions,
    };
    setCachedUser(token, req.user);
    next();
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError')
    ) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
    next(error);
  }
};
