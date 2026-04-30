-- Migration 017: Backfill vendor logistics columns and vendor-team guest schema
--
-- Some databases missed 013_vendor_team_members.sql, which leaves the vendors
-- table without needs_food / needs_accommodation / team_size and breaks vendor
-- create/update flows. This migration safely backfills the missing schema.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'guest_type'
  ) THEN
    CREATE TYPE guest_type AS ENUM ('guest', 'vendor_team');
  END IF;
END $$;

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS needs_food BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS needs_accommodation BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS team_size INTEGER NOT NULL DEFAULT 1
    CHECK (team_size >= 0);

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS guest_type guest_type NOT NULL DEFAULT 'guest',
  ADD COLUMN IF NOT EXISTS vendor_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'guests_vendor_id_fkey'
  ) THEN
    ALTER TABLE guests
      ADD CONSTRAINT guests_vendor_id_fkey
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'guests_vendor_link_chk'
  ) THEN
    ALTER TABLE guests
      ADD CONSTRAINT guests_vendor_link_chk
      CHECK (
        (guest_type = 'vendor_team' AND vendor_id IS NOT NULL)
        OR (guest_type = 'guest' AND vendor_id IS NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS guests_vendor_id_idx ON guests(vendor_id);
