import { Checkbox } from './index';

/**
 * A labeled group of toggleable checkbox pills — extracted from Vendors.tsx,
 * which had this exact block copy-pasted 3x (categories/payment/logistics)
 * inside its filter popover. Renders just the option list; the trigger
 * button + popover shell stays page-specific since Vendors combines several
 * of these under one "Filters" button while a simpler page might not.
 */
export function MultiSelectDropdown<T extends string>({
  label,
  options,
  selected,
  onToggle,
  columns = 1,
  accentColor = 'var(--gold-deep)',
  checkedBorder = 'rgba(176,141,62,0.35)',
  checkedBackground = 'var(--gold-glow)',
}: {
  label: string;
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (value: T) => void;
  columns?: number;
  accentColor?: string;
  checkedBorder?: string;
  checkedBackground?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="uppercase-eyebrow">{label}</div>
      <div
        style={{
          display: columns > 1 ? 'grid' : 'grid',
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: 8,
          fontSize: 12,
          color: 'var(--ink-high)',
        }}
      >
        {options.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 8,
                width: '100%',
                minHeight: 36,
                padding: '8px 10px',
                borderRadius: 10,
                border: `1px solid ${checked ? checkedBorder : 'var(--line-soft)'}`,
                background: checked ? checkedBackground : 'var(--bg-raised)',
                cursor: 'pointer',
                fontSize: 12,
                color: 'var(--ink-high)',
                textTransform: 'none',
                letterSpacing: 'normal',
              }}
            >
              <Checkbox className="pointer-events-none" checked={checked} onChange={() => onToggle(option.value)} />
              <span
                style={{
                  display: 'block',
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: checked ? accentColor : 'var(--ink-high)',
                  fontWeight: checked ? 600 : 500,
                  lineHeight: 1.3,
                  textAlign: 'left',
                }}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
