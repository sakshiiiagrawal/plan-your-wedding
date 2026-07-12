/** The studio's switch — shared by section, QR and any future toggles.
 *  Neumorphic style adapted from uiverse.io/Praashoo7 (MIT). */
export default function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      style={{
        position: 'relative',
        flexShrink: 0,
        width: 40,
        height: 22,
        borderRadius: 6,
        background: checked ? 'var(--gold)' : 'var(--bg-highest)',
        boxShadow: checked
          ? 'inset 2px 4px 8px rgba(126, 98, 39, 0.55)'
          : 'inset 2px 4px 8px rgba(62, 44, 24, 0.28)',
        transition: 'background 400ms, box-shadow 400ms',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 4,
          left: 5,
          width: 3,
          height: 14,
          borderRadius: 1,
          background: 'white',
          boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
          transition: 'transform 400ms',
          transform: checked
            ? 'translateX(27px) rotate(360deg)'
            : 'translateX(0) rotate(0deg)',
        }}
      />
    </button>
  );
}
