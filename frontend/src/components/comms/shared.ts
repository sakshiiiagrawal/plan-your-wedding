import type { PillVariant } from '../ui';

/** WhatsApp brand greens, used as the channel accent. */
export const WA_GREEN = '#128C7E';
export const WA_LIGHT = '#25D366';

export const STATUS_VARIANT: Record<string, PillVariant> = {
  // Meta template approval states
  APPROVED: 'ok',
  PENDING: 'warn',
  REJECTED: 'err',
  NOT_CREATED: 'muted',
  // message delivery states
  sent: 'info',
  delivered: 'ok',
  read: 'ok',
  failed: 'err',
  received: 'gold',
};

/** Minimal guest shape the messaging UI needs from the Guests page. */
export interface CommsGuest {
  id: string;
  first_name: string;
  last_name?: string | null;
  phone?: string | null;
}

export function guestName(g: CommsGuest): string {
  return `${g.first_name} ${g.last_name ?? ''}`.trim();
}

/** "2:14 PM" today, "18 Jul, 2:14 PM" otherwise. */
export function fmtWhen(iso: string): string {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return time;
  return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${time}`;
}

export function apiError(e: unknown, fallback: string): string {
  return (
    (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback
  );
}
