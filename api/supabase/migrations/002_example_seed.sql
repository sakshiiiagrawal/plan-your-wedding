-- OPTIONAL: Example seed data for development/demo purposes.
-- This file is skipped by `npm run db:migrate` unless INCLUDE_SEEDS=true.

-- =====================================================
-- EXPENSE SUMMARY
-- =====================================================

INSERT INTO expense_summary (id, total_expense, bride_side_contribution, groom_side_contribution, currency)
VALUES ('00000000-0000-0000-0000-000000000001', 3000000, 1500000, 1500000, 'INR');

-- =====================================================
-- EXPENSE CATEGORIES
-- =====================================================

INSERT INTO expense_categories (name, allocated_amount, display_order) VALUES
('Venue', 1000000, 1),
('Catering', 1500000, 2),
('Decoration', 500000, 3),
('Photography & Videography', 400000, 4),
('Bridal Attire & Jewelry', 300000, 5),
('Groom Attire', 150000, 6),
('Makeup & Mehendi', 100000, 7),
('Music & Entertainment', 200000, 8),
('Invitations & Stationery', 50000, 9),
('Accommodation', 400000, 10),
('Transportation', 100000, 11),
('Gifts & Favors', 100000, 12),
('Pandit & Rituals', 50000, 13),
('Miscellaneous', 150000, 14);

-- =====================================================
-- EVENTS
-- =====================================================

INSERT INTO events (name, event_type, description, event_date, start_time, end_time, dress_code, theme, color_palette, display_order) VALUES
(
  'Mehendi',
  'mehendi',
  'Traditional Mehendi ceremony with music, dance and celebrations. Beautiful henna designs for the bride and all female guests.',
  '2027-02-12',
  '18:00',
  '23:00',
  'Green/Yellow Traditional Attire',
  'Floral Garden',
  '{"primary": "#228B22", "secondary": "#FFD700", "accent": "#FF6F00"}',
  1
),
(
  'Haldi Carnival',
  'haldi',
  'Colorful Haldi ceremony for both bride and groom. A fun-filled carnival theme with turmeric rituals and water splash.',
  '2027-02-13',
  '09:00',
  '13:00',
  'Yellow Attire',
  'Yellow Carnival',
  '{"primary": "#FFD700", "secondary": "#FFA500", "accent": "#FFFF00"}',
  2
),
(
  'Engagement & Sangeet',
  'sangeet',
  'Ring ceremony followed by an evening of dance performances, music and celebration. Both families showcase their talents.',
  '2027-02-13',
  '18:00',
  '00:00',
  'Indo-Western/Cocktail Attire',
  'Starry Night',
  '{"primary": "#1A237E", "secondary": "#C0C0C0", "accent": "#FFD700"}',
  3
),
(
  'Wedding Ceremony',
  'wedding',
  'The main wedding ceremony with traditional Hindu rituals. Includes Baraat, Jaimala, Pheras, and Vidaai.',
  '2027-02-14',
  '07:00',
  '16:00',
  'Traditional - Red/Maroon for bride, Sherwani for groom',
  'Royal Indian Wedding',
  '{"primary": "#8B0000", "secondary": "#D4AF37", "accent": "#FFFFFF"}',
  4
);

-- =====================================================
-- RITUALS FOR WEDDING DAY
-- =====================================================

INSERT INTO rituals (name, tradition, event_id, description, significance, items_required, participants, duration_minutes, display_order)
SELECT
  'Ganpati Puja',
  'common',
  id,
  'Prayers to Lord Ganesha for an auspicious start to the wedding',
  'Invoking Lord Ganesha to remove obstacles and bless the wedding',
  '["Ganesh idol", "Flowers", "Coconut", "Modak", "Incense sticks", "Diya"]',
  ARRAY['Both families', 'Pandit Ji'],
  30,
  1
FROM events WHERE event_type = 'wedding';

