import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

// These routes sit behind verifyToken, so the user id is the natural key —
// one abuser can't bomb inboxes by rotating IPs, and NAT'd users don't share
// a bucket. IP is only the fallback for the (unreachable) unauthed case.
// NOTE: the default in-memory store is per serverless instance; counters are
// a soft limit until a shared store (Upstash/Redis) is wired in.
const userKey = (req: Request): string => req.user?.id ?? ipKeyGenerator(req.ip ?? '');

/** Cooldown for verification-email resends (one inbox, any logged-in user). */
export const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 1,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKey,
  message: { error: 'A verification email was just sent. Please wait a minute and try again.' },
});

/** Cap on invite emails (sent to arbitrary addresses, admin-gated only). */
export const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKey,
  message: { error: 'Too many invites sent. Please try again in a few minutes.' },
});

/** Brute-force protection for credential endpoints. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
});

/** Abuse protection for the unauthenticated public RSVP endpoint. */
export const publicRsvpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many RSVP attempts. Please try again in a few minutes.' },
});
