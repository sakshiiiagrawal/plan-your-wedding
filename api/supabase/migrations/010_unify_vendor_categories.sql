-- Migration 010: Add category_id FK to vendors and clean up old vendor_category enum.
-- Vendors now reference the shared expense_categories table for category.
-- The old "category" TEXT column is kept for display fallback of legacy records.

BEGIN;

-- 1. Convert category column from vendor_category enum to TEXT
--    (map old enum keys to human-readable parent category names)
ALTER TABLE vendors ALTER COLUMN category TYPE TEXT USING (
  CASE category::TEXT
    WHEN 'caterer'        THEN 'Catering'
    WHEN 'decorator'      THEN 'Decoration'
    WHEN 'photographer'   THEN 'Photography & Videography'
    WHEN 'videographer'   THEN 'Photography & Videography'
    WHEN 'mehendi_artist' THEN 'Mehendi & Rituals'
    WHEN 'makeup_artist'  THEN 'Attire & Beauty'
    WHEN 'dj'             THEN 'Entertainment'
    WHEN 'band'           THEN 'Entertainment'
    WHEN 'florist'        THEN 'Decoration'
    WHEN 'pandit'         THEN 'Mehendi & Rituals'
    WHEN 'tent_house'     THEN 'Decoration'
    WHEN 'lighting'       THEN 'Decoration'
    WHEN 'invitation'     THEN 'Invitations & Stationery'
    WHEN 'jeweller'       THEN 'Jewellery'
    WHEN 'choreographer'  THEN 'Entertainment'
    WHEN 'transportation' THEN 'Transportation'
    ELSE category::TEXT
  END
);

-- 2. Make category nullable — vendors will rely on category_id going forward
ALTER TABLE vendors ALTER COLUMN category DROP NOT NULL;

-- 3. Add category_id FK referencing expense_categories
--    Nullable — existing vendors keep null until edited
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL;

-- 4. Add index for category_id queries
CREATE INDEX IF NOT EXISTS idx_vendors_category_id ON vendors(category_id);

-- 5. Drop the old vendor_category enum type (no longer needed)
DROP TYPE IF EXISTS vendor_category;

COMMIT;
