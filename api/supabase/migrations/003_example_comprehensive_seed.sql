-- OPTIONAL: Comprehensive example seed data for development/demo purposes.
-- This file is skipped by `npm run db:migrate` unless INCLUDE_SEEDS=true.
-- Run after 001_initial_schema.sql and 002_example_seed.sql.

-- =====================================================
-- VENUES
-- =====================================================

INSERT INTO venues (name, venue_type, address, city, capacity, total_cost, payment_status, contact_person, contact_phone) VALUES
('Grand Lotus Hotel', 'lawn', '45 Lake View Road, City Center', 'Jaipur', 150, 741000, 'partial', 'Mr. Event Manager', '9000001001'),
('Royal Heritage Banquet', 'lawn_and_hall', '12 Palace Road, Heritage District', 'Jaipur', 250, 1200000, 'partial', 'Ms. Banquet Manager', '9000001002');

-- Link venues to events
UPDATE events SET venue_id = (SELECT id FROM venues WHERE name = 'Grand Lotus Hotel') WHERE event_type = 'mehendi';
UPDATE events SET venue_id = (SELECT id FROM venues WHERE name = 'Grand Lotus Hotel') WHERE event_type = 'haldi';
UPDATE events SET venue_id = (SELECT id FROM venues WHERE name = 'Grand Lotus Hotel') WHERE event_type = 'sangeet';
UPDATE events SET venue_id = (SELECT id FROM venues WHERE name = 'Royal Heritage Banquet') WHERE event_type = 'wedding';

-- =====================================================
-- VENDORS
-- =====================================================

INSERT INTO vendors (name, category, contact_person, phone, is_confirmed) VALUES
('Glamour Studio', 'makeup_artist', 'Ms. Prerna', '9000002001', true),
('Dreamcatcher Photography', 'photographer', 'Mr. Vikram', '9000002002', true),
('Henna Arts Studio', 'mehendi_artist', 'Ms. Rita', '9000002003', true);

-- =====================================================
-- VENDOR EVENT ASSIGNMENTS
-- =====================================================

-- Dreamcatcher Photography - All events
INSERT INTO vendor_event_assignments (vendor_id, event_id, service_description)
SELECT v.id, e.id, 'Photography and video coverage'
FROM vendors v, events e
WHERE v.name = 'Dreamcatcher Photography';

-- Henna Arts Studio - Mehendi only
INSERT INTO vendor_event_assignments (vendor_id, event_id, service_description)
SELECT v.id, e.id, 'Bridal and guest mehendi'
FROM vendors v, events e
WHERE v.name = 'Henna Arts Studio' AND e.event_type = 'mehendi';

-- Glamour Studio - All events
INSERT INTO vendor_event_assignments (vendor_id, event_id, service_description)
SELECT v.id, e.id, 'Makeup for bride: Haldi, Sangeet and Wedding'
FROM vendors v, events e
WHERE v.name = 'Glamour Studio';

-- =====================================================
-- ACCOMMODATIONS
-- =====================================================

INSERT INTO accommodations (name, accommodation_type, distance_from_venue, total_rooms_booked, total_cost, check_in_time, check_out_time) VALUES
('Grand Lotus Hotel', 'hotel', '0.5 km (Main Venue)', 24, 741000, '14:00', '11:00'),
('Blue Horizon Hotel', 'hotel', '0.7 km', 28, 120000, '14:00', '11:00');

-- =====================================================
-- ROOMS
-- =====================================================

-- Grand Lotus Hotel rooms
INSERT INTO rooms (accommodation_id, room_number, room_type, capacity) VALUES
((SELECT id FROM accommodations WHERE name = 'Grand Lotus Hotel'), '201', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Grand Lotus Hotel'), '202', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Grand Lotus Hotel'), '203', 'family', 4),
((SELECT id FROM accommodations WHERE name = 'Grand Lotus Hotel'), '204', 'suite', 2),
((SELECT id FROM accommodations WHERE name = 'Grand Lotus Hotel'), '205', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Grand Lotus Hotel'), '206', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Grand Lotus Hotel'), '207', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Grand Lotus Hotel'), '208', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Grand Lotus Hotel'), '301', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Grand Lotus Hotel'), '302', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Grand Lotus Hotel'), '303', 'family', 4),
((SELECT id FROM accommodations WHERE name = 'Grand Lotus Hotel'), '304', 'suite', 2);

-- Blue Horizon Hotel rooms
INSERT INTO rooms (accommodation_id, room_number, room_type, capacity) VALUES
((SELECT id FROM accommodations WHERE name = 'Blue Horizon Hotel'), '101', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Blue Horizon Hotel'), '102', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Blue Horizon Hotel'), '103', 'family', 4),
((SELECT id FROM accommodations WHERE name = 'Blue Horizon Hotel'), '104', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Blue Horizon Hotel'), '105', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Blue Horizon Hotel'), '106', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Blue Horizon Hotel'), '201', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Blue Horizon Hotel'), '202', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Blue Horizon Hotel'), '203', 'family', 4),
((SELECT id FROM accommodations WHERE name = 'Blue Horizon Hotel'), '204', 'suite', 2);

