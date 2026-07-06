import type { CopyMap } from '../types';

export const CLASSIC_COPY = {
  'hero.kicker': "We're getting married!",
  'hero.rsvpCta': 'RSVP Now',
  'nav.rsvp': 'RSVP',
  'story.heading': 'Our Love Story',
  'story.brideRole': 'The Bride',
  'story.groomRole': 'The Groom',
  'events.heading': 'Wedding Events',
  'rsvp.heading': 'RSVP',
  'rsvp.subheading': 'We would be honored by your presence',
  'gallery.heading': 'Gallery',
  'footer.invite': 'View our invitation',
  'footer.note': 'Made with love for our special day',
} as const satisfies CopyMap;
