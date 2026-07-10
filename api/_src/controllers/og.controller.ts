import type { NextFunction, Request, Response } from 'express';
import * as contentRepo from '../repositories/website-content.repository';
import * as pagesRepo from '../repositories/pages.repository';

/**
 * WhatsApp / social link previews for the public pages.
 *
 * On Vercel, /{slug} and /{slug}/{pageSlug} rewrite to this Express app
 * (real files like /index.html and /assets/* are served from the filesystem
 * first, so only virtual page URLs land here). We fetch the built SPA shell
 * and inject per-wedding OpenGraph tags before </head> — bots get a rich
 * card, humans get the same HTML and the SPA boots normally.
 */

// First URL segments that are app routes, never wedding slugs
const RESERVED_SEGMENTS = new Set([
  'api',
  'assets',
  'login',
  'onboard',
  'invites',
  'forgot-password',
  'reset-password',
  'accept-invite',
  'verify-email',
  'index.html',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
]);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let shellCache: { html: string; fetchedAt: number } | null = null;

async function getShell(host: string): Promise<string | null> {
  if (shellCache && Date.now() - shellCache.fetchedAt < 5 * 60 * 1000) return shellCache.html;
  try {
    const res = await fetch(`https://${host}/index.html`);
    if (!res.ok) return null;
    const html = await res.text();
    shellCache = { html, fetchedAt: Date.now() };
    return html;
  } catch {
    return null;
  }
}

function sendShell(res: Response, html: string): void {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(html);
}

export const serveWithOgTags = async (
  req: Request<{ slug: string; pageSlug?: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { slug, pageSlug } = req.params;
  // Only meaningful on the deployed host, where Vercel rewrites page URLs
  // here and the built shell exists; in dev, Vite serves these paths itself.
  if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') return next();
  if (!slug) return next();

  try {
    const host = req.headers.host;
    if (!host) return next();

    const shell = await getShell(host);
    if (!shell) return next();

    // App routes (/login, /onboard, /:slug/dashboard, unknown slugs…) get the
    // plain shell — the SPA router takes over exactly as it did pre-rewrite.
    if (RESERVED_SEGMENTS.has(slug)) return sendShell(res, shell);

    const ownerId = await contentRepo.findOwnerBySlug(slug);
    if (!ownerId) return sendShell(res, shell);

     
    const hero = ((await contentRepo.findSectionContent('hero', ownerId)) ??
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {}) as Record<string, any>;
     
    const gallery = ((await contentRepo.findSectionContent('gallery', ownerId)) ??
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {}) as Record<string, any>;
    const pages = await pagesRepo.findPublishedByOwner(ownerId);
    const page = pages.find((p) => p.page_slug === (pageSlug ?? ''));
    // /:slug/dashboard, /:slug/login, an unknown page, or a page that isn't
    // published: plain shell, SPA routes/renders it (no OG leak).
    if (!page) return sendShell(res, shell);

    const couple =
      hero.bride_name && hero.groom_name
        ? `${hero.bride_name} & ${hero.groom_name}`
        : 'A wedding celebration';
    const title =
      page?.kind === 'invite' ? `You're invited — ${couple}` : `${couple} — Wedding`;
    const dateText = hero.wedding_date
      ? new Date(`${hero.wedding_date}T00:00:00`).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '';
    const description =
      hero.tagline || (dateText ? `Join us on ${dateText}` : 'Save the date and RSVP online');
    const image: string | undefined = gallery.images?.[0]?.url;
    const pageUrl = `https://${host}/${slug}${pageSlug ? `/${pageSlug}` : ''}`;

    const tags = [
      `<meta property="og:type" content="website" />`,
      `<meta property="og:title" content="${escapeHtml(title)}" />`,
      `<meta property="og:description" content="${escapeHtml(description)}" />`,
      `<meta property="og:url" content="${escapeHtml(pageUrl)}" />`,
      image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : '',
      `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
      `<title>${escapeHtml(title)}</title>`,
    ]
      .filter(Boolean)
      .join('\n    ');

    sendShell(res, shell.replace('</head>', `    ${tags}\n  </head>`));
  } catch {
    next();
  }
};
