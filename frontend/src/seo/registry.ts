/** Single source of truth for the prerendered SEO pages.
 *
 *  Adding an entry here is all it takes: `scripts/prerender-seo.mjs` renders
 *  it to `dist/<path>.html` and adds it to `dist/sitemap.xml`. Nothing else
 *  needs updating except the footer hub in `site.ts`, which is what makes the
 *  page reachable by a crawler that never sees the sitemap.
 */

import type { ComponentType } from 'react';

import BudgetPlanner, { faqs as budgetPlannerFaqs } from './pages/BudgetPlanner';
import BudgetCalculator, { faqs as budgetCalculatorFaqs } from './pages/BudgetCalculator';
import GuideChecklist, * as checklist from './pages/GuideChecklist';
import GuidePlanIndianWedding, * as planGuide from './pages/GuidePlanIndianWedding';
import GuideWeddingCost, * as costGuide from './pages/GuideWeddingCost';
import GuideWhatsappInvitations, * as whatsappGuide from './pages/GuideWhatsappInvitations';
import GuestListManager, { faqs as guestListFaqs } from './pages/GuestListManager';
import HashtagGenerator, { faqs as hashtagFaqs } from './pages/HashtagGenerator';
import WeddingPlanningApp, { faqs as planningAppFaqs } from './pages/WeddingPlanningApp';
import WeddingWebsite, { faqs as weddingWebsiteFaqs } from './pages/WeddingWebsite';
import WhatsappInvitation, * as whatsappLanding from './pages/WhatsappInvitation';

import {
  articleSchema,
  breadcrumbSchema,
  faqSchema,
  howToSchema,
  softwareApplicationSchema,
  type Crumb,
  type JsonLd,
} from './schema';

export interface SeoPageEntry {
  /** Absolute site path, no trailing slash. Also the output file path. */
  path: string;
  /** ≤ 60 characters, keyword first, brand suffix. */
  title: string;
  /** ≤ 155 characters, benefit plus a soft call to action. */
  description: string;
  crumbs: Crumb[];
  /** Tags the page's signup CTAs so organic conversions are attributable. */
  ctaSource: string;
  component: ComponentType;
  jsonLd: JsonLd[];
  /** Page has an interactive widget, so the islands bundle gets inlined. */
  island?: boolean;
  lastmod: string;
  priority: number;
}

const home: Crumb = { name: 'Home', path: '/' };

/** Breadcrumbs stay two levels while the section hubs (/guides, /tools) do not
 *  exist yet — a crumb pointing at a 404 is worse than no crumb. */
const crumbs = (name: string, path: string): Crumb[] => [home, { name, path }];

const TODAY = '2026-07-24';

