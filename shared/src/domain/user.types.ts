import type { TableRow, TableInsert } from '../supabase.generated';

export type UserRow = TableRow<'users'>;
export type UserInsert = TableInsert<'users'>;
export type AuthenticatedUser = Omit<UserRow, 'password_hash'>;
