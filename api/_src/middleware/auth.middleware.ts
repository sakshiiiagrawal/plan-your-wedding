import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/database';
import { env } from '../config/env';
import type { AuthenticatedUser } from '../types/express';

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

    // Users default to their own wedding. A collaborator can switch into a
    // wedding they're an active member of (see setActiveWedding); that choice is
    // stored in active_owner_id. Re-validate the membership every request so a
    // revoked invite silently drops them back to their own wedding.
    if (user.active_owner_id && user.active_owner_id !== user.id) {
      const { data: membership } = await supabase
        .from('wedding_members')
        .select('role, allowed_sections, owner:users!owner_id(slug, currency)')
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
        // Admins always get every section, whatever the row says
        allowedSections =
          role === 'admin' ? null : ((membership.allowed_sections as string[] | null) ?? null);
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
    };
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
