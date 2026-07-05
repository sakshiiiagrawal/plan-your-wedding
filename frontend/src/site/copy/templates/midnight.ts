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
  'rsvp.subheading': 'The honour of your presence is requested',
} as const satisfies CopyMap;