export const SEO_PAGES: SeoPageEntry[] = [
  /* ── Landing pages ────────────────────────────────────────────────────── */
  {
    path: '/wedding-planning-app',
    title: 'Wedding Planning App for Indian Weddings | shaadi.diy',
    description:
      'Free wedding planning app for Indian weddings: guest lists, WhatsApp RSVPs, rupee budgets, vendors, rooms and a wedding website. Start free.',
    crumbs: crumbs('Wedding planning app', '/wedding-planning-app'),
    ctaSource: 'wedding-planning-app',
    component: WeddingPlanningApp,
    lastmod: TODAY,
    priority: 0.9,
    jsonLd: [
      softwareApplicationSchema({
        name: 'shaadi.diy wedding planning app',
        description:
          'Plan an Indian wedding in one shared workspace: guest lists and WhatsApp RSVPs, budgets and vendor payments, guest accommodation, events, tasks and a wedding website.',
        path: '/wedding-planning-app',
      }),
      faqSchema(planningAppFaqs),
      breadcrumbSchema(crumbs('Wedding planning app', '/wedding-planning-app')),
    ],
  },
  {
    path: '/wedding-guest-list-manager',
    title: 'Wedding Guest List Manager (Free) | shaadi.diy',
    description:
      'Track households, bride and groom sides, per-event invitations and RSVPs in one free guest list manager. Import from Excel, export clean counts.',
    crumbs: crumbs('Guest list manager', '/wedding-guest-list-manager'),
    ctaSource: 'guest-list-manager',
    component: GuestListManager,
    lastmod: TODAY,
    priority: 0.9,
    jsonLd: [
      softwareApplicationSchema({
        name: 'shaadi.diy wedding guest list manager',
        description:
          'A free wedding guest list manager with households, bride and groom sides, per-event invitations, meal preferences, RSVP tracking and Excel import and export.',
        path: '/wedding-guest-list-manager',
      }),
      faqSchema(guestListFaqs),
      breadcrumbSchema(crumbs('Guest list manager', '/wedding-guest-list-manager')),
    ],
  },
  {
    path: '/wedding-budget-planner',
    title: 'Wedding Budget Planner in ₹ (Free) | shaadi.diy',
    description:
      'Set category budgets in rupees and track allocated, paid and outstanding per vendor. A free wedding budget planner built for Indian weddings.',
    crumbs: crumbs('Wedding budget planner', '/wedding-budget-planner'),
    ctaSource: 'budget-planner',
    component: BudgetPlanner,
    lastmod: TODAY,
    priority: 0.9,
    jsonLd: [
      softwareApplicationSchema({
        name: 'shaadi.diy wedding budget planner',
        description:
          'A free wedding budget planner that keeps budgeted, allocated, paid and outstanding as four separate figures per category and per vendor, in rupees.',
        path: '/wedding-budget-planner',
      }),
      faqSchema(budgetPlannerFaqs),
      breadcrumbSchema(crumbs('Wedding budget planner', '/wedding-budget-planner')),
    ],
  },
  {
    path: '/whatsapp-wedding-invitation',
    title: 'WhatsApp Wedding Invitation & RSVP | shaadi.diy',
    description:
      'Send wedding invitations on WhatsApp and let the replies update your guest list — attendance, headcount and meal preference. Free to use.',
    crumbs: crumbs('WhatsApp invitations', '/whatsapp-wedding-invitation'),
    ctaSource: 'whatsapp-invitation',
    component: WhatsappInvitation,
    lastmod: TODAY,
    priority: 0.9,
    jsonLd: [
      softwareApplicationSchema({
        name: 'shaadi.diy WhatsApp wedding invitations',
        description:
          'Send wedding invitations over WhatsApp per event and capture attendance, headcount and meal preference directly on the guest record.',
        path: '/whatsapp-wedding-invitation',
      }),
      howToSchema({
        name: 'How to send wedding invitations on WhatsApp',
        description:
          'Build the guest list, publish a wedding website, connect a WhatsApp Business number, get the invitation template approved, send in segments and let replies update the guest list.',
        steps: whatsappLanding.howToSteps,
      }),
      faqSchema(whatsappLanding.faqs),
      breadcrumbSchema(crumbs('WhatsApp invitations', '/whatsapp-wedding-invitation')),
    ],
  },
  {
    path: '/wedding-website',
    title: 'Free Wedding Website — 10 Templates | shaadi.diy',
    description:
      'Build a free wedding website with 10 templates, your own address, an RSVP form wired to your guest list, a photo gallery and a QR code for cards.',
    crumbs: crumbs('Wedding website', '/wedding-website'),
    ctaSource: 'wedding-website',
    component: WeddingWebsite,
    lastmod: TODAY,
    priority: 0.9,
    jsonLd: [
      softwareApplicationSchema({
        name: 'shaadi.diy wedding website builder',
        description:
          'A free wedding website builder with ten templates, colour palettes, an RSVP form that writes into your guest list, event details, a photo gallery and a QR code.',
        path: '/wedding-website',
      }),
      faqSchema(weddingWebsiteFaqs),
      breadcrumbSchema(crumbs('Wedding website', '/wedding-website')),
    ],
  },

  /* ── Free tools ───────────────────────────────────────────────────────── */
  {
    path: '/tools/wedding-budget-calculator',
    title: 'Wedding Budget Calculator (India, ₹) | shaadi.diy',
    description:
      'Split a rupee wedding budget across venue, catering, decor and more. Edit every percentage and check the implied cost per plate. Free, no sign-up.',
    crumbs: crumbs('Wedding budget calculator', '/tools/wedding-budget-calculator'),
    ctaSource: 'budget-calculator',
    component: BudgetCalculator,
    island: true,
    lastmod: TODAY,
    priority: 0.8,
    jsonLd: [
      softwareApplicationSchema({
        name: 'Wedding budget calculator',
        description:
          'A free wedding budget calculator for Indian weddings: enter a total, a guest count and a city type to get an editable category split in rupees and an implied cost per plate.',
        path: '/tools/wedding-budget-calculator',
      }),
      faqSchema(budgetCalculatorFaqs),
      breadcrumbSchema(crumbs('Wedding budget calculator', '/tools/wedding-budget-calculator')),
    ],
  },
  {
    path: '/tools/wedding-hashtag-generator',
    title: 'Wedding Hashtag Generator (Free) | shaadi.diy',
    description:
      'Enter both names and get wedding hashtag ideas — blends, classics and Hinglish options you can tap to copy. Free, no sign-up, no email.',
    crumbs: crumbs('Wedding hashtag generator', '/tools/wedding-hashtag-generator'),
    ctaSource: 'hashtag-generator',
    component: HashtagGenerator,
    island: true,
    lastmod: TODAY,
    priority: 0.8,
    jsonLd: [
      softwareApplicationSchema({
        name: 'Wedding hashtag generator',
        description:
          'A free wedding hashtag generator: enter both names, an optional surname and year, and get name blends, classic formats and Hinglish options to copy.',
        path: '/tools/wedding-hashtag-generator',
      }),
      faqSchema(hashtagFaqs),
      breadcrumbSchema(crumbs('Wedding hashtag generator', '/tools/wedding-hashtag-generator')),
    ],
  },

  /* ── Guides ───────────────────────────────────────────────────────────── */
  {
    path: '/guides/how-to-plan-an-indian-wedding',
    title: 'How to Plan an Indian Wedding: Full Guide | shaadi.diy',
    description:
      'The order Indian wedding decisions have to happen in — budget, guest count, date, venue, vendors, invitations, accommodation and the final month.',
    crumbs: crumbs('How to plan an Indian wedding', '/guides/how-to-plan-an-indian-wedding'),
    ctaSource: 'guide-plan-indian-wedding',
    component: GuidePlanIndianWedding,
    lastmod: planGuide.MODIFIED_ISO,
    priority: 0.9,
    jsonLd: [
      articleSchema({
        headline: 'How to plan an Indian wedding',
        description:
          'A step-by-step Indian wedding planning guide: the three decisions that come first, the order to book vendors in, invitations and RSVPs, guest accommodation, and a workable timeline.',
        path: '/guides/how-to-plan-an-indian-wedding',
        datePublished: planGuide.PUBLISHED_ISO,
        dateModified: planGuide.MODIFIED_ISO,
      }),
      howToSchema({
        name: 'How to plan an Indian wedding',
        description:
          'Agree the budget, fix the guest count, choose the date and functions, book the venue, book catering, photography and decor, send invitations, arrange accommodation and confirm final numbers.',
        steps: planGuide.howToSteps,
      }),
      faqSchema(planGuide.faqs),
      breadcrumbSchema(
        crumbs('How to plan an Indian wedding', '/guides/how-to-plan-an-indian-wedding'),
      ),
    ],
  },
  {
    path: '/guides/indian-wedding-checklist',
    title: 'Indian Wedding Checklist (12 Months) | shaadi.diy',
    description:
      'Every wedding task in order, from twelve months out to the week after. Tick items off as you go, or share the whole list with your family.',
    crumbs: crumbs('Indian wedding checklist', '/guides/indian-wedding-checklist'),
    ctaSource: 'guide-checklist',
    component: GuideChecklist,
    lastmod: checklist.MODIFIED_ISO,
    priority: 0.9,
    jsonLd: [
      articleSchema({
        headline: 'Indian wedding checklist',
        description:
          'A phase-by-phase Indian wedding checklist from twelve months before the wedding to the week after, ordered by what blocks what.',
        path: '/guides/indian-wedding-checklist',
        datePublished: checklist.PUBLISHED_ISO,
        dateModified: checklist.MODIFIED_ISO,
      }),
      howToSchema({
        name: 'Indian wedding checklist',
        description:
          'The eight phases of planning an Indian wedding, from budget and venue at twelve months to returns and photos after the wedding.',
        steps: checklist.howToSteps,
      }),
      faqSchema(checklist.faqs),
      breadcrumbSchema(crumbs('Indian wedding checklist', '/guides/indian-wedding-checklist')),
    ],
  },
  {
    path: '/guides/how-much-does-an-indian-wedding-cost',
    title: 'How Much Does an Indian Wedding Cost? | shaadi.diy',
    description:
      'Estimate an Indian wedding per guest, not as a lump sum. Planning bands by city and scale, where the money goes, and what actually reduces the total.',
    crumbs: crumbs(
      'How much does an Indian wedding cost?',
      '/guides/how-much-does-an-indian-wedding-cost',
    ),
    ctaSource: 'guide-wedding-cost',
    component: GuideWeddingCost,
    lastmod: costGuide.MODIFIED_ISO,
    priority: 0.9,
    jsonLd: [
      articleSchema({
        headline: 'How much does an Indian wedding cost?',
        description:
          'Per-guest planning bands for Indian wedding costs by city and scale, a breakdown of where the money goes, the costs people forget, and the three levers that actually change the total.',
        path: '/guides/how-much-does-an-indian-wedding-cost',
        datePublished: costGuide.PUBLISHED_ISO,
        dateModified: costGuide.MODIFIED_ISO,
      }),
      faqSchema(costGuide.faqs),
      breadcrumbSchema(
        crumbs(
          'How much does an Indian wedding cost?',
          '/guides/how-much-does-an-indian-wedding-cost',
        ),
      ),
    ],
  },
  {
    path: '/guides/how-to-send-wedding-invitations-on-whatsapp',
    title: 'Send Wedding Invitations on WhatsApp | shaadi.diy',
    description:
      'The two WhatsApp rules that catch weddings out, invitation wording you can copy, and how to turn replies into a headcount instead of a chat thread.',
    crumbs: crumbs(
      'Wedding invitations on WhatsApp',
      '/guides/how-to-send-wedding-invitations-on-whatsapp',
    ),
    ctaSource: 'guide-whatsapp-invitations',
    component: GuideWhatsappInvitations,
    lastmod: whatsappGuide.MODIFIED_ISO,
    priority: 0.9,
    jsonLd: [
      articleSchema({
        headline: 'How to send wedding invitations on WhatsApp',
        description:
          'How WhatsApp template approval and the 24-hour window shape a wedding invitation send, wording samples to copy, and how to turn replies into a per-event headcount.',
        path: '/guides/how-to-send-wedding-invitations-on-whatsapp',
        datePublished: whatsappGuide.PUBLISHED_ISO,
        dateModified: whatsappGuide.MODIFIED_ISO,
      }),
      howToSchema({
        name: 'How to send wedding invitations on WhatsApp',
        description:
          'Collect numbers, publish the wedding website, choose how to send, get the template approved, send in segments, route replies into the guest list and follow up on the silence.',
        steps: whatsappGuide.howToSteps,
      }),
      faqSchema(whatsappGuide.faqs),
      breadcrumbSchema(
        crumbs(
          'Wedding invitations on WhatsApp',
          '/guides/how-to-send-wedding-invitations-on-whatsapp',
        ),
      ),
    ],
  },
];

export function findPage(path: string): SeoPageEntry | undefined {
  return SEO_PAGES.find((page) => page.path === path);
}
