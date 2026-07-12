import { lazy } from 'react';
import type { PageKind, TemplateDefinition, TemplatePart } from './types';
import { BOTANICAL_EFFECTS, CLASSIC_EFFECTS } from './effects/schema';

export { getPalette, PALETTES, DEFAULT_PALETTE_ID } from './palettes';

const HERO_PART: TemplatePart = { id: 'hero', label: 'Hero / Names', positionless: true };

const WEBSITE_PARTS: TemplatePart[] = [
  HERO_PART,
  { id: 'story', label: 'Our Story' },
  { id: 'events', label: 'Events' },
  { id: 'rsvp', label: 'RSVP' },
  { id: 'gallery', label: 'Gallery' },
];

const INVITE_PARTS: TemplatePart[] = [
  HERO_PART,
  { id: 'envelope', label: 'Envelope intro', overlay: true },
  { id: 'story', label: 'Our Story' },
  { id: 'countdown', label: 'Countdown' },
  { id: 'events', label: 'Event slides' },
  { id: 'gallery', label: 'Photo reel' },
  { id: 'rsvp', label: 'RSVP' },
  { id: 'final', label: 'Closing slide' },
];

// ---------------------------------------------------------------------------
// Registry — each template is its own lazy chunk so a guest downloads only
// the design the couple picked. A template is a *layout built for a purpose*
// (kind); colors come from the shared palette catalog.
// ---------------------------------------------------------------------------

export const TEMPLATES: Record<string, TemplateDefinition> = {
  classic: {
    id: 'classic',
    kind: 'website',
    name: 'Royal Heritage',
    tagline: 'Regal gradients, ornate script — the original look',
    parts: WEBSITE_PARTS,
    defaultPaletteId: 'royal',
    recommendedPaletteIds: ['royal', 'desert', 'mandala', 'heirloom'],
    effectControls: CLASSIC_EFFECTS,
    component: lazy(() => import('./templates/Classic')),
  },
  editorial: {
    id: 'editorial',
    kind: 'website',
    name: 'Modern Editorial',
    tagline: 'Airy serif typography, quiet color, magazine layout',
    parts: WEBSITE_PARTS,
    defaultPaletteId: 'porcelain',
    recommendedPaletteIds: ['porcelain', 'sage', 'noir', 'regal-teal'],
    component: lazy(() => import('./templates/Editorial')),
  },
  botanical: {
    id: 'botanical',
    kind: 'website',
    name: 'Garden Romance',
    tagline: 'Soft pastels, arches, and a gentle storybook feel',
    parts: WEBSITE_PARTS,
    defaultPaletteId: 'blush',
    recommendedPaletteIds: ['blush', 'lavender', 'meadow', 'rosewood'],
    effectControls: BOTANICAL_EFFECTS,
    component: lazy(() => import('./templates/Botanical')),
  },
  midnight: {
    id: 'midnight',
    kind: 'website',
    name: 'Midnight Luxe',
    tagline: 'Cinematic dark canvas with gilded typography',
    parts: WEBSITE_PARTS,
    defaultPaletteId: 'onyx',
    recommendedPaletteIds: ['onyx', 'emerald', 'bordeaux', 'mandala'],
    component: lazy(() => import('./templates/Midnight')),
  },
  invite: {
    id: 'invite',
    kind: 'invite',
    name: 'Luxury Invite',
    tagline: 'Tap-to-open envelope, full-screen photo slides, shimmer gold',
    parts: INVITE_PARTS,
    defaultPaletteId: 'heirloom',
    recommendedPaletteIds: ['heirloom', 'rosewood', 'regal-teal', 'royal'],
    component: lazy(() => import('./templates/Invite')),
  },
  journey: {
    id: 'journey',
    kind: 'website',
    name: 'Our Journey',
    tagline: 'A vertical scrollytelling timeline of your story',
    parts: [
      HERO_PART,
      { id: 'story', label: 'Our Story' },
      { id: 'events', label: 'Events' },
      { id: 'gallery', label: 'Gallery', positionless: true },
      { id: 'rsvp', label: 'RSVP' },
    ],
    defaultPaletteId: 'sage',
    recommendedPaletteIds: ['sage', 'meadow', 'porcelain', 'lavender'],
    component: lazy(() => import('./templates/Journey')),
  },
  fiesta: {
    id: 'fiesta',
    kind: 'website',
    name: 'Shaadi Fiesta',
    tagline: 'Vibrant festival colors, garlands, and a confetti welcome',
    parts: [
      HERO_PART,
      { id: 'countdown', label: 'Countdown' },
      { id: 'story', label: 'Our Story' },
      { id: 'events', label: 'Events' },
      { id: 'gallery', label: 'Gallery' },
      { id: 'rsvp', label: 'RSVP' },
    ],
    defaultPaletteId: 'desert',
    recommendedPaletteIds: ['desert', 'royal', 'mandala', 'rosewood'],
    component: lazy(() => import('./templates/Fiesta')),
  },
  reel: {
    id: 'reel',
    kind: 'invite',
    name: 'Photo Reel',
    tagline: 'Swipe-through photo story with music, no intro needed',
    parts: [
      HERO_PART,
      { id: 'story', label: 'Our Story' },
      { id: 'countdown', label: 'Countdown' },
      { id: 'events', label: 'Event slides' },
      { id: 'gallery', label: 'Photo reel' },
      { id: 'rsvp', label: 'RSVP' },
      { id: 'final', label: 'Closing slide' },
    ],
    defaultPaletteId: 'emerald',
    recommendedPaletteIds: ['emerald', 'onyx', 'bordeaux', 'regal-teal'],
    component: lazy(() => import('./templates/Reel')),
  },
  boarding: {
    id: 'boarding',
    kind: 'invite',
    name: 'Boarding Pass',
    tagline: 'A tear-to-open travel ticket with itinerary-style events',
    parts: [
      HERO_PART,
      { id: 'envelope', label: 'Ticket tear', overlay: true },
      { id: 'story', label: 'Our Story' },
      { id: 'countdown', label: 'Countdown' },
      { id: 'events', label: 'Itinerary' },
      { id: 'rsvp', label: 'RSVP' },
      { id: 'final', label: 'Closing slide' },
    ],
    defaultPaletteId: 'regal-teal',
    recommendedPaletteIds: ['regal-teal', 'onyx', 'noir', 'emerald'],
    component: lazy(() => import('./templates/Boarding')),
  },
  card: {
    id: 'card',
    kind: 'invite',
    name: 'Note Card',
    tagline: 'A single elegant screen — quickest for guests to open',
    parts: [
      HERO_PART,
      { id: 'story', label: 'Our Story' },
      { id: 'countdown', label: 'Countdown' },
      { id: 'events', label: 'Events' },
      { id: 'rsvp', label: 'RSVP' },
    ],
    defaultPaletteId: 'rosewood',
    recommendedPaletteIds: ['rosewood', 'blush', 'heirloom', 'lavender'],
    component: lazy(() => import('./templates/NoteCard')),
  },
};

export const DEFAULT_TEMPLATE_ID: Record<PageKind, string> = {
  website: 'classic',
  invite: 'invite',
};

export function templatesForKind(kind: PageKind): TemplateDefinition[] {
  return Object.values(TEMPLATES).filter((t) => t.kind === kind);
}

export function getTemplate(
  id: string | undefined | null,
  kind: PageKind = 'website',
): TemplateDefinition {
  const template = id ? TEMPLATES[id] : undefined;
  if (template && template.kind === kind) return template;
  return TEMPLATES[DEFAULT_TEMPLATE_ID[kind]]!;
}
