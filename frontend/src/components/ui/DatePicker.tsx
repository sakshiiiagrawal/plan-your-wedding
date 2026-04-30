import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HiOutlineCalendar, HiChevronLeft, HiChevronRight, HiOutlineX } from 'react-icons/hi';

/**
 * Themed date picker that replaces <input type="date">.
 * Value is an ISO date string "YYYY-MM-DD" (or "" when empty) to match native input semantics.
 */
interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
  name?: string;
  id?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function parseISO(v: string): Date | null {
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDisplay(d: Date): string {
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  min,
  max,
  required,
  disabled,
  className = '',
  size = 'md',
  name,
  id,
}: DatePickerProps) {
  const selected = useMemo(() => parseISO(value), [value]);
  const minDate = useMemo(() => parseISO(min || ''), [min]);
  const maxDate = useMemo(() => parseISO(max || ''), [max]);

  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => selected || new Date());
  const [pickerStyle, setPickerStyle] = useState<React.CSSProperties>({});
  const [yearMode, setYearMode] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) setViewMonth(selected);
  }, [value]);

  const open = () => {
    if (disabled || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popupHeight = 340;
    const popupWidth = 300;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < popupHeight + 20 && rect.top > popupHeight + 20
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
    setViewMonth(selected || new Date());
    setYearMode(false);
    setIsOpen(true);
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

  const handleSelect = (d: Date) => {
    if (minDate && d < minDate) return;
    if (maxDate && d > maxDate) return;
    onChange(toISO(d));
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const isDisabled = (d: Date) => {
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;
    return false;
  };

  // Build calendar grid
  const grid = useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const startOffset = first.getDay();
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewMonth]);

  const today = new Date();
  const currentYear = viewMonth.getFullYear();
  const yearList = useMemo(() => {
    const start = currentYear - 6;
    return Array.from({ length: 16 }, (_, i) => start + i);
  }, [currentYear]);

  const padY = size === 'sm' ? 'py-1.5' : 'py-[9px]';

  const popup = isOpen ? (
    <div
      ref={popupRef}
      style={pickerStyle}
      className="bg-white rounded-xl overflow-hidden"
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
          className="flex items-center justify-between px-3 py-2.5"
          style={{
            background: 'linear-gradient(180deg, rgba(212,175,55,0.08), rgba(212,175,55,0.02))',
            borderBottom: '1px solid var(--line-soft)',
          }}
        >
          <button
            type="button"
            onClick={() => setViewMonth(new Date(currentYear, viewMonth.getMonth() - 1, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-raised)]"
            style={{ color: 'var(--ink-mid)' }}
          >
            <HiChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setYearMode((v) => !v)}
            className="text-sm font-medium px-2 py-1 rounded transition-colors hover:bg-[var(--bg-raised)]"
            style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: 'var(--ink-high)' }}
          >
            {MONTHS[viewMonth.getMonth()]} {currentYear}
          </button>
          <button
            type="button"
            onClick={() => setViewMonth(new Date(currentYear, viewMonth.getMonth() + 1, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-raised)]"
            style={{ color: 'var(--ink-mid)' }}
          >
            <HiChevronRight className="w-4 h-4" />
          </button>
        </div>

        {yearMode ? (
          <div className="p-3 grid grid-cols-4 gap-1.5">
            {yearList.map((y) => {
              const active = y === currentYear;
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => {
                    setViewMonth(new Date(y, viewMonth.getMonth(), 1));
                    setYearMode(false);
                  }}
                  className="py-2 text-xs rounded-md transition-colors"
                  style={{
                    background: active ? 'var(--gold)' : 'transparent',
                    color: active ? '#fff' : 'var(--ink-mid)',
                    border: `1px solid ${active ? 'var(--gold)' : 'var(--line-soft)'}`,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-raised)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  {y}
                </button>
              );
            })}
          </div>
        ) : (
          <>
            {/* Weekdays */}
            <div className="grid grid-cols-7 px-3 pt-2.5">
              {WEEKDAYS.map((w, i) => (
                <div
                  key={i}
                  className="text-center text-[10px] font-medium uppercase tracking-wider py-1"
                  style={{ color: 'var(--ink-low)', letterSpacing: '0.12em' }}
                >
                  {w}
                </div>
              ))}
            </div>
            {/* Grid */}
            <div className="grid grid-cols-7 gap-0.5 px-2 pb-2">
              {grid.map((d, i) => {
                if (!d) return <div key={i} className="h-9" />;
                const isSelected = selected && sameDay(d, selected);
                const isToday = sameDay(d, today);
                const disabledDay = isDisabled(d);
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={disabledDay}
                    onClick={() => handleSelect(d)}
                    className="h-9 flex items-center justify-center text-[13px] rounded-md transition-all"
                    style={{
                      background: isSelected ? 'var(--gold)' : 'transparent',
                      color: disabledDay
                        ? 'var(--ink-dim)'
                        : isSelected
                        ? '#fff'
                        : isToday
                        ? 'var(--gold-deep)'
                        : 'var(--ink-high)',
                      fontWeight: isSelected || isToday ? 600 : 400,
                      border: isToday && !isSelected ? '1px solid var(--gold-soft)' : '1px solid transparent',
                      cursor: disabledDay ? 'not-allowed' : 'pointer',
                      opacity: disabledDay ? 0.4 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected && !disabledDay) {
                        (e.currentTarget as HTMLElement).style.background = 'var(--gold-glow)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected && !disabledDay) {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }
                    }}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Footer */}
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderTop: '1px solid var(--line-soft)', background: 'var(--bg-raised)' }}
        >
          <button
            type="button"
            onClick={() => handleSelect(new Date())}
            className="text-[11px] font-medium uppercase tracking-wider transition-colors"
            style={{ color: 'var(--gold-deep)', letterSpacing: '0.1em' }}
          >
            Today
          </button>
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className="text-[11px] font-medium uppercase tracking-wider transition-colors"
              style={{ color: 'var(--ink-low)', letterSpacing: '0.1em' }}
            >
              Clear
            </button>
          )}
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
            color: selected ? 'var(--ink-high)' : 'var(--ink-dim)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
          }}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          <HiOutlineCalendar
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: 'var(--gold-deep)' }}
          />
          <span className="truncate">{selected ? formatDisplay(selected) : placeholder}</span>
        </button>
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded transition-colors"
            style={{ color: 'var(--ink-low)' }}
            aria-label="Clear date"
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
