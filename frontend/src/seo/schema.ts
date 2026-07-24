/** JSON-LD builders.
 *
 *  These extend the brand `Organization` + `WebSite` graph that already ships
 *  in `frontend/index.html`, referencing it by @id rather than restating it.
 *
 *  Deliberately absent: `AggregateRating` and `Review`. We have no verifiable
 *  reviews, and inventing them violates Google's structured-data policy.
 */

import { absoluteUrl, SITE_URL } from './site';

const ORG_ID = `${SITE_URL}/#org`;

export type JsonLd = Record<string, unknown>;

export interface FaqItem {
  q: string;
  a: string;
}

export interface HowToStep {
  name: string;
  text: string;
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbSchema(crumbs: Crumb[]): JsonLd {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

/** Landing and tool pages. `price: "0"` is truthful — the planner is free. */
export function softwareApplicationSchema(opts: {
  name: string;
  description: string;
  path: string;
}): JsonLd {
  return {
    '@type': 'SoftwareApplication',
    name: opts.name,
    url: absoluteUrl(opts.path),
    description: opts.description,
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web',
    publisher: { '@id': ORG_ID },
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  };
}

export function articleSchema(opts: {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified: string;
}): JsonLd {
  return {
    '@type': 'Article',
    headline: opts.headline,
    description: opts.description,
    mainEntityOfPage: absoluteUrl(opts.path),
    datePublished: opts.datePublished,
    dateModified: opts.dateModified,
    // The guides are written and maintained by the team that builds the app,
    // not by a named freelancer, so the byline on the page and the author here
    // are both the organisation. Claiming a person who does not exist would be
    // the kind of thing this whole content standard exists to prevent.
    author: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
  };
}

/** Byline text, kept next to the schema so the two never disagree. */
export const GUIDE_AUTHOR = 'the shaadi.diy team';

export function faqSchema(items: FaqItem[]): JsonLd {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

export function howToSchema(opts: {
  name: string;
  description: string;
  steps: HowToStep[];
}): JsonLd {
  return {
    '@type': 'HowTo',
    name: opts.name,
    description: opts.description,
    step: opts.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

/** Wraps the per-page nodes into one @graph blob for the document head. */
export function renderJsonLd(nodes: JsonLd[]): string {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes });
}
