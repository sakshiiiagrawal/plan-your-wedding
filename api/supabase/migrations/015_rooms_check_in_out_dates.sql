-- Per-room check-in / check-out dates so the same category can be booked
-- across different days with different counts.
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS check_in_date DATE,
  ADD COLUMN IF NOT EXISTS check_out_date DATE;

-- Backfill existing rooms with the venue-level defaults (if present).
UPDATE rooms r
SET
  check_in_date = COALESCE(r.check_in_date, v.default_check_in_date),
  check_out_date = COALESCE(r.check_out_date, v.default_check_out_date)
FROM venues v
WHERE r.venue_id = v.id
  AND (r.check_in_date IS NULL OR r.check_out_date IS NULL);

CREATE INDEX IF NOT EXISTS idx_rooms_check_in_date ON rooms (venue_id, check_in_date);