INSERT INTO rituals (name, tradition, event_id, description, significance, items_required, participants, duration_minutes, display_order)
SELECT
  'Baraat',
  'common',
  id,
  'Groom''s grand procession to the wedding venue with family and friends',
  'Traditional arrival of the groom with celebrations',
  '["Decorated horse/car", "Band/DJ", "Fireworks", "Welcome drinks", "Flower garlands"]',
  ARRAY['Groom', 'Groom family', 'Friends'],
  60,
  2
FROM events WHERE event_type = 'wedding';

INSERT INTO rituals (name, tradition, event_id, description, significance, items_required, participants, duration_minutes, display_order)
SELECT
  'Jaimala',
  'common',
  id,
  'Exchange of flower garlands between bride and groom',
  'Symbolizes acceptance of each other as life partners',
  '["Two flower garlands (Jaimala)", "Stage decoration"]',
  ARRAY['Bride', 'Groom', 'Both families'],
  15,
  3
FROM events WHERE event_type = 'wedding';

INSERT INTO rituals (name, tradition, event_id, description, significance, items_required, participants, duration_minutes, display_order)
SELECT
  'Kanyadaan',
  'common',
  id,
  'Bride''s father gives away his daughter to the groom',
  'One of the most important rituals symbolizing the giving away of the daughter',
  '["Holy water", "Rice", "Flowers", "Coconut"]',
  ARRAY['Bride', 'Bride''s parents', 'Groom', 'Pandit Ji'],
  20,
  4
FROM events WHERE event_type = 'wedding';

INSERT INTO rituals (name, tradition, event_id, description, significance, items_required, participants, duration_minutes, display_order)
SELECT
  'Saat Pheras',
  'common',
  id,
  'Seven rounds around the sacred fire (Agni) taking seven vows',
  'Each round represents a vow for a successful married life',
  '["Havan Kund", "Sacred fire items", "Ghee", "Samagri", "Rice"]',
  ARRAY['Bride', 'Groom', 'Pandit Ji'],
  45,
  5
FROM events WHERE event_type = 'wedding';

INSERT INTO rituals (name, tradition, event_id, description, significance, items_required, participants, duration_minutes, display_order)
SELECT
  'Sindoor & Mangalsutra',
  'common',
  id,
  'Groom applies sindoor and ties the mangalsutra',
  'Symbols of married woman - sindoor in the parting and mangalsutra around the neck',
  '["Sindoor", "Mangalsutra"]',
  ARRAY['Bride', 'Groom'],
  10,
  6
FROM events WHERE event_type = 'wedding';

INSERT INTO rituals (name, tradition, event_id, description, significance, items_required, participants, duration_minutes, display_order)
SELECT
  'Vidaai',
  'common',
  id,
  'Bride''s emotional farewell from her parental home',
  'Bride leaves her home to start a new life with her husband',
  '["Decorated car/Doli", "Rice for throwing", "Flower petals"]',
  ARRAY['Bride', 'Bride family', 'Groom', 'Groom family'],
  30,
  7
FROM events WHERE event_type = 'wedding';

-- =====================================================
-- SAMPLE TASKS
-- =====================================================

