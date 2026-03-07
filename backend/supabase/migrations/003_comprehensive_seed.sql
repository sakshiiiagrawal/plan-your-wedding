-- Comprehensive Seed Data for Wedding Planner
-- This script adds all mock data that was previously hard-coded in the frontend
-- Run this after 001_initial_schema.sql and 002_seed_data.sql

-- =====================================================
-- VENUES (4 venues from frontend mock data)
-- =====================================================

INSERT INTO venues (name, venue_type, address, city, capacity, total_cost, payment_status, contact_person, contact_phone) VALUES
('Hotel Malsi Mist', 'lawn', 'Near Regal Manor, Mussoorie Rd, Malsi, Dehradun', 'Dehradun', 150, 741000, 'partial', 'Mr. Manager', '9286248001'),
('Regal Manor by Grand Dream', 'lawn_and_hall', '189, Diversion Road, Malsi, Mussoorie, Dehradun', 'Dehradun', 250, 1200000, 'partial', 'Mr. Ashish Tyagi', '8941893111');

-- Link venues to events
UPDATE events SET venue_id = (SELECT id FROM venues WHERE name = 'Hotel Malsi Mist') WHERE event_type = 'mehendi';
UPDATE events SET venue_id = (SELECT id FROM venues WHERE name = 'Hotel Malsi Mist') WHERE event_type = 'haldi';
UPDATE events SET venue_id = (SELECT id FROM venues WHERE name = 'Hotel Malsi Mist') WHERE event_type = 'sangeet';
UPDATE events SET venue_id = (SELECT id FROM venues WHERE name = 'Regal Manor by Grand Dream') WHERE event_type = 'wedding';

-- =====================================================
-- VENDORS (6 vendors from frontend mock data)
-- =====================================================

INSERT INTO vendors (name, category, contact_person, phone, is_confirmed) VALUES
('Makeup by Alisha Anand', 'makeup_artist', 'Alisha Anand', '9773773620', true),
('Dummy- Capture Dreams Photography', 'photographer', 'Vikram Singh', '9876543212', true),
('Dummy- Ritu Mehendi Art', 'mehendi_artist', 'Ritu Verma', '9876543213', true);

-- =====================================================
-- VENDOR EVENT ASSIGNMENTS
-- =====================================================

-- Capture Dreams Photography - All events
INSERT INTO vendor_event_assignments (vendor_id, event_id, service_description)
SELECT v.id, e.id, 'Photography and video coverage'
FROM vendors v, events e
WHERE v.name = 'Dummy- Capture Dreams Photography';

-- Ritu Mehendi Art - Mehendi only
INSERT INTO vendor_event_assignments (vendor_id, event_id, service_description)
SELECT v.id, e.id, 'Bridal and guest mehendi'
FROM vendors v, events e
WHERE v.name = 'Dummy- Ritu Mehendi Art' AND e.event_type = 'mehendi';

-- Glamour Studio - All events
INSERT INTO vendor_event_assignments (vendor_id, event_id, service_description)
SELECT v.id, e.id, 'Makeup for bride: Haldi, Sangeet and Wedding'
FROM vendors v, events e
WHERE v.name = 'Makeup by Alisha Anand';

-- =====================================================
-- ACCOMMODATIONS (2 hotels from frontend mock data)
-- =====================================================

INSERT INTO accommodations (name, accommodation_type, distance_from_venue, total_rooms_booked, total_cost, check_in_time, check_out_time) VALUES
('Hotel Malsi Mist', 'hotel', '0.5 km (Main Venue)', 24, 741000, '14:00', '11:00'),
('Hotel White Rock', 'hotel', '0.7 km', 28, 120000, '14:00', '11:00');

-- =====================================================
-- ROOMS (sample rooms from frontend mock data)
-- =====================================================

