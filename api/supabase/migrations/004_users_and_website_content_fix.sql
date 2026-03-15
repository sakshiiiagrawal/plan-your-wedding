-- Migration 004: Add users table and fix website_content unique constraint
-- Required for multi-tenant support:
--   1. users table was absent from the initial schema
--   2. website_content needs a composite unique key (section_name, user_id)
--      so each wedding owner can have their own hero/gallery/etc. sections

-- =====================================================
-- USERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'family', 'friends')),
  slug          TEXT UNIQUE,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- WEBSITE_CONTENT: fix unique constraint for multi-tenant
-- =====================================================

-- Drop the single-column unique constraint that blocks multi-tenant upserts
ALTER TABLE website_content DROP CONSTRAINT IF EXISTS website_content_section_name_key;

-- Add user_id column linking content to a specific wedding owner
ALTER TABLE website_content ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Replace with composite unique index so each user can have their own sections
CREATE UNIQUE INDEX IF NOT EXISTS website_content_section_user
  ON website_content(section_name, user_id);
