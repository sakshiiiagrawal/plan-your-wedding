import type { CopyMap } from '../types';

export const INVITE_COPY = {
  'envelope.tapToOpen': 'Tap to open',
  'hero.kicker': 'Together with their families',
  'hero.and': 'and',
  'story.eyebrow': 'Our story',
  'countdown.kicker': 'The countdown begins',
  'countdown.days': 'Days',
  'countdown.hours': 'Hours',
  'countdown.minutes': 'Min',
  'countdown.seconds': 'Sec',
  'countdown.note': 'See you there!',
  'events.dressCode': 'Dress code ·',
  'events.onwards': 'onwards',
  'events.viewMap': 'View map',
  'gallery.heading': 'Moments',
  'rsvp.eyebrow': 'Kindly respond',
  'rsvp.heading': 'RSVP',
  'final.note': "We can't wait to celebrate with you",
  'final.website': 'Visit our wedding website',
} as const satisfies CopyMap;
