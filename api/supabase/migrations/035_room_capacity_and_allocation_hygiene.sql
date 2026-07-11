-- Migration 035: capacity is always >= 1; empty allocations must not exist.

-- 1. Backfill and constrain rooms.capacity (2 = standard double occupancy default)
UPDATE rooms SET capacity = 2 WHERE capacity IS NULL OR capacity < 1;
ALTER TABLE rooms ALTER COLUMN capacity SET DEFAULT 2;
ALTER TABLE rooms ALTER COLUMN capacity SET NOT NULL;

-- 2. One-time purge of allocations that lost all their guests
DELETE FROM room_allocations WHERE guest_ids IS NULL OR cardinality(guest_ids) = 0;

-- 3. Scrub trigger (replaces migration 019 version): also delete allocations that
--    become empty after the scrub.
CREATE OR REPLACE FUNCTION scrub_guest_from_room_allocations()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE room_allocations
  SET guest_ids = array_remove(guest_ids, OLD.id),
      updated_at = NOW()
  WHERE OLD.id = ANY (guest_ids);

  DELETE FROM room_allocations WHERE cardinality(guest_ids) = 0;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
