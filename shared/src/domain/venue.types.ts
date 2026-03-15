import type { TableRow, TableInsert } from '../supabase.generated';

// ---------------------------------------------------------------------------
// Raw DB rows
// ---------------------------------------------------------------------------

export type VenueRow = TableRow<'venues'>;
export type VenueInsert = TableInsert<'venues'>;