-- Hotel Malsi Mist rooms
INSERT INTO rooms (accommodation_id, room_number, room_type, capacity) VALUES
((SELECT id FROM accommodations WHERE name = 'Hotel Malsi Mist'), '201', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Hotel Malsi Mist'), '202', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Hotel Malsi Mist'), '203', 'family', 4),
((SELECT id FROM accommodations WHERE name = 'Hotel Malsi Mist'), '204', 'suite', 2),
((SELECT id FROM accommodations WHERE name = 'Hotel Malsi Mist'), '205', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Hotel Malsi Mist'), '206', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Hotel Malsi Mist'), '207', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Hotel Malsi Mist'), '208', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Hotel Malsi Mist'), '301', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Hotel Malsi Mist'), '302', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Hotel Malsi Mist'), '303', 'family', 4),
((SELECT id FROM accommodations WHERE name = 'Hotel Malsi Mist'), '304', 'suite', 2);

-- Hotel White Rock rooms
INSERT INTO rooms (accommodation_id, room_number, room_type, capacity) VALUES
((SELECT id FROM accommodations WHERE name = 'Hotel White Rock'), '101', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Hotel White Rock'), '102', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Hotel White Rock'), '103', 'family', 4),
((SELECT id FROM accommodations WHERE name = 'Hotel White Rock'), '104', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Hotel White Rock'), '105', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Hotel White Rock'), '106', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Hotel White Rock'), '201', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Hotel White Rock'), '202', 'double', 2),
((SELECT id FROM accommodations WHERE name = 'Hotel White Rock'), '203', 'family', 4),
((SELECT id FROM accommodations WHERE name = 'Hotel White Rock'), '204', 'suite', 2);

-- =====================================================
-- GUESTS (Total: 245 - 120 bride side, 125 groom side)
-- =====================================================

-- Named guests from frontend mock data (8 guests)
INSERT INTO guests (first_name, last_name, side, phone, meal_preference, needs_accommodation, relationship, group_id)
VALUES
('Arun Kumar', 'Agrawal', 'bride', '9335862560', 'vegetarian', true, 'Father', (SELECT id FROM guest_groups WHERE name = 'Agrawal Family - Immediate')),
('Durga', 'Agrawal', 'bride', '9450029319', 'vegetarian', true, 'Mother', (SELECT id FROM guest_groups WHERE name = 'Agrawal Family - Immediate')),
('Nidhi', 'Dangwal', 'groom', '9458345349', 'vegetarian', true, 'Mother', (SELECT id FROM guest_groups WHERE name = 'Dangwal Family - Immediate'));

-- Extended Family - Bride Side (50 guests)
INSERT INTO guests (first_name, last_name, side, phone, meal_preference, needs_accommodation, relationship, group_id)
SELECT
  'Guest_B_' || generate_series,
  'Agrawal',
  'bride'::guest_side,
  '98765' || LPAD(generate_series::text, 5, '0'),
  CASE WHEN generate_series % 5 = 0 THEN 'jain'::meal_preference WHEN generate_series % 10 = 0 THEN 'vegan'::meal_preference ELSE 'vegetarian'::meal_preference END,
  generate_series % 3 = 0,
  'Extended Family',
  (SELECT id FROM guest_groups WHERE name = 'Agrawal Family - Extended')
FROM generate_series(1, 50);

-- Extended Family - Groom Side (50 guests)
INSERT INTO guests (first_name, last_name, side, phone, meal_preference, needs_accommodation, relationship, group_id)
SELECT
  'Guest_G_' || generate_series,
  'Family',
  'groom'::guest_side,
  '98766' || LPAD(generate_series::text, 5, '0'),
  CASE WHEN generate_series % 8 = 0 THEN 'non_vegetarian'::meal_preference WHEN generate_series % 12 = 0 THEN 'vegan'::meal_preference ELSE 'vegetarian'::meal_preference END,
  generate_series % 4 = 0,
  'Extended Family',
  (SELECT id FROM guest_groups WHERE name = 'Dangwal Family - Extended')
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
-- GUEST RSVP STATUS (180 confirmed, 55 pending, 10 declined)
-- =====================================================

