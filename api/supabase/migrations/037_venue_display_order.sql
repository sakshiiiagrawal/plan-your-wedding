-- Migration 037: user-defined venue ordering. Venues render in this order
-- everywhere (venue list, dropdowns, room allocation), draggable to reorder.

ALTER TABLE venues ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Backfill existing venues per owner, alphabetically, so the current order is
-- preserved as the starting point.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY name) AS rn
  FROM venues
)
UPDATE venues v SET display_order = ranked.rn
FROM ranked WHERE ranked.id = v.id AND v.display_order IS NULL;
