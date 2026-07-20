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

/** Names that can never be wedding slugs. A slug is both a first URL segment
 *  on fallback hosts (`/:slug`) and a subdomain on wildcard hosts
 *  (`{slug}.shaadi.diy`), so it must dodge two namespaces: top-level app
 *  routes / infrastructure paths, and infrastructure hostnames.
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
  // Subdomain-sensitive: these resolve to real infrastructure, or would once
  // someone points them there.
  'www',
  'app',
  'mail',
  'smtp',
  'ftp',
  'staging',
  'dev',
  'test',
  'cdn',
  'static',
  'status',
  'blog',
  'docs',
  'help',
  'support',
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
