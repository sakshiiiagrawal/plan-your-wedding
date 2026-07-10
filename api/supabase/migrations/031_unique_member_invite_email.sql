-- Migration 031: One member row per (wedding, invited email).
-- UNIQUE (owner_id, member_id) doesn't cover pending rows (member_id is NULL),
-- so concurrent invites to the same address could create duplicates — and
-- accepting the second row after the first went active blew up on the
-- member_id constraint with a generic "already exists" error.

-- Scrub existing duplicates first: keep one row per (owner_id, invited_email),
-- preferring an active membership over a pending invite, then the newest.
DELETE FROM wedding_members
WHERE id NOT IN (
  SELECT DISTINCT ON (owner_id, invited_email) id
  FROM wedding_members
  ORDER BY owner_id, invited_email, (status = 'active') DESC, created_at DESC
);

CREATE UNIQUE INDEX IF NOT EXISTS wedding_members_owner_invited_email_key
  ON wedding_members (owner_id, invited_email);
