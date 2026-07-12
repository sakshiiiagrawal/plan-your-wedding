const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parse a date string in local time. `new Date('YYYY-MM-DD')` parses as UTC
 * midnight, which shifts the date a day earlier for users west of UTC — so
 * date-only strings are expanded into local year/month/day instead.
 */
export function parseLocalDate(value: string): Date {
  const m = DATE_ONLY.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(value);
}

/**
 * Today's date as a YYYY-MM-DD string in the user's local timezone, computed at
 * call time. Prefer this over `new Date().toISOString().slice(0, 10)`, which
 * yields the UTC date (a day ahead for users east of UTC after ~evening) and
 * over module-level constants, which go stale after midnight.
 */
export function todayLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Add whole months to a YYYY-MM-DD string, clamping the day of month so
 * Jan 31 + 1 month → Feb 28 (not Mar 3). Returns a YYYY-MM-DD string.
 */
export function addMonthsClamped(value: string, months: number): string {
  const m = DATE_ONLY.exec(value);
  if (!m) return value;
  const year = Number(m[1]);
  const month0 = Number(m[2]) - 1;
  const day = Number(m[3]);
  const target = new Date(year, month0 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const clampedDay = Math.min(day, lastDay);
  const y = target.getFullYear();
  const mm = String(target.getMonth() + 1).padStart(2, '0');
  const dd = String(clampedDay).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

/** Format a date string for display, parsing date-only values in local time. */
export function formatDate(value: string, options: Intl.DateTimeFormatOptions): string {
  return parseLocalDate(value).toLocaleDateString('en-IN', options);
}
