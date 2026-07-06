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

/** Format a date string for display, parsing date-only values in local time. */
export function formatDate(value: string, options: Intl.DateTimeFormatOptions): string {
  return parseLocalDate(value).toLocaleDateString('en-IN', options);
}
