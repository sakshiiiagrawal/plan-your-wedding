import type { ReactNode } from 'react';

/** A titled group inside the config panel. */
export default function PanelSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section style={{ padding: '14px 16px 18px', borderBottom: '1px solid var(--line-soft)' }}>
      <div className="uppercase-eyebrow" style={{ marginBottom: hint ? 4 : 12 }}>
        {title}
      </div>
      {hint && <p style={{ fontSize: 10.5, color: 'var(--ink-dim)', margin: '0 0 10px' }}>{hint}</p>}
      {children}
    </section>
  );
}