-- =====================================================
-- GUESTS
-- =====================================================

-- Named guests (family members - sample data)
INSERT INTO guests (first_name, last_name, side, phone, meal_preference, needs_accommodation, relationship, group_id)
VALUES
('Ramesh', 'Sharma', 'bride', '9000003001', 'vegetarian', true, 'Father', (SELECT id FROM guest_groups WHERE name = 'Bride''s Family - Immediate')),
('Sunita', 'Sharma', 'bride', '9000003002', 'vegetarian', true, 'Mother', (SELECT id FROM guest_groups WHERE name = 'Bride''s Family - Immediate')),
('Meena', 'Verma', 'groom', '9000003003', 'vegetarian', true, 'Mother', (SELECT id FROM guest_groups WHERE name = 'Groom''s Family - Immediate'));

-- Extended Family - Bride Side (50 guests)
INSERT INTO guests (first_name, last_name, side, phone, meal_preference, needs_accommodation, relationship, group_id)
SELECT
  'Guest_B_' || generate_series,
  'Sharma',
  'bride'::guest_side,
  '98765' || LPAD(generate_series::text, 5, '0'),
  CASE WHEN generate_series % 5 = 0 THEN 'jain'::meal_preference WHEN generate_series % 10 = 0 THEN 'vegan'::meal_preference ELSE 'vegetarian'::meal_preference END,
  generate_series % 3 = 0,
  'Extended Family',
  (SELECT id FROM guest_groups WHERE name = 'Bride''s Family - Extended')
FROM generate_series(1, 50);

-- Extended Family - Groom Side (50 guests)
INSERT INTO guests (first_name, last_name, side, phone, meal_preference, needs_accommodation, relationship, group_id)
SELECT
  'Guest_G_' || generate_series,
  'Verma',
  'groom'::guest_side,
  '98766' || LPAD(generate_series::text, 5, '0'),
  CASE WHEN generate_series % 8 = 0 THEN 'non_vegetarian'::meal_preference WHEN generate_series % 12 = 0 THEN 'vegan'::meal_preference ELSE 'vegetarian'::meal_preference END,
  generate_series % 4 = 0,
  'Extended Family',
  (SELECT id FROM guest_groups WHERE name = 'Groom''s Family - Extended')
FROM generate_series(1, 50);

-- Friends - Bride Side (25 guests)
INSERT INTO guests (first_name, last_name, side, phone, meal_preference, needs_accommodation, relationship, group_id)
SELECT
  'Friend_B_' || generate_series,
  'Friend',
  'bride'::guest_side,
  '98767' || LPAD(generate_series::text, 5, '0'),
  CASE WHEN generate_series % 4 = 0 THEN 'non_vegetarian'::meal_preference ELSE 'vegetarian'::meal_preference END,
  generate_series % 5 = 0,
  'Friend',
  (SELECT id FROM guest_groups WHERE name = 'Bride''s Friends')
FROM generate_series(1, 25);

-- Friends - Groom Side (25 guests)
INSERT INTO guests (first_name, last_name, side, phone, meal_preference, needs_accommodation, relationship, group_id)
SELECT
  'Friend_G_' || generate_series,
  'Friend',
  'groom'::guest_side,
  '98768' || LPAD(generate_series::text, 5, '0'),
  CASE WHEN generate_series % 3 = 0 THEN 'non_vegetarian'::meal_preference ELSE 'vegetarian'::meal_preference END,
  generate_series % 5 = 0,
  'Friend',
  (SELECT id FROM guest_groups WHERE name = 'Groom''s Friends')
FROM generate_series(1, 25);

-- Colleagues - Bride Side (15 guests)
INSERT INTO guests (first_name, last_name, side, phone, meal_preference, needs_accommodation, relationship, group_id)
SELECT
  'Colleague_B_' || generate_series,
  'Office',
  'bride'::guest_side,
  '98769' || LPAD(generate_series::text, 5, '0'),
  'vegetarian'::meal_preference,
  false,
  'Colleague',
  (SELECT id FROM guest_groups WHERE name = 'Office Colleagues - Bride')
FROM generate_series(1, 15);

-- Colleagues - Groom Side (20 guests)
INSERT INTO guests (first_name, last_name, side, phone, meal_preference, needs_accommodation, relationship, group_id)
SELECT
  'Colleague_G_' || generate_series,
  'Office',
  'groom'::guest_side,
  '98770' || LPAD(generate_series::text, 5, '0'),
  CASE WHEN generate_series % 4 = 0 THEN 'non_vegetarian'::meal_preference ELSE 'vegetarian'::meal_preference END,
  false,
  'Colleague',
  (SELECT id FROM guest_groups WHERE name = 'Office Colleagues - Groom')
FROM generate_series(1, 20);

