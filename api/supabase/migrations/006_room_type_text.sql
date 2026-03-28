-- Migration 006: Convert room_type column from ENUM to TEXT
-- Allows hotel-style category names (Standard, Deluxe, Suite, etc.)
-- and user-defined custom categories.

BEGIN;

-- Cast the existing enum values to text (Postgres allows ALTER COLUMN ... USING)
ALTER TABLE rooms
  ALTER COLUMN room_type TYPE TEXT
  USING room_type::TEXT;

-- Drop the now-unused enum type
DROP TYPE IF EXISTS room_type;

COMMIT;
