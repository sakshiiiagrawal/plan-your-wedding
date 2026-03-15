import type { TableRow, TableInsert } from '../supabase.generated';

// ---------------------------------------------------------------------------
// Raw DB rows
// ---------------------------------------------------------------------------

export type AccommodationRow = TableRow<'accommodations'>;
export type AccommodationInsert = TableInsert<'accommodations'>;

export type RoomRow = TableRow<'rooms'>;
export type RoomInsert = TableInsert<'rooms'>;

export type RoomAllocationRow = TableRow<'room_allocations'>;
export type RoomAllocationInsert = TableInsert<'room_allocations'>;

// ---------------------------------------------------------------------------
// Derived / joined types
// ---------------------------------------------------------------------------

/** A room with all its current allocations eagerly loaded. */
export interface RoomWithAllocations extends RoomRow {
  allocations: RoomAllocationRow[];
}
