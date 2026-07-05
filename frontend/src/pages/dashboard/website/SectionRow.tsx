import type { ReactNode } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { HiOutlineChevronDown } from 'react-icons/hi';
import { RxDragHandleDots2 } from 'react-icons/rx';
import Toggle from './Toggle';
import type { SectionSetting } from '../../../site/types';

/** One accordion row in the merged Content panel: [grip] [label + note] [chevron] [toggle]. */
export function SectionRow({
  label,
  chip,
  note,
  toggle,
  open,
  onOpenToggle,
  grip,
  dimmed,
  children,
}: {
  label: string;
  /** Small inline tag after the label ("overlay", "woven in"). */
  chip?: string;
  note?: string | null;
  toggle?: { checked: boolean; onChange: () => void; ariaLabel: string };
  open?: boolean;
  onOpenToggle?: () => void;
  grip?: ReactNode;
  dimmed?: boolean;
  children?: ReactNode;
}) {
  const expandable = !!children;
  return (
    <div style={{ borderBottom: '1px solid var(--line-soft)', background: 'var(--bg-panel)' }}>
      <div
        role={expandable ? 'button' : undefined}
        aria-expanded={expandable ? open : undefined}
        onClick={expandable ? onOpenToggle : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '11px 2px',
          cursor: expandable ? 'pointer' : 'default',
        }}
      >
        {grip ?? <div style={{ width: 18, flexShrink: 0 }} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontSize: 13,
              color: dimmed ? 'var(--ink-dim)' : 'var(--ink-high)',
              transition: 'color 200ms',
            }}
          >
            {label}
            {chip && (
              <span style={{ fontSize: 10, color: 'var(--ink-dim)', marginLeft: 6 }}>{chip}</span>
            )}
          </span>
          {note && (
            <div style={{ fontSize: 10.5, color: 'var(--gold-deep)', marginTop: 2 }}>{note}</div>
          )}
        </div>
        {expandable && (
          <HiOutlineChevronDown
            style={{
              width: 14,
              height: 14,
              color: 'var(--ink-dim)',
              flexShrink: 0,
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 150ms',
            }}
          />
        )}
        {toggle && (
          <span onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexShrink: 0 }}>
            <Toggle checked={toggle.checked} onChange={toggle.onChange} label={toggle.ariaLabel} />
          </span>
        )}
      </div>
      {expandable && open && <div style={{ padding: '0 2px 14px 26px' }}>{children}</div>}
    </div>
  );
}

/** A draggable SectionRow: drag starts only from the grip so the row's
 *  inputs/toggles stay usable; arrow keys on the focused grip reorder too. */
export function MovableSectionRow({
  section,
  onMove,
  onDragStart,
  ...rowProps
}: {
  section: SectionSetting;
  onMove: (delta: -1 | 1) => void;
  onDragStart: () => void;
} & Omit<Parameters<typeof SectionRow>[0], 'grip'>) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      as="div"
      value={section}
      dragListener={false}
      dragControls={controls}
      onDragStart={onDragStart}
      layout
      whileDrag={{
        scale: 1.02,
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        zIndex: 5,
      }}
      style={{ position: 'relative' }}
    >
      <SectionRow
        {...rowProps}
        grip={
          <div
            role="button"
            tabIndex={0}
            aria-label={`Reorder ${rowProps.label}`}
            onPointerDown={(e) => {
              e.preventDefault();
              controls.start(e);
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                onMove(-1);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                onMove(1);
              }
            }}
            style={{
              cursor: 'grab',
              touchAction: 'none',
              color: 'var(--ink-dim)',
              display: 'flex',
              padding: '4px 2px',
              flexShrink: 0,
            }}
          >
            <RxDragHandleDots2 style={{ width: 14, height: 14 }} />
          </div>
        }
      />
    </Reorder.Item>
  );
}
