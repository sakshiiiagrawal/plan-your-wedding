/** A template's (or the shared) editable-string catalog: key → default text. */
export type CopyMap = Record<string, string>;

/** Couple-content fields that are inline-editable in the preview. The wedding
 *  date is deliberately excluded — it needs date-picker semantics (panel only). */
export type EditableContentField = 'brideName' | 'groomName' | 'tagline' | 'story';
