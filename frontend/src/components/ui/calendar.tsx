import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

/**
 * Shared chrome for every calendar surface in the app.
 *
 * Both DatePicker and DateRangePicker render react-day-picker for the grid itself
 * (keyboard nav, month boundaries, a11y) with its own caption/nav hidden, and wrap it
 * in the pieces below. Anything that changes the look of a calendar belongs here, so
 * the single-date and range popups can never drift apart.
 */

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const MONTHS_SHORT = [
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

const WEEKDAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** Weekday header labels, so both calendars letter them the same way. */
export const formatWeekdayName = (date: Date): string => WEEKDAYS_SHORT[date.getDay()] ?? '';

export function parseISO(v: string): Date | null {
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function formatDisplay(d: Date): string {
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

const POPUP_WIDTH = 320;
/** Only a fallback for the first frame, before the panel can be measured. */
const POPUP_HEIGHT_ESTIMATE = 380;
const VIEWPORT_MARGIN = 12;
const MOBILE_QUERY = '(max-width: 639px)';

/**
 * Popup shell shared by both pickers: outside-click, Escape, and the fade-in.
 *
 * Above the mobile breakpoint it is a fixed popup anchored to the trigger. The panel is
 * *measured* rather than assumed — an earlier hardcoded height guessed short, so the
 * flip-above branch placed tall panels (range picker with stage tabs + footer) partly
 * off the top of the screen. Below the breakpoint anchoring is abandoned entirely for a
 * bottom sheet, since a 320px popup on a ~400px viewport covers whatever it belongs to.
 */
export function useCalendarPopover(wrapperRef: React.RefObject<HTMLElement | null>) {
  const popupRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [animIn, setAnimIn] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const reposition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const height = popupRef.current?.offsetHeight || POPUP_HEIGHT_ESTIMATE;
    const width = Math.min(POPUP_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);

    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - VIEWPORT_MARGIN;
    const placeAbove = spaceBelow < height && spaceAbove > spaceBelow;

    const top = Math.max(
      VIEWPORT_MARGIN,
      Math.min(
        placeAbove ? rect.top - height - 6 : rect.bottom + 6,
        window.innerHeight - height - VIEWPORT_MARGIN,
      ),
    );
    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(rect.left, window.innerWidth - width - VIEWPORT_MARGIN),
    );

    setStyle({
      position: 'fixed',
      top,
      left,
      width,
      maxHeight: window.innerHeight - VIEWPORT_MARGIN * 2,
      overflowY: 'auto',
      zIndex: 9999,
    });
  }, []);

  const openAt = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    anchorRef.current = el;
    setAnimIn(false);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setAnimIn(false);
  }, []);

  // Measure and place before paint, so the panel never shows at a wrong position.
  useLayoutEffect(() => {
    if (!isOpen || isMobile) return;
    reposition();
  }, [isOpen, isMobile, reposition]);

  useEffect(() => {
    if (!isOpen || isMobile) return;
    const onChange = () => reposition();
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    return () => {
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange, true);
    };
  }, [isOpen, isMobile, reposition]);

  // The sheet owns the screen; let it scroll instead of the page behind it.
  useEffect(() => {
    if (!isOpen || !isMobile) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen, isMobile]);

  useEffect(() => {
    if (!isOpen) return;
    const t = requestAnimationFrame(() => setAnimIn(true));
    return () => cancelAnimationFrame(t);
  }, [isOpen]);

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
  }, [isOpen, close, wrapperRef]);

  return { isOpen, openAt, close, style, animIn, popupRef, isMobile };
}

/**
 * The bordered, shadowed panel every calendar popup lives inside — an anchored popup on
 * desktop, a backdropped bottom sheet on mobile (see useCalendarPopover).
 */
