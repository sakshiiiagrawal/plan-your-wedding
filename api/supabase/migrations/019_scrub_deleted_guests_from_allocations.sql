-- Migration 019: Remove deleted guests from room_allocations.guest_ids
-- guest_ids is a UUID[] and cannot carry per-element foreign keys, so deleting
-- a guest (directly, or via the guests.vendor_id ON DELETE CASCADE) left the
-- orphaned id inside every allocation array. Phantom ids inflate occupancy
-- counts (wrong "room full" errors) and pollute unassigned-guest lists.
-- A trigger covers every delete path, including cascades.

-- One-time cleanup of existing dangling references
UPDATE room_allocations ra
SET guest_ids = (
  SELECT COALESCE(array_agg(gid), '{}')
  FROM unnest(ra.guest_ids) AS gid
  WHERE EXISTS (SELECT 1 FROM guests g WHERE g.id = gid)
)
WHERE EXISTS (
  SELECT 1
  FROM unnest(ra.guest_ids) AS gid
  WHERE NOT EXISTS (SELECT 1 FROM guests g WHERE g.id = gid)
);

-- Keep arrays clean going forward
CREATE OR REPLACE FUNCTION scrub_guest_from_room_allocations()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE room_allocations
  SET guest_ids = array_remove(guest_ids, OLD.id),
      updated_at = NOW()
  WHERE OLD.id = ANY (guest_ids);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_scrub_guest_from_room_allocations ON guests;
CREATE TRIGGER trg_scrub_guest_from_room_allocations
  AFTER DELETE ON guests
  FOR EACH ROW
  EXECUTE FUNCTION scrub_guest_from_room_allocations();
