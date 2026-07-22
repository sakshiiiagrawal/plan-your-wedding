import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import { HiOutlineCalendar, HiOutlineX } from 'react-icons/hi';
import 'react-day-picker/style.css';
import {
  CalendarFooter,
  CalendarMonthNav,
  CalendarPanel,
  CalendarYearGrid,
  formatDisplay,
  formatWeekdayName,
  parseISO,
  startOfDay,
  toISO,
  useCalendarPopover,
} from './calendar';

/**
 * Themed date picker that replaces <input type="date">.
 * Value is an ISO date string "YYYY-MM-DD" (or "" when empty) to match native input semantics.
 * Shares its grid and chrome with DateRangePicker via ./calendar.
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
  /** Set false where an empty date is not a valid state (e.g. a day-stepper). */
  clearable?: boolean;
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
  clearable = true,
}: DatePickerProps) {
  const selected = useMemo(() => parseISO(value), [value]);
  const minDate = useMemo(() => parseISO(min || ''), [min]);
  const maxDate = useMemo(() => parseISO(max || ''), [max]);

  const [viewMonth, setViewMonth] = useState(() => selected || new Date());
  const [yearMode, setYearMode] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { isOpen, openAt, close, style, animIn, popupRef, isMobile } =
    useCalendarPopover(wrapperRef);

  useEffect(() => {
    if (selected) setViewMonth(selected);
  }, [selected]);

  const open = () => {
    if (disabled) return;
    setViewMonth(selected || new Date());
    setYearMode(false);
    openAt(triggerRef.current);
  };

  const isDateDisabled = (d: Date) => {
    if (minDate && startOfDay(d) < startOfDay(minDate)) return true;
    if (maxDate && startOfDay(d) > startOfDay(maxDate)) return true;
    return false;
  };

  const handleSelect = (d: Date | undefined) => {
    if (!d || isDateDisabled(d)) return;
    onChange(toISO(d));
    close();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const padY = size === 'sm' ? 'py-1.5' : 'py-[9px]';

  const popup = isOpen ? (
    <CalendarPanel
      popupRef={popupRef}
      style={style}
      animIn={animIn}
      isMobile={isMobile}
      onClose={close}
    >
      <CalendarMonthNav
        month={viewMonth}
        onMonthChange={setViewMonth}
        yearMode={yearMode}
        onToggleYearMode={() => setYearMode((v) => !v)}
        elevated
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
            mode="single"
            selected={selected ?? undefined}
            onSelect={handleSelect}
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
          <button
            type="button"
            onClick={() => handleSelect(new Date())}
            className="text-[11px] font-medium uppercase tracking-wider transition-colors"
            style={{ color: 'var(--gold-deep)', letterSpacing: '0.1em' }}
          >
            Today
          </button>
        }
        onClear={
          value && clearable
            ? () => {
                onChange('');
                close();
              }
            : undefined
        }
      />
    </CalendarPanel>
  ) : null;

  return (
    <>
      <div ref={wrapperRef} className={`relative ${className}`}>
        <button
          ref={triggerRef}
          id={id}
          name={name}
          type="button"
          onClick={() => (isOpen ? close() : open())}
          disabled={disabled}
          className={`input pl-9 ${value && clearable ? 'pr-9' : 'pr-3'} ${padY} text-left flex items-center`}
          style={{
            color: selected ? 'var(--ink-high)' : 'var(--ink-dim)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
            boxShadow: isOpen ? '0 0 0 3px var(--gold-glow)' : undefined,
            borderColor: isOpen ? 'var(--gold)' : undefined,
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
        {value && clearable && !disabled && (
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
