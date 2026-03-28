import type { TableRow, TableInsert } from '../supabase.generated';

// ---------------------------------------------------------------------------
// Venue
// ---------------------------------------------------------------------------

export type VenueRow = TableRow<'venues'>;
export type VenueInsert = TableInsert<'venues'>;

// ---------------------------------------------------------------------------
// Rooms (moved here from accommodation.types.ts — table dropped)
// ---------------------------------------------------------------------------

export type RoomRow = TableRow<'rooms'>;
export type RoomInsert = TableInsert<'rooms'>;

export type RoomAllocationRow = TableRow<'room_allocations'>;
export type RoomAllocationInsert = TableInsert<'room_allocations'>;

/** A room with all its current allocations eagerly loaded. */
export interface RoomWithAllocations extends RoomRow {
  allocations: RoomAllocationRow[];
}
