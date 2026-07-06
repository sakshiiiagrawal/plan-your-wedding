import type { CopyMap } from '../types';

export const BOARDING_COPY = {
  'envelope.title': 'Boarding Pass',
  'envelope.tear': 'TEAR HERE',
  'envelope.tapToTear': 'Tap to tear open',
  'hero.passLabel': 'Boarding Pass',
  'hero.seat': 'Seat 4EVER',
  'hero.departs': 'Departs',
  'story.eyebrow': 'Flight log',
  'countdown.kicker': 'Time to departure',
  'countdown.days': 'Days',
  'countdown.hours': 'Hrs',
  'countdown.minutes': 'Min',
  'events.heading': 'Itinerary',
  'events.leg': 'Leg',
  'events.directions': 'Directions',
  'rsvp.eyebrow': 'Confirm your seat',
  'rsvp.heading': 'RSVP',
  'final.note': 'Bon voyage to forever',
  'final.website': 'Visit our wedding website',
} as const satisfies CopyMap;
