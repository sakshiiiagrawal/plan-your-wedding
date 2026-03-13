import type { TableRow, TableInsert } from "../supabase.generated";

// ---------------------------------------------------------------------------
// Raw DB rows
// ---------------------------------------------------------------------------

export type GuestRow = TableRow<"guests">;
export type GuestInsert = TableInsert<"guests">;

export type GuestGroupRow = TableRow<"guest_groups">;
export type GuestGroupInsert = TableInsert<"guest_groups">;

export type GuestEventRsvpRow = TableRow<"guest_event_rsvp">;
export type GuestEventRsvpInsert = TableInsert<"guest_event_rsvp">;

// ---------------------------------------------------------------------------
// Derived / joined types
// ---------------------------------------------------------------------------

/** A guest record with its group and RSVP list eagerly loaded. */
export interface GuestWithDetails extends GuestRow {
  group: GuestGroupRow | null;
  rsvps: GuestEventRsvpRow[];
}
