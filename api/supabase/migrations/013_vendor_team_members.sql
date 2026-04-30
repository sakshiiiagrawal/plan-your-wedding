-- Migration 013: Vendor logistics + team-member guests
--
-- Vendors can declare logistical needs (food, accommodation, team_size).
-- Their team members are represented as regular guests (guest_type = 'vendor_team')
-- linked back to the vendor, so the existing accommodation, RSVP, and meal-count
-- pipelines work unchanged.

CREATE TYPE guest_type AS ENUM ('guest', 'vendor_team');

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS needs_food BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS needs_accommodation BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS team_size INTEGER NOT NULL DEFAULT 1
    CHECK (team_size >= 0);

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS guest_type guest_type NOT NULL DEFAULT 'guest',
  ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE;

-- A vendor_team guest must be tied to a vendor; a regular guest must not be.
ALTER TABLE guests
  ADD CONSTRAINT guests_vendor_link_chk
  CHECK (
    (guest_type = 'vendor_team' AND vendor_id IS NOT NULL)
    OR (guest_type = 'guest' AND vendor_id IS NULL)
  );

CREATE INDEX IF NOT EXISTS guests_vendor_id_idx ON guests(vendor_id);