INSERT INTO tasks (title, category, priority, status, due_date, assigned_to, assigned_side) VALUES
('Finalize wedding venue booking', 'venue', 'urgent', 'completed', '2026-09-01', 'Bride''s Father', 'bride'),
('Book photographer and videographer', 'vendor', 'high', 'completed', '2026-10-01', 'Groom', 'groom'),
('Finalize caterer and menu', 'vendor', 'high', 'in_progress', '2026-11-01', 'Bride''s Mother', 'bride'),
('Order wedding invitations', 'invitation', 'high', 'pending', '2026-12-01', 'Bride', 'bride'),
('Book mehendi artist', 'vendor', 'medium', 'pending', '2026-12-15', 'Bride', 'bride'),
('Book makeup artist for all events', 'vendor', 'high', 'pending', '2026-12-15', 'Bride', 'bride'),
('Arrange hotel rooms for guests', 'accommodation', 'high', 'pending', '2027-01-01', 'Groom''s Father', 'groom'),
('Finalize decorator for all events', 'vendor', 'high', 'pending', '2027-01-01', 'Bride''s Mother', 'bride'),
('Book DJ for sangeet', 'vendor', 'medium', 'pending', '2027-01-15', 'Groom', 'groom'),
('Arrange transportation for baraat', 'transportation', 'medium', 'pending', '2027-01-15', 'Groom''s Uncle', 'groom'),
('Buy wedding lehenga', 'shopping', 'urgent', 'pending', '2026-11-01', 'Bride', 'bride'),
('Buy groom sherwani', 'shopping', 'high', 'pending', '2026-12-01', 'Groom', 'groom'),
('Finalize pandit ji for wedding', 'ritual', 'high', 'pending', '2027-01-01', 'Groom''s Father', 'groom'),
('Prepare guest list', 'guest', 'urgent', 'in_progress', '2026-10-01', 'Both families', 'mutual'),
('Send save-the-dates', 'invitation', 'high', 'pending', '2026-11-01', 'Bride', 'bride'),
('Book florist', 'vendor', 'medium', 'pending', '2027-01-01', 'Bride''s Mother', 'bride'),
('Arrange sangeet choreographer', 'vendor', 'medium', 'pending', '2026-12-01', 'Bride', 'bride'),
('Buy pooja items for wedding', 'ritual', 'high', 'pending', '2027-02-05', 'Bride''s Mother', 'bride'),
('Confirm all vendor payments', 'finance', 'high', 'pending', '2027-02-10', 'Bride''s Father', 'bride'),
('Final guest count confirmation', 'guest', 'urgent', 'pending', '2027-02-05', 'Both families', 'mutual');

-- =====================================================
-- SAMPLE GUEST GROUPS
-- =====================================================

INSERT INTO guest_groups (name, side, description) VALUES
('Bride''s Family - Immediate', 'bride', 'Bride''s immediate family'),
('Bride''s Family - Extended', 'bride', 'Bride''s extended family members'),
('Groom''s Family - Immediate', 'groom', 'Groom''s immediate family'),
('Groom''s Family - Extended', 'groom', 'Groom''s extended family members'),
('Bride''s Friends', 'bride', 'Bride''s close friends'),
('Groom''s Friends', 'groom', 'Groom''s close friends'),
('Office Colleagues - Bride', 'bride', 'Bride''s work colleagues'),
('Office Colleagues - Groom', 'groom', 'Groom''s work colleagues'),
('Mutual Friends', 'mutual', 'Common friends of both');

-- =====================================================
-- WEBSITE CONTENT
-- =====================================================

INSERT INTO website_content (section_name, content, display_order) VALUES
(
  'hero',
  '{
    "bride_name": "Khushi",
    "groom_name": "Arjun",
    "tagline": "We''re getting married!",
    "wedding_date": "February 14, 2027",
    "background_image": "/images/couple/hero-bg.jpg"
  }',
  1
),
(
  'our_story',
  '{
    "title": "Our Love Story",
    "timeline": [
      {"year": "2020", "title": "First Meeting", "description": "We first met through mutual friends..."},
      {"year": "2021", "title": "Started Dating", "description": "After months of friendship, we realized..."},
      {"year": "2024", "title": "The Proposal", "description": "On a beautiful evening..."},
      {"year": "2027", "title": "The Wedding", "description": "And now we begin our forever together..."}
    ],
    "quote": "Every love story is beautiful, but ours is our favorite."
  }',
  2
),
(
  'couple',
  '{
    "bride": {
      "name": "Khushi Sharma",
      "parents": "Daughter of Mr. & Mrs. Sharma",
      "bio": "A creative soul with a warm heart...",
      "image": "/images/couple/bride.jpg"
    },
    "groom": {
      "name": "Arjun Verma",
      "parents": "Son of Mr. & Mrs. Verma",
      "bio": "An ambitious dreamer with a kind spirit...",
      "image": "/images/couple/groom.jpg"
    }
  }',
  3
);
