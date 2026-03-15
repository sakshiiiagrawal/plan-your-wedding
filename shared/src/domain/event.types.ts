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
