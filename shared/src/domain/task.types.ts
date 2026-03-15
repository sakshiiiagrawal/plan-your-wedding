import type { TableRow, TableInsert } from '../supabase.generated';

// ---------------------------------------------------------------------------
// Raw DB rows
// ---------------------------------------------------------------------------

export type TaskRow = TableRow<'tasks'>;
export type TaskInsert = TableInsert<'tasks'>;