-- Mutual Friends (15 guests)
INSERT INTO guests (first_name, last_name, side, phone, meal_preference, needs_accommodation, relationship, group_id)
SELECT
  'MutualFriend_' || generate_series,
  'Friend',
  'mutual'::guest_side,
  '98771' || LPAD(generate_series::text, 5, '0'),
  'vegetarian'::meal_preference,
  generate_series % 4 = 0,
  'Mutual Friend',
  (SELECT id FROM guest_groups WHERE name = 'Mutual Friends')
FROM generate_series(1, 15);

-- =====================================================
-- GUEST RSVP STATUS
-- =====================================================

INSERT INTO guest_event_rsvp (guest_id, event_id, rsvp_status)
SELECT g.id, e.id,
  CASE
    WHEN ROW_NUMBER() OVER (ORDER BY g.created_at) <= 180 THEN 'confirmed'
    WHEN ROW_NUMBER() OVER (ORDER BY g.created_at) <= 235 THEN 'pending'
    ELSE 'declined'
  END::rsvp_status
FROM guests g
CROSS JOIN events e;

-- =====================================================
-- ROOM ALLOCATIONS
-- =====================================================

-- Bride's parents in Room 201
INSERT INTO room_allocations (room_id, guest_id, check_in_date, check_out_date, is_primary_guest)
SELECT
  (SELECT r.id FROM rooms r JOIN accommodations a ON r.accommodation_id = a.id WHERE a.name = 'Grand Lotus Hotel' AND r.room_number = '201'),
  g.id,
  '2027-02-12',
  '2027-02-15',
  g.first_name = 'Ramesh'
FROM guests g WHERE g.first_name IN ('Ramesh', 'Sunita') AND g.last_name = 'Sharma';

-- Groom's mother in Room 202
INSERT INTO room_allocations (room_id, guest_id, check_in_date, check_out_date, is_primary_guest)
SELECT
  (SELECT r.id FROM rooms r JOIN accommodations a ON r.accommodation_id = a.id WHERE a.name = 'Grand Lotus Hotel' AND r.room_number = '202'),
  g.id,
  '2027-02-12',
  '2027-02-15',
  true
FROM guests g WHERE g.first_name = 'Meena' AND g.last_name = 'Verma';

-- =====================================================
-- EXPENSES
-- =====================================================

INSERT INTO expenses (description, amount, expense_date, paid_by, side, category_id) VALUES
('Photographer advance', 175000, '2026-10-01', 'Bride''s Father', 'bride', (SELECT id FROM expense_categories WHERE name = 'Photography & Videography')),
('Decorator booking', 200000, '2026-09-28', 'Groom''s Uncle', 'groom', (SELECT id FROM expense_categories WHERE name = 'Decoration'));

-- =====================================================
-- PAYMENTS
-- =====================================================

INSERT INTO payments (vendor_id, amount, payment_date, payment_method, status, paid_by) VALUES
((SELECT id FROM vendors WHERE name = 'Glamour Studio'), 48000, '2026-10-10', 'upi', 'paid', 'Groom');

-- =====================================================
-- UPDATE ESTIMATED GUESTS FOR EVENTS
-- =====================================================

UPDATE events SET estimated_guests = 50 WHERE event_type = 'mehendi';
UPDATE events SET estimated_guests = 150 WHERE event_type = 'haldi';
UPDATE events SET estimated_guests = 150 WHERE event_type = 'sangeet';
UPDATE events SET estimated_guests = 250 WHERE event_type = 'wedding';

-- =====================================================
-- ADDITIONAL GUESTS TO ROUND OUT COUNTS
-- =====================================================

-- Additional bride guests
INSERT INTO guests (first_name, last_name, side, phone, meal_preference, needs_accommodation, relationship, group_id)
SELECT
  'BrideExtra_' || generate_series,
  'Guest',
  'bride'::guest_side,
  '98772' || LPAD(generate_series::text, 5, '0'),
  'vegetarian'::meal_preference,
  false,
  'Family Friend',
  (SELECT id FROM guest_groups WHERE name = 'Bride''s Friends')
FROM generate_series(1, 12);

-- Additional groom guests
INSERT INTO guests (first_name, last_name, side, phone, meal_preference, needs_accommodation, relationship, group_id)
SELECT
  'GroomExtra_' || generate_series,
  'Guest',
  'groom'::guest_side,
  '98773' || LPAD(generate_series::text, 5, '0'),
  'vegetarian'::meal_preference,
  false,
  'Family Friend',
  (SELECT id FROM guest_groups WHERE name = 'Groom''s Friends')
FROM generate_series(1, 10);

-- Add RSVP records for newly added guests
INSERT INTO guest_event_rsvp (guest_id, event_id, rsvp_status)
SELECT g.id, e.id, 'confirmed'::rsvp_status
FROM guests g
CROSS JOIN events e
WHERE g.first_name LIKE 'BrideExtra%' OR g.first_name LIKE 'GroomExtra%';
