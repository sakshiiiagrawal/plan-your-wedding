import { RESERVED_WEDDING_SLUGS } from '@wedding-planner/shared';

/**
 * Host-scoped tenancy. A wedding lives at `{slug}.shaadi.diy` wherever we hold
 * a wildcard cert, and at `/{slug}` everywhere else — Vercel preview
 * deployments are `*.vercel.app`, which can't carry per-wedding subdomains.
 * Every "which wedding is this" and "what URL do I link to" question routes
 * through here so the two modes can't drift apart.
 */

const RESERVED = new Set<string>(RESERVED_WEDDING_SLUGS);

/** Roots we can serve wildcard subdomains under.
 *
 *  `localtest.me` is the dev equivalent of the production domain: its public
 *  DNS points every subdomain at 127.0.0.1, and because it's a real
 *  registrable domain `Domain=.localtest.me` is a valid cookie scope. Browse
 *  dev tenant mode at `{slug}.localtest.me:5173`.
 *
 *  Deliberately NOT `localhost`: browsers resolve `*.localhost` but treat
 *  `localhost` as a TLD and reject `Domain=localhost`, so the session cookie
 *  can't cross subdomains and every hop would land on a logged-out screen.
 *  Plain `localhost` therefore stays path-scoped — which also makes it the
 *  way to exercise the preview-deployment fallback locally. */
const WILDCARD_ROOTS = [
  // Production host-scoping is gated: `*.shaadi.diy` needs wildcard DNS *and*
  // a wildcard certificate. Generating subdomain links before the cert exists
  // points every QR code and shared link at a host that fails the TLS
  // handshake. Set VITE_TENANT_DOMAINS=1 once `vercel certs ls` shows the
  // wildcard — must be flipped together with the API's TENANT_DOMAINS_ENABLED.
  ...(import.meta.env.VITE_TENANT_DOMAINS === '1' ? ['shaadi.diy'] : []),
  'localtest.me',
];

function currentHostname(): string {
  return typeof window === 'undefined' ? '' : window.location.hostname;
}

/** The wildcard root `hostname` sits under, or null when this host is
 *  path-scoped (preview deployments, bare IPs). */
export function getRootDomain(hostname: string = currentHostname()): string | null {
  const host = hostname.toLowerCase();
  return WILDCARD_ROOTS.find((root) => host === root || host.endsWith(`.${root}`)) ?? null;
}

export function isWildcardHost(hostname: string = currentHostname()): boolean {
  return getRootDomain(hostname) !== null;
}

/** The wedding slug carried by the host itself, or null on apex/preview hosts
 *  (where the slug comes from the path instead). */
export function getTenantSlug(hostname: string = currentHostname()): string | null {
  const host = hostname.toLowerCase();
  const root = getRootDomain(host);
  if (!root || host === root) return null;

  const sub = host.slice(0, -(root.length + 1));
  // Only single-label subdomains are tenants — a wildcard cert doesn't cover
  // deeper names, and they're never links we generate.
  if (!sub || sub.includes('.')) return null;
  if (!/^[a-z0-9-]+$/.test(sub) || RESERVED.has(sub)) return null;
  return sub;
}

/** Resolved once: the host can't change without a full page load. */
export const TENANT_SLUG: string | null = getTenantSlug();

function portSuffix(): string {
  const port = typeof window === 'undefined' ? '' : window.location.port;
  return port ? `:${port}` : '';
}

export function isAbsoluteHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/**
 * Where a wedding destination lives. Absolute (cross-origin) when the wedding
 * has its own subdomain and we aren't already on it; relative otherwise, so
 * in-tenant navigation stays a client-side route change.
 */
export function weddingHref(slug: string, path = ''): string {
  if (TENANT_SLUG === slug) return path || '/';
  const root = getRootDomain();
  if (!root) return `/${slug}${path}`;
  return `${window.location.protocol}//${slug}.${root}${portSuffix()}${path}`;
}

/**
 * Go to a wedding destination. `navigate` handles the same-origin case;
 * crossing to a subdomain needs a real document load, which react-router
 * cannot do.
 */
export function goToWedding(
  slug: string,
  path: string,
  navigate: (to: string, options?: { replace?: boolean }) => void,
  options?: { replace?: boolean },
): void {
  const href = weddingHref(slug, path);
  if (!isAbsoluteHref(href)) {
    navigate(href, options);
    return;
  }
  if (options?.replace) window.location.replace(href);
  else window.location.assign(href);
}

/** The host actually serving marketing/account pages for a root. `shaadi.diy`
 *  308s to `www`, so link straight at `www`: leaving a wedding is already a
 *  cross-origin document load, and a redirect would make it two. */
const CANONICAL_APEX_HOST: Record<string, string> = {
  'shaadi.diy': 'www.shaadi.diy',
};

/**
 * An account or marketing destination (`/hub`, `/onboard`, `/forgot-password`)
 * — these live on the apex host only, so from a wedding subdomain they need an
 * absolute URL. Elsewhere the path is already right.
 */
export function apexHref(path: string): string {
  const root = getRootDomain();
  if (!root || !TENANT_SLUG) return path;
  const host = CANONICAL_APEX_HOST[root] ?? root;
  return `${window.location.protocol}//${host}${portSuffix()}${path}`;
}

/** A path within the *current* wedding, for links rendered inside its own
 *  pages — root-relative in tenant mode, slug-prefixed in fallback mode. */
export function weddingPath(slug: string, path = ''): string {
  return TENANT_SLUG ? path || '/' : `/${slug}${path}`;
}

/** The absolute, shareable URL of a public page — what goes into a QR code,
 *  a WhatsApp message, or the clipboard. */
export function publicSiteUrl(slug: string, pageSlug = ''): string {
  const path = pageSlug ? `/${pageSlug}` : '';
  const root = getRootDomain();
  if (!root) return `${window.location.origin}/${slug}${path}`;
  return `${window.location.protocol}//${slug}.${root}${portSuffix()}${path}`;
}

/** The same URL without the scheme, for display next to a copy button. */
export function publicSiteLabel(slug: string, pageSlug = ''): string {
  return publicSiteUrl(slug, pageSlug).replace(/^https?:\/\//i, '');
}
