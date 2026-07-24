import type { PageKind } from './types';

/**
 * Pure, dependency-free description of every public-site template: what it is
 * called, what it is for, and which palettes suit it.
 *
 * This lives apart from `registry.ts` because `registry.ts` also carries each
 * template's lazy component import, which transitively pulls in framer-motion
 * and three.js. The prerendered SEO pages (`src/seo/`) need the names and
 * taglines and nothing else, and they are rendered with `react-dom/server` —
 * so they import this file and stay light.
 *
 * `registry.ts` spreads these entries, so the copy is written once.
 */
export interface TemplateMeta {
  id: string;
  kind: PageKind;
  name: string;
  tagline: string;
  defaultPaletteId: string;
  recommendedPaletteIds: string[];
}

export const TEMPLATE_META: Record<string, TemplateMeta> = {
  classic: {
    id: 'classic',
    kind: 'website',
    name: 'Royal Heritage',
    tagline: 'Regal gradients, ornate script — the original look',
    defaultPaletteId: 'royal',
    recommendedPaletteIds: ['royal', 'desert', 'mandala', 'heirloom'],
  },
  editorial: {
    id: 'editorial',
    kind: 'website',
    name: 'Modern Editorial',
    tagline: 'Airy serif typography, quiet color, magazine layout',
    defaultPaletteId: 'porcelain',
    recommendedPaletteIds: ['porcelain', 'sage', 'noir', 'regal-teal'],
  },
  botanical: {
    id: 'botanical',
    kind: 'website',
    name: 'Garden Romance',
    tagline: 'Soft pastels, arches, and a gentle storybook feel',
    defaultPaletteId: 'blush',
    recommendedPaletteIds: ['blush', 'lavender', 'meadow', 'rosewood'],
  },
  midnight: {
    id: 'midnight',
    kind: 'website',
    name: 'Midnight Luxe',
    tagline: 'Cinematic dark canvas with gilded typography',
    defaultPaletteId: 'onyx',
    recommendedPaletteIds: ['onyx', 'emerald', 'bordeaux', 'mandala'],
  },
  invite: {
    id: 'invite',
    kind: 'invite',
    name: 'Luxury Invite',
    tagline: 'Tap-to-open envelope, full-screen photo slides, shimmer gold',
    defaultPaletteId: 'heirloom',
    recommendedPaletteIds: ['heirloom', 'rosewood', 'regal-teal', 'royal'],
  },
  journey: {
    id: 'journey',
    kind: 'website',
    name: 'Our Journey',
    tagline: 'A vertical scrollytelling timeline of your story',
    defaultPaletteId: 'sage',
    recommendedPaletteIds: ['sage', 'meadow', 'porcelain', 'lavender'],
  },
  fiesta: {
    id: 'fiesta',
    kind: 'website',
    name: 'Shaadi Fiesta',
    tagline: 'Vibrant festival colors, garlands, and a confetti welcome',
    defaultPaletteId: 'desert',
    recommendedPaletteIds: ['desert', 'royal', 'mandala', 'rosewood'],
  },
  reel: {
    id: 'reel',
    kind: 'invite',
    name: 'Photo Reel',
    tagline: 'Swipe-through photo story with music, no intro needed',
    defaultPaletteId: 'emerald',
    recommendedPaletteIds: ['emerald', 'onyx', 'bordeaux', 'regal-teal'],
  },
  boarding: {
    id: 'boarding',
    kind: 'invite',
    name: 'Boarding Pass',
    tagline: 'A tear-to-open travel ticket with itinerary-style events',
    defaultPaletteId: 'regal-teal',
    recommendedPaletteIds: ['regal-teal', 'onyx', 'noir', 'emerald'],
  },
  card: {
    id: 'card',
    kind: 'invite',
    name: 'Note Card',
    tagline: 'A single elegant screen — quickest for guests to open',
    defaultPaletteId: 'rosewood',
    recommendedPaletteIds: ['rosewood', 'blush', 'heirloom', 'lavender'],
  },
};

export const TEMPLATE_META_LIST: TemplateMeta[] = Object.values(TEMPLATE_META);

export function templateMetaForKind(kind: PageKind): TemplateMeta[] {
  return TEMPLATE_META_LIST.filter((t) => t.kind === kind);
}
