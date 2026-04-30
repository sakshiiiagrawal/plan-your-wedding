import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HiOutlineCalendar, HiChevronLeft, HiChevronRight, HiArrowRight } from 'react-icons/hi';

/**
 * Joined date-range picker — two triggers, one shared popup.
 * Picking the start date auto-advances the popup to check-out selection with a subtle fade.
 * Hover preview + range highlight mirrors the booking-site pattern.
 */
interface DateRangePickerProps {
  startValue: string;
  endValue: string;
  onChange: (next: { start: string; end: string }) => void;
  startPlaceholder?: string;
  endPlaceholder?: string;
  startLabel?: string;
  endLabel?: string;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKDAYS = ['S','M','T','W','T','F','S'];

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

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function formatDisplay(d: Date): string {
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

type Stage = 'start' | 'end';

export default function DateRangePicker({
  startValue,
  endValue,
  onChange,
  startPlaceholder = 'Check-in',
  endPlaceholder = 'Check-out',
  startLabel,
  endLabel,
  min,
  max,
  required,
  disabled,
  size = 'md',
  className = '',
}: DateRangePickerProps) {
  const startDate = useMemo(() => parseISO(startValue), [startValue]);
  const endDate = useMemo(() => parseISO(endValue), [endValue]);
  const minDate = useMemo(() => parseISO(min || ''), [min]);
  const maxDate = useMemo(() => parseISO(max || ''), [max]);

  const [isOpen, setIsOpen] = useState(false);
  const [stage, setStage] = useState<Stage>('start');
  const [viewMonth, setViewMonth] = useState<Date>(() => startDate || new Date());
  const [hovered, setHovered] = useState<Date | null>(null);
  const [pickerStyle, setPickerStyle] = useState<React.CSSProperties>({});
  const [animIn, setAnimIn] = useState(false);
  const [stageFlash, setStageFlash] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const startBtnRef = useRef<HTMLButtonElement>(null);
  const endBtnRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    // Fade-in on next frame.
    const t = requestAnimationFrame(() => setAnimIn(true));
    return () => cancelAnimationFrame(t);
  }, [isOpen]);

