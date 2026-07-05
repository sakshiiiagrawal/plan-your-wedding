import type { CopyMap } from '../types';

export const MATINEE_COPY = {
  'hero.kicker': 'Now Showing',
  'hero.starring': 'Starring the two of us',
  'hero.rsvpCta': 'RSVP',
  'events.admitOne': 'Admit One',
  'events.calendar': 'Calendar',
  'events.directions': 'Directions',
  'rsvp.heading': 'Reserve your seat',
} as const satisfies CopyMap;
