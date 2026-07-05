import { SHARED_COPY } from './shared';
import type { CopyMap } from './types';
import { ALBUM_COPY } from './templates/album';
import { BOARDING_COPY } from './templates/boarding';
import { BOTANICAL_COPY } from './templates/botanical';
import { CARD_COPY } from './templates/card';
import { CLASSIC_COPY } from './templates/classic';
import { EDITORIAL_COPY } from './templates/editorial';
import { FIESTA_COPY } from './templates/fiesta';
import { INVITE_COPY } from './templates/invite';
import { JOURNEY_COPY } from './templates/journey';
import { MATINEE_COPY } from './templates/matinee';
import { MIDNIGHT_COPY } from './templates/midnight';
import { MONOGRAM_COPY } from './templates/monogram';
import { POLAROID_COPY } from './templates/polaroid';
import { REEL_COPY } from './templates/reel';
import { SCROLL_COPY } from './templates/scroll';

/** Every template's copy catalog, keyed by template id (= key namespace).
 *  The studio uses it to label overrides and detect "back to default". */
export const COPY_BY_TEMPLATE: Record<string, CopyMap> = {
  album: ALBUM_COPY,
  boarding: BOARDING_COPY,
  botanical: BOTANICAL_COPY,
  card: CARD_COPY,
  classic: CLASSIC_COPY,
  editorial: EDITORIAL_COPY,
  fiesta: FIESTA_COPY,
  invite: INVITE_COPY,
  journey: JOURNEY_COPY,
  matinee: MATINEE_COPY,
  midnight: MIDNIGHT_COPY,
  monogram: MONOGRAM_COPY,
  polaroid: POLAROID_COPY,
  reel: REEL_COPY,
  scroll: SCROLL_COPY,
};

/** Default text for a fully-qualified override key ("classic:story.heading"). */
export function defaultForKey(fullKey: string): string | undefined {
  const sep = fullKey.indexOf(':');
  if (sep === -1) return undefined;
  const ns = fullKey.slice(0, sep);
  const key = fullKey.slice(sep + 1);
  return ns === 'shared' ? SHARED_COPY[key as keyof typeof SHARED_COPY] : COPY_BY_TEMPLATE[ns]?.[key];
}
