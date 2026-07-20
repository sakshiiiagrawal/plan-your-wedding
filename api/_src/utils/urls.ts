import { env } from '../config/env';

/**
 * Wedding sites are host-scoped: `https://{slug}.shaadi.diy`. FRONTEND_URL
 * names the apex (marketing + account pages), so every public link is that
 * host with the slug prefixed as a subdomain.
 */

const FALLBACK_ORIGIN = 'https://shaadi.diy';

function apexOrigin(): URL {
  try {
    return new URL(env.FRONTEND_URL ?? FALLBACK_ORIGIN);
  } catch {
    return new URL(FALLBACK_ORIGIN);
  }
}

/** The domain weddings hang off as subdomains. www.shaadi.diy and shaadi.diy
 *  are the same site, so the registrable domain is the root either way. */
export function rootDomain(): string {
  return apexOrigin()
    .hostname.replace(/^www\./i, '')
    .toLowerCase();
}

/**
 * Whether weddings are addressed by host yet. Host-scoping only works once
 * `*.{root}` has both wildcard DNS *and* a wildcard certificate — a subdomain
 * link generated before the cert exists fails the TLS handshake outright, so
 * every QR code and WhatsApp link would point at a dead host. Off = the
 * pre-existing path-scoped URLs, which always work.
 */
export function tenantDomainsEnabled(): boolean {
  return env.TENANT_DOMAINS_ENABLED === '1';
}

/** The absolute URL of a wedding's public page (or any path under it). */
export function publicSiteUrl(slug: string, path = ''): string {
  const apex = apexOrigin();
  const port = apex.port ? `:${apex.port}` : '';
  if (!tenantDomainsEnabled()) {
    return `${apex.protocol}//${apex.hostname}${port}/${slug}${path}`;
  }
  return `${apex.protocol}//${slug}.${rootDomain()}${port}${path}`;
}

function bareHost(host: string | undefined): string {
  return (host ?? '').toLowerCase().split(':')[0] ?? '';
}

/** The wedding named by the request's Host header, or null when the request
 *  came to the apex or to a host without wildcard DNS (preview deployments). */
export function tenantSlugFromHost(host: string | undefined): string | null {
  if (!tenantDomainsEnabled()) return null;
  const name = bareHost(host);
  const root = rootDomain();
  if (!name.endsWith(`.${root}`)) return null;
  const sub = name.slice(0, -(root.length + 1));
  if (!sub || sub.includes('.') || sub === 'www') return null;
  return /^[a-z0-9-]+$/.test(sub) ? sub : null;
}

/** True for shaadi.diy / www.shaadi.diy — the hosts where a legacy `/{slug}`
 *  URL should be redirected to the wedding's own subdomain. */
export function isApexHost(host: string | undefined): boolean {
  const name = bareHost(host);
  const root = rootDomain();
  return name === root || name === `www.${root}`;
}
