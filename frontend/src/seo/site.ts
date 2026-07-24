/** Constants shared by every prerendered SEO page.
 *
 *  These pages are rendered to static HTML at build time (see
 *  `scripts/prerender-seo.mjs`), so nothing here may touch the browser,
 *  the router, or auth — it all runs inside `react-dom/server`.
 */

export const SITE_URL = 'https://www.shaadi.diy';

export const absoluteUrl = (path: string): string =>
  path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`;

/** Default social card. The marketing shell already ships this image. */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-card.jpg`;

/** Signup destination every page funnels into. The `?src=` tag lets us
 *  separate organic-landing signups from direct ones in Mixpanel. */
export const signupUrl = (source: string): string => `/onboard?src=${source}`;

/** Top navigation shown on every SEO page — the cluster pillars. */
export const SEO_NAV: { label: string; href: string }[] = [
  { label: 'Planning app', href: '/wedding-planning-app' },
  { label: 'Guest list', href: '/wedding-guest-list-manager' },
  { label: 'Budget', href: '/wedding-budget-planner' },
  { label: 'Wedding website', href: '/wedding-website' },
  { label: 'Guides', href: '/guides/how-to-plan-an-indian-wedding' },
];

/** Footer hub. Every published SEO page is reachable from here, which is
 *  how crawlers find pages that no other page happens to link to. */
export const SEO_FOOTER: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Plan with shaadi.diy',
    links: [
      { label: 'Wedding planning app', href: '/wedding-planning-app' },
      { label: 'Guest list manager', href: '/wedding-guest-list-manager' },
      { label: 'Wedding budget planner', href: '/wedding-budget-planner' },
      { label: 'WhatsApp wedding invitations', href: '/whatsapp-wedding-invitation' },
      { label: 'Free wedding website', href: '/wedding-website' },
    ],
  },
  {
    title: 'Free tools',
    links: [
      { label: 'Wedding budget calculator', href: '/tools/wedding-budget-calculator' },
      { label: 'Wedding hashtag generator', href: '/tools/wedding-hashtag-generator' },
    ],
  },
  {
    title: 'Guides',
    links: [
      { label: 'How to plan an Indian wedding', href: '/guides/how-to-plan-an-indian-wedding' },
      { label: 'Indian wedding checklist', href: '/guides/indian-wedding-checklist' },
      {
        label: 'How much an Indian wedding costs',
        href: '/guides/how-much-does-an-indian-wedding-cost',
      },
      {
        label: 'Send invitations on WhatsApp',
        href: '/guides/how-to-send-wedding-invitations-on-whatsapp',
      },
    ],
  },
];
