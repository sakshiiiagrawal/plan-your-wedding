-- Migration 014: Replace manual google_maps_link with structured place data.
-- Adds place_id + latitude/longitude from the Places provider; drops the
-- free-form maps link column (the URL is now derived from place_id at render).

BEGIN;

ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS place_id TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

ALTER TABLE venues DROP COLUMN IF EXISTS google_maps_link;

CREATE INDEX IF NOT EXISTS idx_venues_place_id ON venues(place_id) WHERE place_id IS NOT NULL;

COMMIT;