-- Create RSVP records for all guests for all events
INSERT INTO guest_event_rsvp (guest_id, event_id, rsvp_status)
SELECT g.id, e.id,
  CASE
    -- First 180 guests confirmed (approximate ratio)
    WHEN ROW_NUMBER() OVER (ORDER BY g.created_at) <= 180 THEN 'confirmed'
    -- Next 55 guests pending
    WHEN ROW_NUMBER() OVER (ORDER BY g.created_at) <= 235 THEN 'pending'
    -- Remaining 10 guests declined
    ELSE 'declined'
  END::rsvp_status
FROM guests g
CROSS JOIN events e;

-- =====================================================
-- ROOM ALLOCATIONS (from frontend mock data)
-- =====================================================

-- Arun & Durga Agrawal in Room 201
INSERT INTO room_allocations (room_id, guest_id, check_in_date, check_out_date, is_primary_guest)
SELECT
  (SELECT r.id FROM rooms r JOIN accommodations a ON r.accommodation_id = a.id WHERE a.name = 'Hotel Malsi Mist' AND r.room_number = '201'),
  g.id,
  '2026-11-24',
  '2026-11-27',
  g.first_name = 'Arun'
FROM guests g WHERE g.first_name IN ('Arun', 'Durga') AND g.last_name = 'Agrawal';

-- Nidhi Dangwal in Room 202
INSERT INTO room_allocations (room_id, guest_id, check_in_date, check_out_date, is_primary_guest)
SELECT
  (SELECT r.id FROM rooms r JOIN accommodations a ON r.accommodation_id = a.id WHERE a.name = 'Hotel Malsi Mist' AND r.room_number = '202'),
  g.id,
  '2026-11-24',
  '2026-11-27',
  true
FROM guests g WHERE g.first_name = 'Nidhi' AND g.last_name = 'Dangwal';

-- =====================================================
-- EXPENSES (from frontend mock data)
-- =====================================================

INSERT INTO expenses (description, amount, expense_date, paid_by, side, category_id) VALUES
('Photographer advance', 175000, '2026-03-01', 'Papa', 'bride', (SELECT id FROM budget_categories WHERE name = 'Photography & Videography')),
('Decorator booking', 200000, '2026-02-28', 'Chacha', 'groom', (SELECT id FROM budget_categories WHERE name = 'Decoration'));

-- =====================================================
-- PAYMENTS (Pending payments from frontend mock data)
-- =====================================================

-- Completed payments for vendors
INSERT INTO payments (vendor_id, amount, payment_date, payment_method, status, paid_by) VALUES
((SELECT id FROM vendors WHERE name = 'Makeup by Alisha Anand'), 48000, '2026-03-10', 'upi', 'paid', 'Ayush');

-- =====================================================
-- UPDATE ESTIMATED GUESTS FOR EVENTS
-- =====================================================

UPDATE events SET estimated_guests = 50 WHERE event_type = 'mehendi';
UPDATE events SET estimated_guests = 150 WHERE event_type = 'haldi';
UPDATE events SET estimated_guests = 150 WHERE event_type = 'sangeet';
UPDATE events SET estimated_guests = 250 WHERE event_type = 'wedding';

-- =====================================================
-- VERIFY COUNTS
-- =====================================================

-- You can run these queries to verify the data:
-- SELECT side, COUNT(*) FROM guests GROUP BY side;
-- Expected: bride=120, groom=125, mutual=15 (total ~260, but we have 245 target)

-- Let's adjust to exactly match: we need 120 bride, 125 groom
-- Current counts after inserts:
-- Bride: 8 (named) + 10 (immediate) + 50 (extended) + 25 (friends) + 15 (colleagues) = 108
-- Groom: 8 (named) + 12 (immediate) + 50 (extended) + 25 (friends) + 20 (colleagues) = 115
-- Mutual: 15

-- Additional bride guests to reach 120 (need 12 more)
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

-- Additional groom guests to reach 125 (need 10 more)
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