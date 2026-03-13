import type { TableRow, TableInsert } from "../supabase.generated";

// ---------------------------------------------------------------------------
// Raw DB rows
// ---------------------------------------------------------------------------

export type UserRow = TableRow<"users">;
export type UserInsert = TableInsert<"users">;

// ---------------------------------------------------------------------------
// Role helpers
// ---------------------------------------------------------------------------

export const USER_ROLES = ["admin", "family", "friends"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// ---------------------------------------------------------------------------
// Application-level user (password_hash stripped)
// ---------------------------------------------------------------------------

export type AuthenticatedUser = Omit<UserRow, "password_hash">;
