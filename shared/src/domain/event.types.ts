import type { TableRow, TableInsert } from '../supabase.generated';
import type { VenueRow } from './venue.types';

// ---------------------------------------------------------------------------
// Raw DB rows
// ---------------------------------------------------------------------------

export type EventRow = TableRow<'events'>;
export type EventInsert = TableInsert<'events'>;

// ---------------------------------------------------------------------------
// Derived / joined types
// ---------------------------------------------------------------------------

/** An event with its venue record eagerly loaded. */
export interface EventWithVenue extends EventRow {
  venue: VenueRow | null;
}

/**
 * Whitelisted event shape served to unauthenticated visitors of the public
 * wedding site. Never add budget, guest-count, or contact fields here.
 */
export interface PublicEventPayload {
  id: string;
  name: string;
  event_type: string;
  description: string | null;
  date: string;
  start_time: string;
  end_time: string | null;
  dress_code: string | null;
  color: string | null;
  venue: {
    name: string;
    address: string | null;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
}
