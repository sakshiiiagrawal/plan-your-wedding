import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HiOutlineClock, HiOutlineX } from 'react-icons/hi';

/**
 * Themed time picker that replaces <input type="time">.
 * Value is "HH:mm" (24-hour) or "" when empty, matching native input semantics.
 */
interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  minuteStep?: number;
  size?: 'sm' | 'md';
  name?: string;
  id?: string;
}

function parse(v: string): { h: number; m: number } | null {
  if (!v) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(v);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

function to24(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatDisplay(h: number, m: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export default function TimePicker({
  value,
  onChange,
  placeholder = 'Select time',
  required,
  disabled,
  className = '',
  minuteStep = 5,
  size = 'md',
  name,
  id,
}: TimePickerProps) {
  const parsed = useMemo(() => parse(value), [value]);

  const [isOpen, setIsOpen] = useState(false);
  const [pickerStyle, setPickerStyle] = useState<React.CSSProperties>({});
  const [draft, setDraft] = useState(() => {
    if (parsed) {
      const period = parsed.h >= 12 ? 'PM' : 'AM';
      const h12 = parsed.h % 12 === 0 ? 12 : parsed.h % 12;
      return { h12, m: parsed.m, period: period as 'AM' | 'PM' };
    }
    return { h12: 9, m: 0, period: 'AM' as 'AM' | 'PM' };
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const hourColRef = useRef<HTMLDivElement>(null);
  const minuteColRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (parsed) {
      const period = parsed.h >= 12 ? 'PM' : 'AM';
      const h12 = parsed.h % 12 === 0 ? 12 : parsed.h % 12;
      setDraft({ h12, m: parsed.m, period });
    }
  }, [value]);

  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const minutes = useMemo(
    () => Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep),
    [minuteStep],
  );

  const open = () => {
    if (disabled || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popupHeight = 280;
    const popupWidth = 240;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top =
      spaceBelow < popupHeight + 20 && rect.top > popupHeight + 20
        ? rect.top - popupHeight - 8
        : rect.bottom + 6;
    const left = Math.min(rect.left, window.innerWidth - popupWidth - 12);
    setPickerStyle({
      position: 'fixed',
      top,
      left: Math.max(12, left),
      width: popupWidth,
      zIndex: 9999,
    });
    setIsOpen(true);
    // Scroll selected values into view once opened
    setTimeout(() => {
      hourColRef.current
        ?.querySelector<HTMLButtonElement>('[data-active="true"]')
        ?.scrollIntoView({ block: 'center' });
      minuteColRef.current
        ?.querySelector<HTMLButtonElement>('[data-active="true"]')
        ?.scrollIntoView({ block: 'center' });
    }, 20);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || popupRef.current?.contains(t)) return;
      setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const commit = (next: { h12: number; m: number; period: 'AM' | 'PM' }) => {
    let h24 = next.h12 % 12;
    if (next.period === 'PM') h24 += 12;
    onChange(to24(h24, next.m));
  };

  const padY = size === 'sm' ? 'py-1.5' : 'py-[9px]';

  const popup = isOpen ? (
    <div
      ref={popupRef}
      style={pickerStyle}
      className="rounded-xl overflow-hidden"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        className="border rounded-xl"
        style={{
          borderColor: 'var(--line-soft)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.12), 0 0 0 1px var(--gold-glow)',
          background: 'var(--bg-panel)',
        }}
      >
        {/* Header */}
        <div
          className="px-3 py-2.5 flex items-center justify-center"
          style={{
            background: 'linear-gradient(180deg, rgba(212,175,55,0.08), rgba(212,175,55,0.02))',
            borderBottom: '1px solid var(--line-soft)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '18px',
              fontWeight: 500,
              color: 'var(--ink-high)',
              letterSpacing: '0.02em',
            }}
          >
            {formatDisplay((draft.h12 % 12) + (draft.period === 'PM' ? 12 : 0), draft.m)}
          </div>
        </div>

        <div className="flex" style={{ height: 180 }}>
          {/* Hours */}
          <div
            ref={hourColRef}
            className="flex-1 overflow-y-auto scrollbar-hide border-r py-1"
            style={{ borderColor: 'var(--line-soft)' }}
          >
            {hours.map((h) => {
              const active = h === draft.h12;
              return (
                <button
                  key={h}
                  type="button"
                  data-active={active}
                  onClick={() => {
                    const next = { ...draft, h12: h };
                    setDraft(next);
                    commit(next);
                  }}
                  className="w-full text-center text-sm py-1.5 transition-colors"
                  style={{
                    background: active ? 'var(--gold)' : 'transparent',
                    color: active ? '#fff' : 'var(--ink-mid)',
                    fontWeight: active ? 600 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!active)
                      (e.currentTarget as HTMLElement).style.background = 'var(--gold-glow)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  {h}
                </button>
              );
            })}
          </div>

          {/* Minutes */}
          <div
            ref={minuteColRef}
            className="flex-1 overflow-y-auto scrollbar-hide border-r py-1"
            style={{ borderColor: 'var(--line-soft)' }}
          >
            {minutes.map((m) => {
              const active = m === draft.m;
              return (
                <button
                  key={m}
                  type="button"
                  data-active={active}
                  onClick={() => {
                    const next = { ...draft, m };
                    setDraft(next);
                    commit(next);
                  }}
                  className="w-full text-center text-sm py-1.5 transition-colors"
                  style={{
                    background: active ? 'var(--gold)' : 'transparent',
                    color: active ? '#fff' : 'var(--ink-mid)',
                    fontWeight: active ? 600 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!active)
                      (e.currentTarget as HTMLElement).style.background = 'var(--gold-glow)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  {String(m).padStart(2, '0')}
                </button>
              );
            })}
          </div>

          {/* Period */}
          <div className="flex-1 flex flex-col py-2 gap-1 px-2">
            {(['AM', 'PM'] as const).map((p) => {
              const active = p === draft.period;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    const next = { ...draft, period: p };
                    setDraft(next);
                    commit(next);
                  }}
                  className="flex-1 text-sm rounded-md transition-colors"
                  style={{
                    background: active ? 'var(--gold)' : 'transparent',
                    color: active ? '#fff' : 'var(--ink-mid)',
                    fontWeight: active ? 600 : 500,
                    border: `1px solid ${active ? 'var(--gold)' : 'var(--line-soft)'}`,
                    letterSpacing: '0.08em',
                  }}
                  onMouseEnter={(e) => {
                    if (!active)
                      (e.currentTarget as HTMLElement).style.background = 'var(--bg-raised)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderTop: '1px solid var(--line-soft)', background: 'var(--bg-raised)' }}
        >
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              const h = now.getHours();
              const period = h >= 12 ? 'PM' : 'AM';
              const h12 = h % 12 === 0 ? 12 : h % 12;
              const roundedM = (Math.round(now.getMinutes() / minuteStep) * minuteStep) % 60;
              const next = { h12, m: roundedM, period: period as 'AM' | 'PM' };
              setDraft(next);
              commit(next);
            }}
            className="text-[11px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--gold-deep)', letterSpacing: '0.1em' }}
          >
            Now
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-[11px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--ink-mid)', letterSpacing: '0.1em' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className={`relative ${className}`}>
        <button
          ref={triggerRef}
          id={id}
          name={name}
          type="button"
          onClick={() => (isOpen ? setIsOpen(false) : open())}
          disabled={disabled}
          className={`input pl-9 ${value ? 'pr-9' : 'pr-3'} ${padY} text-left flex items-center`}
          style={{
            color: parsed ? 'var(--ink-high)' : 'var(--ink-dim)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
          }}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          <HiOutlineClock
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: 'var(--gold-deep)' }}
          />
          <span className="truncate">
            {parsed ? formatDisplay(parsed.h, parsed.m) : placeholder}
          </span>
        </button>
        {value && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded"
            style={{ color: 'var(--ink-low)' }}
            aria-label="Clear time"
          >
            <HiOutlineX className="w-3.5 h-3.5" />
          </button>
        )}
        {required && (
          <input
            tabIndex={-1}
            aria-hidden="true"
            required
            value={value}
            onChange={() => {}}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0,
              pointerEvents: 'none',
              height: 0,
              width: 0,
            }}
          />
        )}
      </div>
      {typeof document !== 'undefined' && createPortal(popup, document.body)}
    </>
  );
}
