import type { CopyMap } from '../types';

export const JOURNEY_COPY = {
  'hero.kicker': 'Our journey together',
  'hero.coverTitle': 'The story of',
  'hero.beginsOn': 'The next chapter begins',
  'chapter.label': 'Chapter',
  'story.title': 'We met',
  'events.directions': 'Directions',
  'rsvp.heading': 'The next chapter starts with you',
  'rsvp.subheading': 'Write yourself into the story — tell us you are coming.',
  'footer.note': '…and they lived happily ever after.',
} as const satisfies CopyMap;
