import type { CopyMap } from '../types';

export const EDITORIAL_COPY = {
  'hero.kicker': 'Together with their families',
  'hero.rsvpCta': 'RSVP',
  'countdown.days': 'days',
  'countdown.hours': 'hrs',
  'countdown.minToGo': 'min to go',
  'story.heading': 'How we got here',
  'events.heading': 'The celebrations',
  'events.dressCode': 'Dress code:',
  'events.directions': 'Directions',
  'rsvp.heading': 'Will you join us?',
  'rsvp.subheading': 'Kindly respond so we can plan every detail around you.',
  'gallery.heading': 'In pictures',
} as const satisfies CopyMap;
