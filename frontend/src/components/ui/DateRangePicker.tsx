import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker, type DateRange } from 'react-day-picker';
import { HiOutlineCalendar, HiArrowRight } from 'react-icons/hi';
import 'react-day-picker/style.css';
import {
  CalendarFooter,
  CalendarMonthNav,
  CalendarPanel,
  CalendarYearGrid,
  calendarTopRowStyle,
  formatDisplay,
  formatWeekdayName,
  parseISO,
  startOfDay,
  toISO,
  useCalendarPopover,
} from './calendar';

/**
 * Joined date-range picker — two triggers, one shared popup.
 * Picking the start date auto-advances the popup to check-out selection with a subtle fade.
 * Grid and chrome come from ./calendar, so this matches DatePicker exactly.
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

  const [stage, setStage] = useState<Stage>('start');
  const [viewMonth, setViewMonth] = useState<Date>(() => startDate || new Date());
  const [yearMode, setYearMode] = useState(false);
  const [stageFlash, setStageFlash] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const startBtnRef = useRef<HTMLButtonElement>(null);
  const endBtnRef = useRef<HTMLButtonElement>(null);
  const {
    isOpen,
    openAt,
    close: closePopover,
    style,
    animIn,
    popupRef,
    isMobile,
  } = useCalendarPopover(wrapperRef);

  const close = () => {
    closePopover();
    setStage('start');
    setYearMode(false);
  };

  const openStage = (which: Stage) => {
    if (disabled) return;
    // The end trigger with no start yet still begins at 'start'.
    const initialStage: Stage = which === 'end' && startDate ? 'end' : 'start';
    setStage(initialStage);
    const focusDate = initialStage === 'end' ? endDate || startDate : startDate || endDate;
    setViewMonth(focusDate || new Date());
    setYearMode(false);
    openAt(which === 'start' ? startBtnRef.current : endBtnRef.current);
  };

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

  /**
   * Selection is driven by `stage` and the clicked day, not by react-day-picker's
   * accumulated range: its first click on an empty range yields `{from: d, to: d}`,
   * which would read as a finished range and close the popup on the check-in click.
   */
  const handleRangeSelect = (_next: DateRange | undefined, day: Date) => {
    if (!day || isDateDisabled(day)) return;
    const iso = toISO(day);

    if (stage === 'start') {
      // Keep an existing check-out only while it still sits after the new check-in.
      const keptEnd = endDate && startOfDay(endDate) > startOfDay(day) ? endValue : '';
      onChange({ start: iso, end: keptEnd });
      if (keptEnd) {
        close();
        return;
      }
      setStage('end');
      flashStage();
      return;
    }

    // Check-out on or before check-in restarts the range from that day.
    if (!startDate || startOfDay(day) <= startOfDay(startDate)) {
      onChange({ start: iso, end: '' });
      setStage('end');
      flashStage();
      return;
    }

    onChange({ start: startValue, end: iso });
    close();
  };

  const triggerPadY = size === 'sm' ? 'py-1.5' : 'py-[9px]';
  const triggerFontSize = size === 'sm' ? 12 : 13;

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
    // Don't echo the label back as the empty state — "CHECK-IN / Check-in" reads as a bug.
    const emptyText =
      label && label.trim().toLowerCase() === placeholder.trim().toLowerCase()
        ? 'Select date'
        : placeholder;
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        onClick={() => (isOpen && stage === which ? close() : openStage(which))}
        className={`date-trigger flex items-center gap-2 px-3 ${triggerPadY} text-left transition-colors flex-1 min-w-0`}
        style={{
          fontSize: triggerFontSize,
          borderRadius,
          borderRightWidth: joinSide === 'left' ? 0 : 1,
          color: filled ? 'var(--ink-high)' : 'var(--ink-dim)',
          opacity: disabled ? 0.6 : 1,
          // Leave border/shadow to CSS when idle so :hover and :focus-visible can win —
          // an inline value always beats a stylesheet rule.
          ...(active && { borderColor: 'var(--gold)', boxShadow: '0 0 0 3px var(--gold-glow)' }),
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
            {value ? formatDisplay(value) : emptyText}
          </span>
        </span>
      </button>
    );
  };

  const popup = isOpen ? (
    <CalendarPanel
      popupRef={popupRef}
      style={style}
      animIn={animIn}
      isMobile={isMobile}
      onClose={close}
    >
      {/* Stage tabs */}
      <div
        className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 px-3 py-2.5"
        style={calendarTopRowStyle}
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

      <CalendarMonthNav
        month={viewMonth}
        onMonthChange={setViewMonth}
        yearMode={yearMode}
        onToggleYearMode={() => setYearMode((v) => !v)}
      />

      {yearMode ? (
        <CalendarYearGrid
          month={viewMonth}
          onSelectYear={(y) => {
            setViewMonth(new Date(y, viewMonth.getMonth(), 1));
            setYearMode(false);
          }}
        />
      ) : (
        <div className="rdp-theme px-2 pt-1 pb-2">
          <DayPicker
            mode="range"
            selected={selectedRange}
            onSelect={handleRangeSelect}
            month={viewMonth}
            onMonthChange={setViewMonth}
            disabled={isDateDisabled}
            formatters={{ formatWeekdayName }}
            hideNavigation
            showOutsideDays
          />
        </div>
      )}

      <CalendarFooter
        left={
          <div className="text-[11px]" style={{ color: 'var(--ink-low)' }}>
            {stage === 'start' ? 'Pick check-in date' : 'Pick check-out date'}
          </div>
        }
        onClear={
          startValue || endValue
            ? () => {
                onChange({ start: '', end: '' });
                setStage('start');
                flashStage();
              }
            : undefined
        }
      />
    </CalendarPanel>
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
            Boolean(startDate),
            'left',
          )}
          {renderTrigger(
            endBtnRef,
            'end',
            endDate,
            endPlaceholder,
            endLabel,
            Boolean(endDate),
            'right',
          )}
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
