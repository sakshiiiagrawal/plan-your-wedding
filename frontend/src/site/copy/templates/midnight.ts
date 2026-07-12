import type { CopyMap } from '../types';

export const MIDNIGHT_COPY = {
  'hero.kicker': 'Save the date',
  'hero.rsvpCta': 'RSVP',
  'countdown.days': 'Days',
  'countdown.hours': 'Hours',
  'countdown.minutes': 'Min',
  'countdown.seconds': 'Sec',
  'events.dressCode': 'Dress code —',
  'events.directions': 'Directions',
  'story.heading': 'Our Story',
  'events.heading': 'The Evening Programme',
  'gallery.heading': 'Under the Same Sky',
  'rsvp.subheading': 'The honour of your presence is requested',
  'footer.note': 'Written in the stars',
} as const satisfies CopyMap;
