import React from 'react';
import { HiOutlineX } from 'react-icons/hi';
import Portal from '../Portal';

/* Canonical dialog anatomy for every add/edit flow:
   pinned compact header (eyebrow + serif title + close), scrollable body of
   FormSections, pinned footer with right-aligned actions. Dismissal stays with
   the caller (useModalDismiss + useUnsavedChangesPrompt) — pass attemptClose
   as onClose. */

const SIZES = { sm: 480, md: 600, lg: 768, xl: 900 } as const;
export type ModalSize = keyof typeof SIZES;

export function Modal({
  onClose,
  eyebrow,
  title,
  size = 'md',
  height,
  headerRight,
  headerBottom,
  footerLeft,
  footer,
  children,
}: {
  onClose: () => void;
  eyebrow?: string;
  title: React.ReactNode;
  size?: ModalSize;
  /** Fixed panel height (px) for tabbed modals so switching tabs doesn't resize. */
  height?: number;
  /** Status chips/badges rendered left of the close button. */
  headerRight?: React.ReactNode;
  /** Pinned row under the header — tab strips. */
  headerBottom?: React.ReactNode;
  /** Meta slot: totals, validation hints. Renders left of the actions. */
  footerLeft?: React.ReactNode;
  /** Action buttons, right-aligned: Cancel (btn-outline) then primary. */
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Portal>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: 16,
        }}
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--bg-panel)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: SIZES[size],
            height: height ? `min(90vh, ${height}px)` : undefined,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          }}
        >
          <div style={{ flexShrink: 0, borderBottom: '1px solid var(--line-soft)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '16px 24px',
              }}
            >
              <div style={{ minWidth: 0 }}>
                {eyebrow && (
                  <div className="uppercase-eyebrow" style={{ marginBottom: 4 }}>
                    {eyebrow}
                  </div>
                )}
                <h2
                  className="display"
                  style={{ margin: 0, fontSize: 22, color: 'var(--ink-high)', lineHeight: 1.15 }}
                >
                  {title}
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                {headerRight}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  style={{
                    padding: '6px 8px',
                    borderRadius: 6,
                    color: 'var(--ink-dim)',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <HiOutlineX style={{ width: 18, height: 18 }} />
                </button>
              </div>
            </div>
            {headerBottom}
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
            }}
          >
            {children}
          </div>

          {(footer || footerLeft) && (
            <div
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                padding: '14px 24px',
                borderTop: '1px solid var(--line-soft)',
              }}
            >
              <div style={{ minWidth: 0, fontSize: 12, color: 'var(--ink-low)' }}>{footerLeft}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                {footer}
              </div>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}

/** One section-header style for every form: small uppercase label + optional
    hint, with an optional action (e.g. "Add item") on the right. */
export function FormSection({
  title,
  hint,
  action,
  children,
}: {
  title?: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {(title || action) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            {title && <div className="form-section-title">{title}</div>}
            {hint && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ink-low)' }}>{hint}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Small gold "Add …" text action used in FormSection headers. */
export function SectionAction({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontSize: 13,
        color: 'var(--gold-deep)',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: 'transparent',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}

export type LiabilitySide = 'bride' | 'groom' | 'shared';

/** The one bride/groom/shared segmented control — token colors only. */
export function SideToggle({
  value,
  onChange,
}: {
  value: LiabilitySide;
  onChange: (side: LiabilitySide) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {(['bride', 'groom', 'shared'] as const).map((side) => {
        const isActive = value === side;
        const activeStyle =
          side === 'bride'
            ? {
                borderColor: 'var(--bride-line)',
                background: 'var(--bride-soft)',
                color: 'var(--bride-deep)',
              }
            : side === 'groom'
              ? {
                  borderColor: 'var(--groom-line)',
                  background: 'var(--groom-soft)',
                  color: 'var(--groom-deep)',
                }
              : {
                  borderColor: 'var(--line-strong)',
                  background: 'var(--bg-highest)',
                  color: 'var(--ink-high)',
                };
        return (
          <button
            key={side}
            type="button"
            onClick={() => onChange(side)}
            style={{
              flex: 1,
              padding: '7px 4px',
              borderRadius: 8,
              border: `2px solid ${isActive ? activeStyle.borderColor : 'var(--line)'}`,
              background: isActive ? activeStyle.background : 'transparent',
              color: isActive ? activeStyle.color : 'var(--ink-low)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 150ms',
              textTransform: 'capitalize',
            }}
          >
            {side}
          </button>
        );
      })}
    </div>
  );
}
