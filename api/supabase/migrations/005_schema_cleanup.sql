-- Migration 005: Schema cleanup
-- • Merge accommodations into venues (has_accommodation flag)
-- • Redesign rooms FK: accommodation_id → venue_id
-- • Redesign room_allocations: guest_id → guest_ids UUID[]
-- • Redesign payments: add user_id + side, drop legacy columns
-- • Drop columns from venues, events, guests, rooms, vendors, tasks
-- • Drop tables: accommodations, event_requirements, seating_tables,
--               seating_assignments, gifts
-- • Drop enums: gender, payment_status (no longer referenced)

BEGIN;

-- ============================================================
-- 1. Add has_accommodation flag to venues
-- ============================================================

ALTER TABLE venues ADD COLUMN IF NOT EXISTS has_accommodation BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 2. Add venue_id to rooms (before migration)
-- ============================================================

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venues(id) ON DELETE CASCADE;

-- ============================================================
-- 3. Migrate each accommodation → new venue row + remap rooms/payments
-- ============================================================

DO $$
DECLARE
  accom RECORD;
  new_venue_id UUID;
BEGIN
  FOR accom IN SELECT * FROM accommodations LOOP
    INSERT INTO venues (
      name, venue_type, address, city,
      google_maps_link, contact_person, contact_phone,
      total_cost, has_accommodation, notes, user_id, created_at
    ) VALUES (
      accom.name,
      'hotel',
      COALESCE(accom.address, 'N/A'),
      COALESCE(accom.city, 'N/A'),
      accom.google_maps_link,
      accom.contact_person,
      accom.contact_phone,
      accom.total_cost,
      true,
      accom.notes,
      accom.user_id,
      accom.created_at
    )
    RETURNING id INTO new_venue_id;

    -- Remap rooms to the new venue
    UPDATE rooms SET venue_id = new_venue_id WHERE accommodation_id = accom.id;

    -- Remap payments to the new venue
    UPDATE payments SET venue_id = new_venue_id
    WHERE accommodation_id = accom.id AND venue_id IS NULL;
  END LOOP;
END $$;

-- Drop old accommodation_id FK + column from rooms
ALTER TABLE rooms DROP COLUMN IF EXISTS accommodation_id;

-- Make venue_id NOT NULL (all rooms should have one after migration)
-- Orphan-safe fallback: link to any accommodation venue
UPDATE rooms
SET venue_id = (SELECT id FROM venues WHERE has_accommodation = true LIMIT 1)
WHERE venue_id IS NULL;

ALTER TABLE rooms ALTER COLUMN venue_id SET NOT NULL;

-- ============================================================
-- 4. Redesign room_allocations: guest_id → guest_ids UUID[]
-- ============================================================

CREATE TABLE room_allocations_new (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  guest_ids     UUID[] NOT NULL DEFAULT '{}',
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, check_in_date)
);

-- Aggregate per-guest rows into per-room rows
INSERT INTO room_allocations_new (room_id, guest_ids, check_in_date, check_out_date)
SELECT
  room_id,
  array_agg(guest_id ORDER BY created_at) AS guest_ids,
  check_in_date::DATE,
  check_out_date::DATE
FROM room_allocations
GROUP BY room_id, check_in_date::DATE, check_out_date::DATE
ON CONFLICT (room_id, check_in_date) DO NOTHING;

DROP TABLE room_allocations;
ALTER TABLE room_allocations_new RENAME TO room_allocations;

-- ============================================================
-- 5. Redesign payments: add user_id + side, drop legacy columns
-- ============================================================

ALTER TABLE payments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS side TEXT CHECK (side IN ('bride', 'groom', 'mutual'));

-- Backfill user_id from linked venue or vendor
UPDATE payments p
SET user_id = v.user_id
FROM venues v
WHERE p.venue_id = v.id AND p.user_id IS NULL;

UPDATE payments p
SET user_id = v.user_id
FROM vendors v
WHERE p.vendor_id = v.id AND p.user_id IS NULL;

ALTER TABLE payments DROP COLUMN IF EXISTS accommodation_id;
ALTER TABLE payments DROP COLUMN IF EXISTS expense_id;
ALTER TABLE payments DROP COLUMN IF EXISTS paid_by;
ALTER TABLE payments DROP COLUMN IF EXISTS received_by;
ALTER TABLE payments DROP COLUMN IF EXISTS receipt_url;
ALTER TABLE payments DROP COLUMN IF EXISTS status;

-- ============================================================
-- 6. Drop columns from venues
-- ============================================================

