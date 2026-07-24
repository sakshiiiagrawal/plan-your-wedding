/** SSR entry for the prerender step.
 *
 *  Built by `vite build --ssr` into `dist-ssr/entry-server.js`, then driven by
 *  `scripts/prerender-seo.mjs`, which asks for one page at a time and writes
 *  the result to `dist/<path>.html`. Nothing here runs in a browser.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import SeoLayout from './SeoLayout';
import { SEO_PAGES, findPage } from './registry';
import { renderJsonLd } from './schema';
import { DEFAULT_OG_IMAGE, absoluteUrl } from './site';

export interface RenderedPage {
  /** Contents for <head>, already escaped. */
  head: string;
  /** Contents for <body>. */
  body: string;
  /** Whether this page needs the interactive islands bundle inlined. */
  island: boolean;
}

/** Meta the prerender script needs without rendering anything. */
export const pages = SEO_PAGES.map((page) => ({
  path: page.path,
  title: page.title,
  lastmod: page.lastmod,
  priority: page.priority,
}));

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function meta(attr: 'name' | 'property', key: string, value: string): string {
  return `<meta ${attr}="${key}" content="${escapeAttr(value)}" />`;
}

export function render(path: string): RenderedPage {
  const page = findPage(path);
  if (!page) throw new Error(`No SEO page registered for path: ${path}`);

  const url = absoluteUrl(page.path);
  const Component = page.component;

  const body = renderToStaticMarkup(
    <SeoLayout crumbs={page.crumbs} ctaSource={page.ctaSource}>
      <Component />
    </SeoLayout>,
  );

  const head = [
    `<title>${escapeAttr(page.title)}</title>`,
    meta('name', 'description', page.description),
    `<link rel="canonical" href="${url}" />`,
    meta('property', 'og:type', page.path.startsWith('/guides/') ? 'article' : 'website'),
    meta('property', 'og:site_name', 'shaadi.diy'),
    meta('property', 'og:title', page.title),
    meta('property', 'og:description', page.description),
    meta('property', 'og:url', url),
    meta('property', 'og:image', DEFAULT_OG_IMAGE),
    meta('property', 'og:image:width', '1200'),
    meta('property', 'og:image:height', '630'),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', page.title),
    meta('name', 'twitter:description', page.description),
    meta('name', 'twitter:image', DEFAULT_OG_IMAGE),
    // JSON-LD is data, not markup: only `<` needs neutralising so a stray
    // "</script>" inside a string can never close the tag early.
    `<script type="application/ld+json">${renderJsonLd(page.jsonLd).replace(/</g, '\\u003c')}</script>`,
  ].join('\n    ');

  return { head, body, island: page.island ?? false };
}