  const positionFromTrigger = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const popupHeight = 360;
    const popupWidth = 320;
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
  };

  const openAt = (which: Stage) => {
    if (disabled) return;
    const el = which === 'start' ? startBtnRef.current : endBtnRef.current;
    if (!el) return;
    positionFromTrigger(el);
    // Choose initial stage: end trigger with no start yet still starts at 'start'.
    const initialStage: Stage = which === 'end' && startDate ? 'end' : 'start';
    setStage(initialStage);
    const focusDate = initialStage === 'end' ? (endDate || startDate) : (startDate || endDate);
    setViewMonth(focusDate || new Date());
    setHovered(null);
    setAnimIn(false);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setAnimIn(false);
    setHovered(null);
    setStage('start');
  };

  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapperRef.current?.contains(t) || popupRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const isDateDisabled = (d: Date) => {
    if (minDate && startOfDay(d) < startOfDay(minDate)) return true;
    if (maxDate && startOfDay(d) > startOfDay(maxDate)) return true;
    return false;
  };

  const flashStage = () => {
    setStageFlash(true);
    setTimeout(() => setStageFlash(false), 220);
  };

  const handleDayClick = (d: Date) => {
    if (isDateDisabled(d)) return;
    if (stage === 'start') {
      // Clear end if it would become invalid.
      const newEnd = endDate && startOfDay(endDate) > startOfDay(d) ? endValue : '';
      onChange({ start: toISO(d), end: newEnd });
      setStage('end');
      flashStage();
      // Keep focus on the same month unless end exists in a different month.
      return;
    }
    // stage === 'end'
    const curStart = startDate;
    if (!curStart || startOfDay(d) < startOfDay(curStart)) {
      // Treat as new start selection.
      onChange({ start: toISO(d), end: '' });
      setStage('end');
      flashStage();
      return;
    }
    if (curStart && sameDay(d, curStart)) {
      // Clicking same day as start — require at least 1 night; advance viewMonth but don't commit.
      return;
    }
    onChange({ start: startValue, end: toISO(d) });
    close();
  };

  // Range display: effective end for highlighting uses hover preview during 'end' stage.
  const effectiveEnd: Date | null = useMemo(() => {
    if (stage === 'end' && hovered && startDate && startOfDay(hovered) > startOfDay(startDate)) return hovered;
    return endDate;
  }, [stage, hovered, startDate, endDate]);

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

  const triggerPadY = size === 'sm' ? 'py-1.5' : 'py-[9px]';
  const triggerFontSize = size === 'sm' ? 12 : 13;

  const startFilled = Boolean(startDate);
  const endFilled = Boolean(endDate);

  const renderStageTab = (s: Stage) => {
    const isActive = stage === s;
    const value = s === 'start' ? startDate : endDate;
    const placeholder = s === 'start' ? 'Check-in' : 'Check-out';
    const enabled = s !== 'end' || Boolean(startDate);
    return (
      <button
        type="button"
        onClick={() => {
          if (!enabled) return;
          setStage(s);
          flashStage();
          const focus = s === 'end' ? (endDate || startDate) : (startDate || endDate);
          if (focus) setViewMonth(focus);
        }}
        className="px-2 py-1 rounded-md text-left transition-all"
        style={{
          background: isActive ? 'var(--gold-glow)' : 'transparent',
          border: `1px solid ${isActive ? 'var(--gold-soft)' : 'transparent'}`,
          boxShadow: isActive && stageFlash ? '0 0 0 3px var(--gold-glow)' : 'none',
          cursor: enabled ? 'pointer' : 'not-allowed',
          opacity: enabled ? 1 : 0.55,
        }}
      >
        <div
          className="text-[10px] uppercase tracking-wider leading-none"
          style={{ color: isActive ? 'var(--gold-deep)' : 'var(--ink-low)', letterSpacing: '0.12em' }}
        >
          {placeholder}
        </div>
        <div
          className="mt-0.5 text-[13px] leading-tight"
          style={{
            color: value ? 'var(--ink-high)' : 'var(--ink-dim)',
            fontWeight: isActive ? 600 : 500,
            fontFamily: 'var(--font-display)',
          }}
        >
          {value ? formatDisplay(value) : 'Select'}
        </div>
      </button>
    );
  };

  const renderTrigger = (
    ref: React.RefObject<HTMLButtonElement | null>,
    which: Stage,
    value: Date | null,
    placeholder: string,
    label: string | undefined,
    filled: boolean,
    joinSide: 'left' | 'right',
  ) => {
    const active = isOpen && stage === which;
    const borderRadius = joinSide === 'left'
      ? '8px 0 0 8px'
      : '0 8px 8px 0';
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        onClick={() => (isOpen && stage === which ? close() : openAt(which))}
        className={`flex items-center gap-2 px-3 ${triggerPadY} text-left transition-colors flex-1 min-w-0`}
        style={{
          fontSize: triggerFontSize,
          background: 'var(--bg-raised)',
          border: '1px solid var(--line)',
          borderRadius,
          borderRightWidth: joinSide === 'left' ? 0 : 1,
          color: filled ? 'var(--ink-high)' : 'var(--ink-dim)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          boxShadow: active ? '0 0 0 3px var(--gold-glow)' : 'none',
          borderColor: active ? 'var(--gold)' : 'var(--line)',
          outline: 'none',
          position: 'relative',
          zIndex: active ? 1 : 0,
        }}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <HiOutlineCalendar className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--gold-deep)' }} />
        <span className="flex flex-col min-w-0">
          {label && (
            <span
              className="text-[10px] uppercase tracking-wider leading-none"
              style={{ color: 'var(--ink-low)', letterSpacing: '0.1em' }}
            >
              {label}
            </span>
          )}
          <span className="truncate" style={{ lineHeight: label ? 1.4 : 1.2 }}>
            {value ? formatDisplay(value) : placeholder}
          </span>
        </span>
      </button>
    );
  };

  const popup = isOpen ? (
    <div
      ref={popupRef}
      style={{
        ...pickerStyle,
        opacity: animIn ? 1 : 0,
        transform: animIn ? 'translateY(0)' : 'translateY(-4px)',
        transition: 'opacity 140ms ease, transform 140ms ease',
      }}
      className="bg-white rounded-xl overflow-hidden"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        className="rounded-xl"
        style={{
          border: '1px solid var(--line-soft)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.12), 0 0 0 1px var(--gold-glow)',
          background: 'var(--bg-panel)',
        }}
      >
        {/* Stage tabs */}
        <div
          className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 px-3 py-2.5"
          style={{
            background: 'linear-gradient(180deg, rgba(212,175,55,0.08), rgba(212,175,55,0.02))',
            borderBottom: '1px solid var(--line-soft)',
          }}
        >
          {renderStageTab('start')}
          <HiArrowRight
            className="w-3.5 h-3.5 mx-1"
            style={{
              color: stage === 'end' ? 'var(--gold-deep)' : 'var(--ink-low)',
              transition: 'color 180ms ease, transform 180ms ease',
              transform: stage === 'end' ? 'translateX(2px)' : 'none',
            }}
          />
          {renderStageTab('end')}
        </div>

        {/* Month nav */}
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderBottom: '1px solid var(--line-soft)' }}
        >
          <button
            type="button"
            onClick={() => setViewMonth(new Date(currentYear, viewMonth.getMonth() - 1, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-raised)]"
            style={{ color: 'var(--ink-mid)' }}
          >
            <HiChevronLeft className="w-4 h-4" />
          </button>
          <div
            className="text-sm font-medium"
            style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--ink-high)' }}
          >
            {MONTHS[viewMonth.getMonth()]} {currentYear}
          </div>
          <button
            type="button"
            onClick={() => setViewMonth(new Date(currentYear, viewMonth.getMonth() + 1, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-raised)]"
            style={{ color: 'var(--ink-mid)' }}
          >
            <HiChevronRight className="w-4 h-4" />
          </button>
        </div>

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
        <div
          className="grid grid-cols-7 px-2 pb-2"
          style={{ rowGap: 2 }}
          onMouseLeave={() => setHovered(null)}
        >
          {grid.map((d, i) => {
            if (!d) return <div key={i} className="h-9" />;
            const isStart = Boolean(startDate && sameDay(d, startDate));
            const isEnd = Boolean(effectiveEnd && sameDay(d, effectiveEnd));
            const inRange = Boolean(
              startDate && effectiveEnd &&
              startOfDay(d) > startOfDay(startDate) &&
              startOfDay(d) < startOfDay(effectiveEnd),
            );
            const isTodayCell = sameDay(d, today);
            const disabledDay = isDateDisabled(d);
            const isCap = isStart || isEnd;
            const sameStartEnd = isStart && isEnd;

            // Continuous-range background via pseudo container
            let cellBg = 'transparent';
            let cellColor: string = 'var(--ink-high)';
            let cellWeight: number = 400;
            let cellBorder: string = '1px solid transparent';
            let borderRadius = '8px';

            if (inRange) {
              cellBg = 'var(--gold-glow)';
              borderRadius = '0';
              cellColor = 'var(--ink-high)';
            }
            if (isCap) {
              cellBg = 'var(--gold)';
              cellColor = '#fff';
              cellWeight = 600;
              if (sameStartEnd) borderRadius = '8px';
              else if (isStart) borderRadius = '8px 0 0 8px';
              else if (isEnd) borderRadius = '0 8px 8px 0';
            }
            if (!isCap && !inRange && isTodayCell) {
              cellColor = 'var(--gold-deep)';
              cellBorder = '1px solid var(--gold-soft)';
              cellWeight = 600;
            }
            if (disabledDay) {
              cellColor = 'var(--ink-dim)';
            }

            return (
              <button
                key={i}
                type="button"
                disabled={disabledDay}
                onClick={() => handleDayClick(d)}
                onMouseEnter={() => setHovered(d)}
                className="h-9 flex items-center justify-center text-[13px] transition-colors"
                style={{
                  background: cellBg,
                  color: cellColor,
                  fontWeight: cellWeight,
                  border: cellBorder,
                  borderRadius,
                  cursor: disabledDay ? 'not-allowed' : 'pointer',
                  opacity: disabledDay ? 0.4 : 1,
                }}
                onMouseOver={(e) => {
                  if (!isCap && !inRange && !disabledDay) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-raised)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isCap && !inRange && !disabledDay) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }
                }}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderTop: '1px solid var(--line-soft)', background: 'var(--bg-raised)' }}
        >
          <div className="text-[11px]" style={{ color: 'var(--ink-low)' }}>
            {stage === 'start' ? 'Pick check-in date' : 'Pick check-out date'}
          </div>
          {(startValue || endValue) && (
            <button
              type="button"
              onClick={() => {
                onChange({ start: '', end: '' });
                setStage('start');
                flashStage();
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
      <div ref={wrapperRef} className={`relative ${className}`}>
        <div className="flex items-stretch w-full">
          {renderTrigger(startBtnRef, 'start', startDate, startPlaceholder, startLabel, startFilled, 'left')}
          {renderTrigger(endBtnRef, 'end', endDate, endPlaceholder, endLabel, endFilled, 'right')}
        </div>
        {required && (
          <>
            <input
              tabIndex={-1}
              aria-hidden="true"
              required
              value={startValue}
              onChange={() => {}}
              style={{ position: 'absolute', inset: 0, opacity: 0, pointerEvents: 'none', height: 0, width: 0 }}
            />
            <input
              tabIndex={-1}
              aria-hidden="true"
              required
              value={endValue}
              onChange={() => {}}
              style={{ position: 'absolute', inset: 0, opacity: 0, pointerEvents: 'none', height: 0, width: 0 }}
            />
          </>
        )}
      </div>
      {typeof document !== 'undefined' && createPortal(popup, document.body)}
    </>
  );
}
