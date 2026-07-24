import { lazy } from 'react';
import { TEMPLATE_META } from './templateMeta';
import type { PageKind, TemplateDefinition, TemplatePart } from './types';
import {
  BOARDING_EFFECTS,
  BOTANICAL_EFFECTS,
  CARD_EFFECTS,
  CLASSIC_EFFECTS,
  EDITORIAL_EFFECTS,
  FIESTA_EFFECTS,
  INVITE_EFFECTS,
  JOURNEY_EFFECTS,
  MIDNIGHT_EFFECTS,
  REEL_EFFECTS,
} from './effects/schema';

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
    ...TEMPLATE_META.classic!,
    parts: WEBSITE_PARTS,
    effectControls: CLASSIC_EFFECTS,
    supportsGalleryLayout: true,
    component: lazy(() => import('./templates/Classic')),
  },
  editorial: {
    ...TEMPLATE_META.editorial!,
    parts: WEBSITE_PARTS,
    effectControls: EDITORIAL_EFFECTS,
    component: lazy(() => import('./templates/Editorial')),
  },
  botanical: {
    ...TEMPLATE_META.botanical!,
    parts: WEBSITE_PARTS,
    effectControls: BOTANICAL_EFFECTS,
    component: lazy(() => import('./templates/Botanical')),
  },
  midnight: {
    ...TEMPLATE_META.midnight!,
    parts: WEBSITE_PARTS,
    effectControls: MIDNIGHT_EFFECTS,
    component: lazy(() => import('./templates/Midnight')),
  },
  invite: {
    ...TEMPLATE_META.invite!,
    parts: INVITE_PARTS,
    effectControls: INVITE_EFFECTS,
    component: lazy(() => import('./templates/Invite')),
  },
  journey: {
    ...TEMPLATE_META.journey!,
    parts: [
      HERO_PART,
      { id: 'story', label: 'Our Story' },
      { id: 'events', label: 'Events' },
      { id: 'gallery', label: 'Gallery', positionless: true },
      { id: 'rsvp', label: 'RSVP' },
    ],
    effectControls: JOURNEY_EFFECTS,
    component: lazy(() => import('./templates/Journey')),
  },
  fiesta: {
    ...TEMPLATE_META.fiesta!,
    parts: [
      HERO_PART,
      { id: 'countdown', label: 'Countdown' },
      { id: 'story', label: 'Our Story' },
      { id: 'events', label: 'Events' },
      { id: 'gallery', label: 'Gallery' },
      { id: 'rsvp', label: 'RSVP' },
    ],
    effectControls: FIESTA_EFFECTS,
    component: lazy(() => import('./templates/Fiesta')),
  },
  reel: {
    ...TEMPLATE_META.reel!,
    parts: [
      HERO_PART,
      { id: 'story', label: 'Our Story' },
      { id: 'countdown', label: 'Countdown' },
      { id: 'events', label: 'Event slides' },
      { id: 'gallery', label: 'Photo reel' },
      { id: 'rsvp', label: 'RSVP' },
      { id: 'final', label: 'Closing slide' },
    ],
    effectControls: REEL_EFFECTS,
    component: lazy(() => import('./templates/Reel')),
  },
  boarding: {
    ...TEMPLATE_META.boarding!,
    parts: [
      HERO_PART,
      { id: 'envelope', label: 'Ticket tear', overlay: true },
      { id: 'story', label: 'Our Story' },
      { id: 'countdown', label: 'Countdown' },
      { id: 'events', label: 'Itinerary' },
      { id: 'rsvp', label: 'RSVP' },
      { id: 'final', label: 'Closing slide' },
    ],
    effectControls: BOARDING_EFFECTS,
    component: lazy(() => import('./templates/Boarding')),
  },
  card: {
    ...TEMPLATE_META.card!,
    parts: [
      HERO_PART,
      { id: 'story', label: 'Our Story' },
      { id: 'countdown', label: 'Countdown' },
      { id: 'events', label: 'Events' },
      { id: 'rsvp', label: 'RSVP' },
    ],
    effectControls: CARD_EFFECTS,
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
