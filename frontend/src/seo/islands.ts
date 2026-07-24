/** The only JavaScript the prerendered SEO pages ship.
 *
 *  Built as a single small ES module (see `vite.seo-islands.config.ts`) and
 *  inlined by `scripts/prerender-seo.mjs` into the pages that declare an
 *  interactive widget. It dispatches on `data-island`, so a page that has no
 *  widget runs nothing.
 */

import { mountBudget } from './tools/budget';
import { mountHashtags } from './tools/hashtags';

const MOUNTS: Record<string, (root: HTMLElement) => void> = {
  budget: mountBudget,
  hashtags: mountHashtags,
};

for (const el of document.querySelectorAll<HTMLElement>('[data-island]')) {
  MOUNTS[el.dataset.island ?? '']?.(el);
}
