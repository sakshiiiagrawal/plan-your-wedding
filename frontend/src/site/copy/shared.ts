import type { CopyMap } from './types';
import { makeEditable } from './useCopy';

/** Strings shared by every template (RSVP form, countdown labels, event link
 *  labels). Overrides on `shared:*` keys follow the couple across templates. */
export const SHARED_COPY = {
  'rsvp.fullName': 'Full Name (as on your invitation) *',
  'rsvp.namePlaceholder': 'Your name',
  'rsvp.attend': 'Will you attend? *',
  'rsvp.accept': 'Joyfully accept',
  'rsvp.decline': 'Regretfully decline',
  'rsvp.guests': 'Number of Guests (including you)',
  'rsvp.message': 'Message (Optional)',
  'rsvp.messagePlaceholder': 'Any special message or requirements...',
  'rsvp.submit': 'Submit RSVP',
  'rsvp.thanksTitle': 'Thank you!',
  'rsvp.thanksBody': "Your RSVP has been recorded. We can't wait to celebrate with you.",
  'countdown.days': 'Days',
  'countdown.hours': 'Hours',
  'countdown.minutes': 'Minutes',
  'countdown.seconds': 'Seconds',
  'events.addToCalendar': 'Add to calendar',
  'events.directions': 'Get directions',
  'events.dressCode': 'Dress Code:',
} as const satisfies CopyMap;

export const { E: SharedE, useT: useSharedT } = makeEditable('shared', SHARED_COPY);
