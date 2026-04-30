import { createPortal } from 'react-dom';
import React from 'react';

// ─── CornerFlourish ───────────────────────────────────────────────────────────
export function CornerFlourish({
  size = 60,
  rotate = 0,
  className = '',
  style = {},
}: {
  size?: number;
  rotate?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      fill="none"
      style={{ transform: `rotate(${rotate}deg)`, ...style }}
      stroke="currentColor"
      strokeWidth="0.8"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 2 H32" />
      <path d="M2 2 V32" />
      <path d="M2 12 Q12 12 12 2" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" opacity={0.7} />
      <path d="M16 5 Q22 5 22 2" opacity={0.45} />
      <path d="M5 16 Q5 22 2 22" opacity={0.45} />
      <circle cx="7" cy="7" r="0.8" fill="currentColor" stroke="none" opacity={0.4} />
    </svg>
  );
}

// ─── Ornament ─────────────────────────────────────────────────────────────────
export function Ornament({ mark = '❋', className = '' }: { mark?: string; className?: string }) {
  return (
    <div className={`ornament ${className}`}>
      <span className="mark">{mark}</span>
    </div>
  );
}

// ─── ProgressRing ─────────────────────────────────────────────────────────────
export function ProgressRing({
  value,
  size = 76,
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  label: string;
  sublabel?: string;
}) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, value));
  const offset = c * (1 - clamped);
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(0,0,0,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#D4AF37"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="display text-lg font-medium"
          style={{ color: 'var(--ink-high)', lineHeight: 1 }}
        >
          {label}
        </span>
        {sublabel && (
          <span
            className="uppercase-eyebrow mt-1"
            style={{ color: 'var(--ink-dim)', letterSpacing: '0.1em' }}
          >
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Pill ─────────────────────────────────────────────────────────────────────
export type PillVariant = 'ok' | 'warn' | 'err' | 'info' | 'gold' | 'muted' | 'bride' | 'groom';

export function Pill({
  variant = 'muted',
  children,
  dot = true,
  className = '',
}: {
  variant?: PillVariant;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span className={`pill ${variant} ${className}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
      <div>
        {eyebrow && <div className="uppercase-eyebrow mb-2">{eyebrow}</div>}
        <h1
          className="display"
          style={{
            fontSize: 30,
            color: 'var(--ink-high)',
            fontWeight: 500,
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          {title}
        </h1>
        {description && (
          <p
            style={{
              fontSize: 13,
              color: 'var(--ink-low)',
              marginTop: 6,
              maxWidth: 600,
              lineHeight: 1.6,
            }}
          >
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ─── KPICard ──────────────────────────────────────────────────────────────────
export function KPICard({
  eyebrow,
  value,
  suffix,
  hint,
  accent,
}: {
  eyebrow: string;
  value: string | number;
  suffix?: string;
  hint?: string;
  accent?: boolean | 'gold' | 'green';
}) {
  const numColor =
    accent === 'green'
      ? 'var(--ok)'
      : accent === 'gold' || accent === true
        ? 'var(--gold-soft)'
        : 'var(--ink-high)';

  return (
    <div className="card">
      <div className="uppercase-eyebrow mb-3">{eyebrow}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span className="kpi-num" style={{ color: numColor }}>
          {value}
        </span>
        {suffix && (
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
            {suffix}
          </span>
        )}
      </div>
      {hint && <div style={{ fontSize: 11, color: 'var(--ink-low)', marginTop: 8 }}>{hint}</div>}
    </div>
  );
}

// ─── DrawerPanel ──────────────────────────────────────────────────────────────
export function DrawerPanel({
  open,
  onClose,
  children,
  width = 420,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onClose} />
      <div
        style={{
          width,
          background: 'var(--bg-panel)',
          borderLeft: '1px solid var(--line-soft)',
          boxShadow: '-20px 0 60px -20px rgba(0,0,0,0.2)',
          height: '100%',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

// ─── SegmentedControl ─────────────────────────────────────────────────────────
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 2,
        background: 'var(--bg-raised)',
        padding: 3,
        borderRadius: 10,
        border: '1px solid var(--line-soft)',
      }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: '6px 12px',
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 500,
            fontFamily: 'var(--font-sans)',
            transition: 'all 150ms ease',
            whiteSpace: 'nowrap',
            background: value === opt.value ? 'var(--bg-panel)' : 'transparent',
            color: value === opt.value ? 'var(--gold-deep)' : 'var(--ink-low)',
            boxShadow: value === opt.value ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {opt.label}
          {opt.count !== undefined && (
            <span className="mono" style={{ marginLeft: 5, opacity: 0.6, fontSize: 11 }}>
              {opt.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── StarRating ───────────────────────────────────────────────────────────────
export function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <svg key={i} width={13} height={13} viewBox="0 0 24 24" aria-hidden="true">
          <polygon
            points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
            fill={i < Math.round(rating) ? '#D4AF37' : 'none'}
            stroke={i < Math.round(rating) ? '#D4AF37' : '#D1D5DB'}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </div>
  );
}

// ─── Eyebrow label ────────────────────────────────────────────────────────────
export function Eyebrow({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`uppercase-eyebrow ${className}`}>{children}</div>;
}
