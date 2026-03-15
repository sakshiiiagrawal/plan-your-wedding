import type { TableRow, TableInsert } from '../supabase.generated';

// ---------------------------------------------------------------------------
// Raw DB rows
// ---------------------------------------------------------------------------

export type VendorRow = TableRow<'vendors'>;
export type VendorInsert = TableInsert<'vendors'>;
