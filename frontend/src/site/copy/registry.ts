import { SHARED_COPY } from './shared';
import type { CopyMap } from './types';
import { BOARDING_COPY } from './templates/boarding';
import { BOTANICAL_COPY } from './templates/botanical';
import { CARD_COPY } from './templates/card';
import { CLASSIC_COPY } from './templates/classic';
import { EDITORIAL_COPY } from './templates/editorial';
import { FIESTA_COPY } from './templates/fiesta';
import { INVITE_COPY } from './templates/invite';
import { JOURNEY_COPY } from './templates/journey';
import { MIDNIGHT_COPY } from './templates/midnight';
import { REEL_COPY } from './templates/reel';

/** Every template's copy catalog, keyed by template id (= key namespace).
 *  The studio uses it to label overrides and detect "back to default". */
export const COPY_BY_TEMPLATE: Record<string, CopyMap> = {
  boarding: BOARDING_COPY,
  botanical: BOTANICAL_COPY,
  card: CARD_COPY,
  classic: CLASSIC_COPY,
  editorial: EDITORIAL_COPY,
  fiesta: FIESTA_COPY,
  invite: INVITE_COPY,
  journey: JOURNEY_COPY,
  midnight: MIDNIGHT_COPY,
  reel: REEL_COPY,
};

/** Default text for a fully-qualified override key ("classic:story.heading"). */
export function defaultForKey(fullKey: string): string | undefined {
  const sep = fullKey.indexOf(':');
  if (sep === -1) return undefined;
  const ns = fullKey.slice(0, sep);
  const key = fullKey.slice(sep + 1);
  return ns === 'shared' ? SHARED_COPY[key as keyof typeof SHARED_COPY] : COPY_BY_TEMPLATE[ns]?.[key];
}
