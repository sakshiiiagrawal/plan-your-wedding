-- Migration 036: day-of check-in/check-out tracking per guest per stay.
ALTER TABLE room_allocations
  ADD COLUMN IF NOT EXISTS checked_in_guest_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS checked_out_guest_ids uuid[] NOT NULL DEFAULT '{}';

-- Scrub trigger v3: clean deleted guests from all three arrays, then drop empties.
CREATE OR REPLACE FUNCTION scrub_guest_from_room_allocations()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE room_allocations
  SET guest_ids = array_remove(guest_ids, OLD.id),
      checked_in_guest_ids = array_remove(checked_in_guest_ids, OLD.id),
      checked_out_guest_ids = array_remove(checked_out_guest_ids, OLD.id),
      updated_at = NOW()
  WHERE OLD.id = ANY (guest_ids)
     OR OLD.id = ANY (checked_in_guest_ids)
     OR OLD.id = ANY (checked_out_guest_ids);

  DELETE FROM room_allocations WHERE cardinality(guest_ids) = 0;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
