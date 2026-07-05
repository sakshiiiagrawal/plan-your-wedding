import { createContext } from 'react';
import type { EditableContentField } from './types';

/** Studio-provided sink for inline edits. Absent (null) on the live site, so
 *  editing is structurally impossible outside the preview canvas. */
export interface SiteEditController {
  /** Couple content (names/tagline/story) — routed to the studio's draft state. */
  commitContent: (field: EditableContentField, value: string) => void;
  /** Template/shared copy — routed to the page's sparse text_overrides. */
  commitCopy: (key: string, value: string) => void;
}

export interface SiteCopyContextValue {
  /** Sparse `config.text_overrides` for the page being rendered. */
  overrides: Record<string, string>;
  edit: SiteEditController | null;
}

export const SiteCopyContext = createContext<SiteCopyContextValue>({ overrides: {}, edit: null });
