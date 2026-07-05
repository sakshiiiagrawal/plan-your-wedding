-- Migration 028: Store a photo URL for venues sourced from Google Places (New).
-- Only the URL Google returns is stored — no image bytes are downloaded or
-- re-hosted.

BEGIN;

ALTER TABLE venues ADD COLUMN IF NOT EXISTS photo_url TEXT;

COMMIT;
