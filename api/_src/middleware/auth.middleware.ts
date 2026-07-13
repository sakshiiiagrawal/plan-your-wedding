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
      .select('id, email, name, email_verified, active_wedding_id, password_changed_at, reminder_prefs')
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

    // Resolve the active wedding: everything the user owns plus every wedding
    // they're an active member of, then pick active_wedding_id if it still
    // matches (re-validated every request so a revoked membership drops
    // instantly), else the oldest owned wedding, else the first membership.
    interface WeddingRow {
      id: string;
      slug: string | null;
      title: string;
      currency: string | null;
    }
    interface MembershipRow {
      wedding_id: string | null;
      role: AuthenticatedUser['role'];
      allowed_sections: string[] | null;
      permissions: string[] | null;
      wedding: WeddingRow | null;
    }
    const [ownedRes, membershipRes] = await Promise.all([
      supabase
        .from('weddings')
        .select('id, slug, title, currency')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('wedding_members')
        .select(
          'wedding_id, role, allowed_sections, permissions, wedding:weddings!wedding_id(id, slug, title, currency)',
        )
        .eq('member_id', user.id)
        .eq('status', 'active'),
    ]);
    const owned = (ownedRes.data ?? []) as WeddingRow[];
    const memberships = ((membershipRes.data ?? []) as unknown as MembershipRow[]).filter(
      (m) => m.wedding !== null,
    );

    let weddingId: string | null = null;
    let weddingTitle: string | null = null;
    let isOwner = false;
    let slug: string | null = null;
    let currency = 'INR';
    let role: AuthenticatedUser['role'] = 'admin';
    let allowedSections: string[] | null = null;
    let permissions: string[] = [];

    const applyOwned = (w: WeddingRow) => {
      weddingId = w.id;
      weddingTitle = w.title;
      isOwner = true;
      slug = w.slug;
      currency = w.currency ?? 'INR';
      role = 'admin';
      allowedSections = null;
      permissions = [];
    };
    const applyMembership = (m: MembershipRow) => {
      const w = m.wedding as WeddingRow;
      weddingId = w.id;
      weddingTitle = w.title;
      isOwner = false;
      slug = w.slug;
      currency = w.currency ?? 'INR';
      role = m.role;
      // Admins always get every section/permission, whatever the row says
      allowedSections = role === 'admin' ? null : (m.allowed_sections ?? null);
      permissions = role === 'admin' ? [] : (m.permissions ?? []);
    };

    const target = user.active_wedding_id as string | null;
    const targetOwned = target ? owned.find((w) => w.id === target) : undefined;
    const targetMembership = target
      ? memberships.find((m) => m.wedding_id === target)
      : undefined;
    if (targetOwned) applyOwned(targetOwned);
    else if (targetMembership) applyMembership(targetMembership);
    else if (owned.length > 0) applyOwned(owned[0]!);
    else if (memberships.length > 0) applyMembership(memberships[0]!);
    // else: no wedding at all — weddingId stays null; wedding-scoped routes
    // reject via getWeddingId, account routes (/auth/*, invites) still work.

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      weddingId,
      weddingTitle,
      isOwner,
      slug,
      emailVerified: user.email_verified ?? false,
      currency,
      role,
      allowedSections,
      permissions,
      reminderPrefs: user.reminder_prefs ?? null,
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