ALTER TABLE venues DROP COLUMN IF EXISTS state;
ALTER TABLE venues DROP COLUMN IF EXISTS pincode;
ALTER TABLE venues DROP COLUMN IF EXISTS latitude;
ALTER TABLE venues DROP COLUMN IF EXISTS longitude;
ALTER TABLE venues DROP COLUMN IF EXISTS contact_email;
ALTER TABLE venues DROP COLUMN IF EXISTS parking_capacity;
ALTER TABLE venues DROP COLUMN IF EXISTS amenities;
ALTER TABLE venues DROP COLUMN IF EXISTS restrictions;
ALTER TABLE venues DROP COLUMN IF EXISTS photos;
ALTER TABLE venues DROP COLUMN IF EXISTS documents;
ALTER TABLE venues DROP COLUMN IF EXISTS booking_amount;
ALTER TABLE venues DROP COLUMN IF EXISTS payment_status;

-- ============================================================
-- 7. Drop columns from events
-- ============================================================

ALTER TABLE events DROP COLUMN IF EXISTS rituals;
ALTER TABLE events DROP COLUMN IF EXISTS special_notes;

-- ============================================================
-- 8. Drop columns from guests
-- ============================================================

ALTER TABLE guests DROP COLUMN IF EXISTS gender;
ALTER TABLE guests DROP COLUMN IF EXISTS address;
ALTER TABLE guests DROP COLUMN IF EXISTS city;
ALTER TABLE guests DROP COLUMN IF EXISTS state;
ALTER TABLE guests DROP COLUMN IF EXISTS country;
ALTER TABLE guests DROP COLUMN IF EXISTS pickup_location;
ALTER TABLE guests DROP COLUMN IF EXISTS transport_mode;
ALTER TABLE guests DROP COLUMN IF EXISTS transport_details;
ALTER TABLE guests DROP COLUMN IF EXISTS special_requirements;

-- ============================================================
-- 9. Drop columns from rooms
-- ============================================================

ALTER TABLE rooms DROP COLUMN IF EXISTS floor;
ALTER TABLE rooms DROP COLUMN IF EXISTS has_ac;
ALTER TABLE rooms DROP COLUMN IF EXISTS has_attached_bath;
ALTER TABLE rooms DROP COLUMN IF EXISTS is_accessible;
ALTER TABLE rooms DROP COLUMN IF EXISTS amenities;

-- ============================================================
-- 10. Drop columns from vendors
-- ============================================================

ALTER TABLE vendors DROP COLUMN IF EXISTS subcategory;
ALTER TABLE vendors DROP COLUMN IF EXISTS company_name;
ALTER TABLE vendors DROP COLUMN IF EXISTS alternate_phone;
ALTER TABLE vendors DROP COLUMN IF EXISTS website;
ALTER TABLE vendors DROP COLUMN IF EXISTS instagram_handle;
ALTER TABLE vendors DROP COLUMN IF EXISTS address;
ALTER TABLE vendors DROP COLUMN IF EXISTS city;
ALTER TABLE vendors DROP COLUMN IF EXISTS description;
ALTER TABLE vendors DROP COLUMN IF EXISTS services_offered;
ALTER TABLE vendors DROP COLUMN IF EXISTS portfolio_links;
ALTER TABLE vendors DROP COLUMN IF EXISTS photos;
ALTER TABLE vendors DROP COLUMN IF EXISTS rating;
ALTER TABLE vendors DROP COLUMN IF EXISTS contract_signed;
ALTER TABLE vendors DROP COLUMN IF EXISTS contract_document;

-- ============================================================
-- 11. Drop columns from tasks
-- ============================================================

ALTER TABLE tasks DROP COLUMN IF EXISTS category;
ALTER TABLE tasks DROP COLUMN IF EXISTS assigned_side;
ALTER TABLE tasks DROP COLUMN IF EXISTS reminder_date;
ALTER TABLE tasks DROP COLUMN IF EXISTS parent_task_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS display_order;

-- ============================================================
-- 12. Drop unused tables (order matters for FK constraints)
-- ============================================================

DROP TABLE IF EXISTS seating_assignments;
DROP TABLE IF EXISTS seating_tables;
DROP TABLE IF EXISTS gifts;
DROP TABLE IF EXISTS event_requirements;
DROP TABLE IF EXISTS accommodations;

-- ============================================================
-- 13. Drop unused enums
-- ============================================================

DROP TYPE IF EXISTS gender;
-- payment_status was only used by venues.payment_status (dropped) and
-- payments.status (dropped) and accommodations.payment_status (table dropped)
DROP TYPE IF EXISTS payment_status;

-- ============================================================
-- 14. Add trigger for room_allocations updated_at
-- ============================================================

CREATE TRIGGER update_room_allocations_updated_at
  BEFORE UPDATE ON room_allocations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 15. Recreate indexes
-- ============================================================

DROP INDEX IF EXISTS idx_room_allocations_dates;
CREATE INDEX idx_room_allocations_dates ON room_allocations(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_rooms_venue ON rooms(venue_id);
CREATE INDEX IF NOT EXISTS idx_venues_accommodation ON venues(has_accommodation) WHERE has_accommodation = true;
CREATE INDEX IF NOT EXISTS idx_payments_venue ON payments(venue_id);
CREATE INDEX IF NOT EXISTS idx_payments_vendor ON payments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);

COMMIT;