export function CalendarPanel({
  popupRef,
  style,
  animIn,
  isMobile,
  onClose,
  children,
}: {
  popupRef: React.RefObject<HTMLDivElement | null>;
  style: React.CSSProperties;
  animIn: boolean;
  isMobile?: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}) {
  const card = (
    <div
      className={isMobile ? 'rounded-t-2xl overflow-hidden' : 'rounded-xl overflow-hidden'}
      style={{
        border: '1px solid var(--line-soft)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.12), 0 0 0 1px var(--gold-glow)',
        background: 'var(--bg-panel)',
      }}
    >
      {children}
    </div>
  );

  if (isMobile) {
    return (
      <div
        className="fixed inset-0 flex items-end justify-center"
        style={{
          zIndex: 9999,
          background: 'rgba(0,0,0,0.45)',
          opacity: animIn ? 1 : 0,
          transition: 'opacity 160ms ease',
        }}
      >
        <div
          ref={popupRef}
          role="dialog"
          aria-modal="true"
          className="w-full overflow-y-auto"
          style={{
            maxHeight: '88vh',
            transform: animIn ? 'translateY(0)' : 'translateY(16px)',
            transition: 'transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            className="flex items-center justify-between px-3 pt-2 pb-1 rounded-t-2xl"
            style={{ background: 'var(--bg-panel)' }}
          >
            <span className="w-12" aria-hidden="true" />
            <span
              className="h-1 w-9 rounded-full"
              style={{ background: 'var(--line)' }}
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={onClose}
              className="w-12 text-right text-[12px] font-medium uppercase tracking-wider"
              style={{ color: 'var(--gold-deep)', letterSpacing: '0.1em' }}
            >
              Done
            </button>
          </div>
          {card}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={popupRef}
      style={{
        ...style,
        opacity: animIn ? 1 : 0,
        transform: animIn ? 'translateY(0)' : 'translateY(-4px)',
        transition: 'opacity 140ms ease, transform 140ms ease',
      }}
      className="bg-surface-panel rounded-xl overflow-hidden"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {card}
    </div>
  );
}

/** Gradient wash used by whichever row sits at the top of the popup. */
export const calendarTopRowStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(176,141,62,0.08), rgba(176,141,62,0.02))',
  borderBottom: '1px solid var(--line-soft)',
};

const navButtonClass =
  'w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-raised)]';

/** ‹ Month Year › — replaces react-day-picker's own caption/nav in both pickers. */
export function CalendarMonthNav({
  month,
  onMonthChange,
  yearMode,
  onToggleYearMode,
  elevated,
}: {
  month: Date;
  onMonthChange: (next: Date) => void;
  yearMode: boolean;
  onToggleYearMode: () => void;
  elevated?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2"
      style={elevated ? calendarTopRowStyle : { borderBottom: '1px solid var(--line-soft)' }}
    >
      <button
        type="button"
        onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
        className={navButtonClass}
        style={{ color: 'var(--ink-mid)' }}
        aria-label="Previous month"
      >
        <HiChevronLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onToggleYearMode}
        className="px-2 py-1 rounded transition-colors hover:bg-[var(--bg-raised)]"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '15px',
          color: 'var(--ink-high)',
        }}
        aria-label={yearMode ? 'Back to days' : 'Choose year'}
      >
        {MONTHS[month.getMonth()]} {month.getFullYear()}
      </button>
      <button
        type="button"
        onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
        className={navButtonClass}
        style={{ color: 'var(--ink-mid)' }}
        aria-label="Next month"
      >
        <HiChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

/** Year grid shown when the caption is toggled — same in both pickers. */
export function CalendarYearGrid({
  month,
  onSelectYear,
}: {
  month: Date;
  onSelectYear: (year: number) => void;
}) {
  const currentYear = month.getFullYear();
  const start = currentYear - 6;
  const years = Array.from({ length: 16 }, (_, i) => start + i);
  return (
    <div className="p-3 grid grid-cols-4 gap-1.5">
      {years.map((y) => {
        const active = y === currentYear;
        return (
          <button
            key={y}
            type="button"
            onClick={() => onSelectYear(y)}
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
  );
}

/** Bottom row: shortcut on the left, Clear on the right. */
export function CalendarFooter({
  left,
  onClear,
}: {
  left: React.ReactNode;
  onClear?: (() => void) | undefined;
}) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2"
      style={{ borderTop: '1px solid var(--line-soft)', background: 'var(--bg-raised)' }}
    >
      {left}
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] font-medium uppercase tracking-wider transition-colors hover:text-[var(--ink-mid)]"
          style={{ color: 'var(--ink-low)', letterSpacing: '0.1em' }}
        >
          Clear
        </button>
      )}
    </div>
  );
}
