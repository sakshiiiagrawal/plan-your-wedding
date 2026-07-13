export type PublicPageKind = 'website' | 'invite';

/** URL segments that can never be page slugs — they collide with app routes.
 *  Shared so the Studio validates the same list the API enforces. */
export const RESERVED_PAGE_SLUGS = [
  'login',
  'dashboard',
  'rsvp',
  'api',
  'admin',
  'p',
  'onboard',
  'settings',
] as const;

/** First URL segments that can never be wedding slugs — top-level app routes
 *  (App.tsx) and infrastructure paths (Vercel rewrites, static assets) win
 *  over /:slug, so a wedding registered under one would be unreachable.
 *  Shared so onboarding validates the same list the API enforces. */
export const RESERVED_WEDDING_SLUGS = [
  'login',
  'logout',
  'onboard',
  'invites',
  'hub',
  'weddings',
  'accept-invite',
  'verify-email',
  'forgot-password',
  'reset-password',
  'dashboard',
  'settings',
  'rsvp',
  'admin',
  'api',
  'assets',
  'health',
  'p',
] as const;

export interface PublicPageRow {
  id: string;
  user_id: string;
  page_slug: string;
  kind: PublicPageKind;
  title: string;
  template: string;
  palette: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: Record<string, any>;
  is_published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/** Shape served to unauthenticated visitors (no ids/timestamps). */
export interface PublicPagePayload {
  page_slug: string;
  kind: PublicPageKind;
  title: string;
  template: string;
  palette: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: Record<string, any>;
}
