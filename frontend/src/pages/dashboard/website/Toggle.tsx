/** The studio's pill switch — shared by section, QR and any future toggles. */
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
        width: 34,
        height: 20,
        borderRadius: 999,
        background: checked ? 'var(--gold)' : 'var(--line-strong)',
        transition: 'background 200ms',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 2,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left 200ms',
          left: checked ? 16 : 2,
        }}
      />
    </button>
  );
}
