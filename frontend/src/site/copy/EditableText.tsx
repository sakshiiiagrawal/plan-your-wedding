import { useContext, useRef, useState, type CSSProperties } from 'react';
import { SiteCopyContext } from './context';
import type { EditableContentField } from './types';

export type EditableBinding =
  | { type: 'content'; field: EditableContentField }
  | { type: 'copy'; key: string };

// contentEditable="plaintext-only" keeps rich formatting out for free; Firefox
// doesn't support it, so there we fall back to plain contentEditable and strip
// formatting in the paste/keydown handlers.
const supportsPlaintextOnly = (() => {
  if (typeof document === 'undefined') return false;
  const el = document.createElement('span');
  try {
    el.contentEditable = 'plaintext-only';
    return el.contentEditable === 'plaintext-only';
  } catch {
    return false;
  }
})();

/**
 * The one inline-edit primitive. Without an edit controller (live site) it is
 * a plain `<span>` with zero listeners. Inside the studio preview it becomes a
 * contentEditable span that commits on every input, so panel fields mirror
 * keystroke-for-keystroke and nothing is lost if the template remounts.
 */
export default function EditableText({
  binding,
  value,
  multiline,
  className,
  style,
}: {
  binding: EditableBinding;
  value: string;
  multiline?: boolean | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}) {
  const { edit } = useContext(SiteCopyContext);
  const [focused, setFocused] = useState(false);
  // Freeze-on-focus: while the caret is inside, React keeps rendering the
  // snapshot taken at focus so state updates never touch the DOM text node
  // (which would clobber the caret). Commits still flow out on every input.
  const frozenRef = useRef(value);
  // Bumped on blur to remount the span — typing can leave <br>s and split
  // text nodes React doesn't know about; a fresh mount discards them.
  const [epoch, setEpoch] = useState(0);

  if (!edit) {
    return (
      <span className={className} style={style}>
        {value}
      </span>
    );
  }

  const commit = (raw: string) => {
    const text = multiline ? raw : raw.replace(/\n+/g, ' ');
    if (binding.type === 'content') edit.commitContent(binding.field, text);
    else edit.commitCopy(binding.key, text);
  };

  return (
    <span
      key={epoch}
      className={`site-editable${className ? ` ${className}` : ''}`}
      style={{
        caretColor: 'var(--site-accent)',
        ...(multiline ? { whiteSpace: 'pre-line' as const } : {}),
        ...style,
      }}
      contentEditable={supportsPlaintextOnly ? 'plaintext-only' : true}
      suppressContentEditableWarning
      spellCheck={false}
      onFocus={() => {
        frozenRef.current = value;
        setFocused(true);
      }}
      onInput={(e) => commit(e.currentTarget.innerText)}
      onBlur={(e) => {
        commit(e.currentTarget.innerText);
        setFocused(false);
        setEpoch((n) => n + 1);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !multiline) {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === 'Escape') {
          e.currentTarget.innerText = frozenRef.current;
          commit(frozenRef.current);
          e.currentTarget.blur();
        } else if (!supportsPlaintextOnly && (e.metaKey || e.ctrlKey) && 'biu'.includes(e.key)) {
          e.preventDefault(); // Firefox fallback: block bold/italic/underline
        }
      }}
      onPaste={
        supportsPlaintextOnly && multiline
          ? undefined
          : (e) => {
              e.preventDefault();
              let text = e.clipboardData.getData('text/plain');
              if (!multiline) text = text.replace(/\n+/g, ' ');
              document.execCommand('insertText', false, text);
            }
      }
      // Editing inside interactive parents (nav anchors, tap-to-open intros)
      // must not trigger them; the canvas already suppresses anchor navigation.
      onClick={(e) => e.stopPropagation()}
    >
      {focused ? frozenRef.current : value}
    </span>
  );
}
