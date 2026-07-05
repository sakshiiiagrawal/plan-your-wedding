import type { CopyMap } from '../types';

export const ALBUM_COPY = {
  'hero.kicker': 'Together with their families',
  'hero.rsvpCta': 'RSVP',
  'hero.daysToGo': 'days to go',
  'story.heading': 'How we got here',
  'events.heading': 'The celebrations',
  'events.directions': 'Directions',
  'rsvp.heading': 'Will you join us?',
  'gallery.heading': 'In pictures',
} as const satisfies CopyMap;
