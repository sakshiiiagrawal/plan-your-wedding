import { useContext, type CSSProperties } from 'react';
import { SiteCopyContext } from './context';
import EditableText from './EditableText';
import type { CopyMap, EditableContentField } from './types';

/**
 * Per-namespace copy tools, created once at module level in each template:
 *
 *   const { E, useT } = makeEditable('classic', CLASSIC_COPY);
 *
 * `E` renders an inline-editable span for a copy key (`<E k="story.heading" />`);
 * `useT()` returns a resolver for places that can't host a span (attributes,
 * placeholders, <option> text). `keyof M` typing makes typo'd keys a compile error.
 */
export function makeEditable<M extends CopyMap>(namespace: string, defaults: M) {
  type Key = keyof M & string;

  function useT() {
    const { overrides } = useContext(SiteCopyContext);
    return (k: Key): string => overrides[`${namespace}:${k}`] ?? defaults[k]!;
  }

  function E({
    k,
    multiline,
    className,
    style,
  }: {
    k: Key;
    multiline?: boolean;
    className?: string;
    style?: CSSProperties;
  }) {
    const t = useT();
    return (
      <EditableText
        binding={{ type: 'copy', key: `${namespace}:${k}` }}
        value={t(k)}
        multiline={multiline}
        className={className}
        style={style}
      />
    );
  }

  return { E, useT };
}

/** Inline-editable couple content (names / tagline / story) — value comes from
 *  SiteData, edits route to the studio's shared content drafts. */
export function EditableContent({
  field,
  value,
  multiline,
  className,
  style,
}: {
  field: EditableContentField;
  value: string;
  multiline?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <EditableText
      binding={{ type: 'content', field }}
      value={value}
      multiline={multiline}
      className={className}
      style={style}
    />
  );
}
