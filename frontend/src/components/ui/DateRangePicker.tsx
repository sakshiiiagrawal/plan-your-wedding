import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker, type DateRange } from 'react-day-picker';
import { HiOutlineCalendar, HiArrowRight } from 'react-icons/hi';
import 'react-day-picker/style.css';

/**
 * Joined date-range picker — two triggers, one shared popup.
 * Picking the start date auto-advances the popup to check-out selection with a subtle fade.
 * Calendar grid itself is react-day-picker (keyboard nav, month boundaries, a11y built in).
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

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
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
  };

  const openAt = (which: Stage) => {
    if (disabled) return;
    const el = which === 'start' ? startBtnRef.current : endBtnRef.current;
    if (!el) return;
    positionFromTrigger(el);
    // Choose initial stage: end trigger with no start yet still starts at 'start'.
    const initialStage: Stage = which === 'end' && startDate ? 'end' : 'start';
    setStage(initialStage);
    const focusDate = initialStage === 'end' ? endDate || startDate : startDate || endDate;
    setViewMonth(focusDate || new Date());
    setAnimIn(false);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setAnimIn(false);
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

  const selectedRange: DateRange | undefined = startDate
    ? { from: startDate, to: endDate ?? undefined }
    : undefined;

  const handleRangeSelect = (next: DateRange | undefined) => {
    onChange({ start: next?.from ? toISO(next.from) : '', end: next?.to ? toISO(next.to) : '' });
    if (next?.from && next?.to) {
      close();
      return;
    }
    if (next?.from) {
      setStage('end');
      flashStage();
      return;
    }
    setStage('start');
  };

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
          const focus = s === 'end' ? endDate || startDate : startDate || endDate;
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
          style={{
            color: isActive ? 'var(--gold-deep)' : 'var(--ink-low)',
            letterSpacing: '0.12em',
          }}
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
    const borderRadius = joinSide === 'left' ? '8px 0 0 8px' : '0 8px 8px 0';
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
        <HiOutlineCalendar
          className="w-4 h-4 flex-shrink-0"
          style={{ color: 'var(--gold-deep)' }}
        />
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
      className="bg-surface-panel rounded-xl overflow-hidden"
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
            background: 'linear-gradient(180deg, rgba(176,141,62,0.08), rgba(176,141,62,0.02))',
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

        {/* Calendar — react-day-picker handles month nav, weekday header, and keyboard nav */}
        <div
          className="px-2 pt-1 pb-2"
          style={
            {
              '--rdp-accent-color': 'var(--gold)',
              '--rdp-accent-background-color': 'var(--gold-glow)',
              '--rdp-today-color': 'var(--gold-deep)',
              '--rdp-day-height': '36px',
              '--rdp-day-width': '36px',
              fontFamily: 'inherit',
              fontSize: 13,
            } as React.CSSProperties
          }
        >
          <DayPicker
            mode="range"
            selected={selectedRange}
            onSelect={handleRangeSelect}
            month={viewMonth}
            onMonthChange={setViewMonth}
            disabled={isDateDisabled}
            showOutsideDays
          />
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
          {renderTrigger(
            startBtnRef,
            'start',
            startDate,
            startPlaceholder,
            startLabel,
            startFilled,
            'left',
          )}
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
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0,
                pointerEvents: 'none',
                height: 0,
                width: 0,
              }}
            />
            <input
              tabIndex={-1}
              aria-hidden="true"
              required
              value={endValue}
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
          </>
        )}
      </div>
      {typeof document !== 'undefined' && createPortal(popup, document.body)}
    </>
  );
}
