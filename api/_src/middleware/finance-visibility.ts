import type { Request, Response, NextFunction } from 'express';
import { financeTier } from '../../../shared/src';
import { getAuthUser } from '../shared/utils/auth.utils';

// Bride/groom liability split fields — hidden from tier 'money' and below.
const SPLIT_KEYS = new Set([
  'side',
  'bride_share_percentage',
  'paid_by_side',
  'paid_bride_share_percentage',
  'extra_side',
  'extra_bride_share_percentage',
  'brideContribution',
  'groomContribution',
  'bride_side_contribution',
  'groom_side_contribution',
  'is_shared',
  'shared_share_percentage',
  'bride_share_amount',
  'groom_share_amount',
]);

// Money fields of any kind — hidden entirely from tier 'none'.
const MONEY_KEYS = new Set([
  'finance',
  'finance_summary',
  'total_cost',
  'committed_amount',
  'paid_amount',
  'outstanding_amount',
  'scheduled_amount',
]);

/**
 * Deep-deletes keys by name from any plain object/array, recursively. Cheap
 * key-name strip rather than per-shape response mappers — audited: no
 * non-finance field reuses these names on the routers this is mounted on
 * (guest `side` lives under /guests, which never mounts this middleware).
 */
function deepStrip<T>(value: T, keys: Set<string>): T {
  if (Array.isArray(value)) {
    return value.map((v) => deepStrip(v, keys)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (keys.has(k)) continue;
      out[k] = deepStrip(v, keys);
    }
    return out as T;
  }
  return value;
}

/**
 * Server-side truth for finance visibility tiers. Mounted after
 * requireSection on /expense, /vendors, /venues:
 * - full  → pass through untouched.
 * - money → strip bride/groom split fields from request body and response.
 * - none  → strip split fields AND all money fields from both (unreachable
 *   for /expense, since requireSection('budget') blocks tier 'none' first).
 */
export function applyFinanceTier(req: Request, res: Response, next: NextFunction): void {
  const tier = financeTier(getAuthUser(req));
  if (tier === 'full') {
    next();
    return;
  }

  const keys = tier === 'none' ? new Set([...SPLIT_KEYS, ...MONEY_KEYS]) : SPLIT_KEYS;

  if (req.body && typeof req.body === 'object') {
    req.body = deepStrip(req.body, keys);
  }

  const originalJson = res.json.bind(res);
  res.json = ((payload: unknown) => originalJson(deepStrip(payload, keys))) as typeof res.json;

  next();
}
