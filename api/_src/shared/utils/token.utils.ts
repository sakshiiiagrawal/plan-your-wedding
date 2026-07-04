import { createHash } from 'crypto';

/**
 * SHA-256 hex digest used to store and compare single-use tokens (member
 * invites, email verification, password reset) without persisting the raw
 * token. Shared so every token flow hashes identically.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
