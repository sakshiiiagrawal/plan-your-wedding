import { getRootDomain } from './tenant';

/**
 * Session persistence. The token still lives in localStorage and still travels
 * as a Bearer header — nothing about server auth changes here. The addition is
 * a mirror cookie scoped to the parent domain: localStorage is per-origin, so
 * a session started on www.shaadi.diy simply doesn't exist on
 * ayush-sakshi.shaadi.diy. The cookie is the courier across that hop, with the
 * same JS-readable threat model as the localStorage copy it duplicates.
 */

const TOKEN_KEY = 'token';
const COOKIE_NAME = 'shaadi_token';
/** Tracks the API's JWT lifetime (auth.service.ts signs with 7d). */
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function cookieDomain(): string | null {
  const root = getRootDomain();
  // No shared parent (preview deployments) — nothing to bridge, and a cookie
  // scoped to the deployment host would buy nothing localStorage doesn't.
  if (!root) return null;
  return root === 'localhost' ? 'localhost' : `.${root}`;
}

function readCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function writeCookie(token: string): void {
  const domain = cookieDomain();
  if (!domain) return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  const attrs = `Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; Domain=${domain}; ${attrs}`;
  // Some browsers reject an explicit Domain on localhost. Fall back to a
  // host-only cookie so at least same-origin reloads keep working.
  if (!readCookie()) {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; ${attrs}`;
  }
}

function deleteCookie(): void {
  const domain = cookieDomain();
  const expire = 'Path=/; Max-Age=0; SameSite=Lax';
  if (domain) document.cookie = `${COOKIE_NAME}=; Domain=${domain}; ${expire}`;
  document.cookie = `${COOKIE_NAME}=; ${expire}`;
}

export function persistSession(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  writeCookie(token);
}

/** Drops everything a logged-in session owns, on this origin and its siblings. */
export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('user');
  localStorage.removeItem('slug');
  deleteCookie();
}

/** The active token, adopting the cross-origin cookie the first time this
 *  origin sees it. */
export function readToken(): string | null {
  const stored = localStorage.getItem(TOKEN_KEY);
  if (stored) return stored;
  const fromCookie = readCookie();
  if (fromCookie) localStorage.setItem(TOKEN_KEY, fromCookie);
  return fromCookie;
}
