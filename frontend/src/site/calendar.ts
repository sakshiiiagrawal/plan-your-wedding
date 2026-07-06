import type { PublicEvent, PublicEventVenue } from './types';

/** '18:30:00' → '6:30 PM' (empty string when the time is missing/unparseable). */
export function formatEventTime(time: string | null): string {
  if (!time) return '';
  const [h = NaN, m = NaN] = time.split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** '2026-12-12' → 'Saturday, 12 December 2026'. */
export function formatEventDate(
  date: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  },
): string {
  const [y, mo, d] = date.split('-').map((n) => parseInt(n, 10));
  if (!y || !mo || !d) return date;
  return new Date(y, mo - 1, d).toLocaleDateString('en-IN', options);
}

/** Google Maps deep link for a venue — lat/lng when present, else the address text. */
export function directionsUrl(venue: PublicEventVenue | null): string | null {
  if (!venue) return null;
  if (venue.latitude != null && venue.longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}`;
  }
  const query = [venue.name, venue.address, venue.city].filter(Boolean).join(', ');
  return query
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`
    : null;
}

function icsStamp(date: string, time: string | null): string {
  const d = date.replace(/-/g, '');
  const t = (time ?? '00:00:00').replace(/:/g, '').slice(0, 6).padEnd(6, '0');
  return `${d}T${t}`;
}

/** 'YYYY-MM-DD' + n days, staying in plain local-date strings. */
function addDays(date: string, days: number): string {
  const [y = 0, mo = 1, d = 1] = date.split('-').map((n) => parseInt(n, 10));
  const next = new Date(y, mo - 1, d + days);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(
    next.getDate(),
  ).padStart(2, '0')}`;
}

/** Safe download filename for an event's .ics (event names may contain '/'). */
export function icsFileName(eventName: string): string {
  return `${eventName.replace(/[\\/:*?"<>|]/g, '-').trim() || 'event'}.ics`;
}

function icsEscape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/** Downloadable .ics data URI for one event (floating local time; 2h default duration). */
export function calendarUrl(event: PublicEvent, coupleNames: string): string {
  const start = icsStamp(event.date, event.start_time);
  let end: string;
  if (event.end_time) {
    // An end time earlier than the start means the event crosses midnight
    const endDate = event.end_time < (event.start_time ?? '') ? addDays(event.date, 1) : event.date;
    end = icsStamp(endDate, event.end_time);
  } else {
    const [h, m] = (event.start_time ?? '00:00:00').split(':').map((n) => parseInt(n, 10) || 0);
    const endH = (h ?? 0) + 2;
    end = icsStamp(
      endH >= 24 ? addDays(event.date, 1) : event.date,
      `${String(endH % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`,
    );
  }
  const location = event.venue
    ? [event.venue.name, event.venue.address, event.venue.city].filter(Boolean).join(', ')
    : '';
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Plan Your Wedding//Public Site//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@plan-your-wedding`,
    `SUMMARY:${icsEscape(`${event.name} — ${coupleNames}`)}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    location ? `LOCATION:${icsEscape(location)}` : '',
    event.description ? `DESCRIPTION:${icsEscape(event.description)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
