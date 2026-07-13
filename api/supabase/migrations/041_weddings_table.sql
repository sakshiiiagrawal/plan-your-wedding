-- Migration 041: weddings become a first-class entity (multi-workspace).
-- Until now a wedding WAS a users row (users.slug + every resource table keyed
-- by the owner's user id). That made "one account, many weddings" impossible.
-- The backfill preserves ids (weddings.id = owner users.id) so every resource
-- table's existing user_id value is already a valid wedding id — 043 repoints
-- foreign keys without rewriting any data. users.slug/currency/active_owner_id
-- stay in place until 044 so code deployed before the cutover keeps working.

-- ============================================================
-- 0. Drift reconciliation: live DBs got user_id on the core tables from
--    out-of-repo migrations; databases built only from these files (docker)
--    never did. Nullable + no FK here; 043 adds the real constraints.
-- ============================================================

ALTER TABLE venues       ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE events       ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE guest_groups ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE guests       ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE vendors      ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE tasks        ADD COLUMN IF NOT EXISTS user_id UUID;

CREATE INDEX IF NOT EXISTS idx_venues_user       ON venues(user_id);
CREATE INDEX IF NOT EXISTS idx_events_user       ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_guest_groups_user ON guest_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_guests_user       ON guests(user_id);
CREATE INDEX IF NOT EXISTS idx_vendors_user      ON vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user        ON tasks(user_id);

-- ============================================================
-- 1. The weddings table
-- ============================================================

CREATE TABLE IF NOT EXISTS weddings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Nullable: a wedding can exist before its public URL is claimed.
  slug       TEXT UNIQUE,
  -- Display label for the switcher/hub, not public content.
  title      TEXT NOT NULL DEFAULT 'My wedding',
  currency   TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weddings_owner ON weddings(owner_id);

DO $$ BEGIN
  CREATE TRIGGER update_weddings_updated_at
    BEFORE UPDATE ON weddings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 2. ID-preserving backfill: one wedding per user that has a slug, members,
--    or any wedding-scoped data (covers slug-less accounts that still own
--    rows). weddings.id = users.id keeps every user_id FK value valid.
-- ============================================================

INSERT INTO weddings (id, owner_id, slug, title, currency, created_at)
SELECT u.id, u.id, u.slug,
       COALESCE(NULLIF(u.name, ''), u.slug, 'My wedding'),
       COALESCE(u.currency, 'INR'),
       COALESCE(u.created_at, NOW())
FROM users u
WHERE u.slug IS NOT NULL
   OR EXISTS (SELECT 1 FROM wedding_members m WHERE m.owner_id = u.id)
   OR EXISTS (SELECT 1 FROM venues t            WHERE t.user_id = u.id)
   OR EXISTS (SELECT 1 FROM events t            WHERE t.user_id = u.id)
   OR EXISTS (SELECT 1 FROM guest_groups t      WHERE t.user_id = u.id)
   OR EXISTS (SELECT 1 FROM guests t            WHERE t.user_id = u.id)
   OR EXISTS (SELECT 1 FROM vendors t           WHERE t.user_id = u.id)
   OR EXISTS (SELECT 1 FROM expense_categories t WHERE t.user_id = u.id)
   OR EXISTS (SELECT 1 FROM expenses t          WHERE t.user_id = u.id)
   OR EXISTS (SELECT 1 FROM tasks t             WHERE t.user_id = u.id)
   OR EXISTS (SELECT 1 FROM website_content t   WHERE t.user_id = u.id)
   OR EXISTS (SELECT 1 FROM public_pages t      WHERE t.user_id = u.id)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. Active-wedding pointer. NULL = no explicit choice; the auth middleware
--    falls back to the oldest owned wedding, then the first membership.
--    (active_owner_id remains until 044 for old in-flight deploys.)
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS
  active_wedding_id UUID REFERENCES weddings(id) ON DELETE SET NULL;

UPDATE users u
SET active_wedding_id = u.active_owner_id
WHERE u.active_owner_id IS NOT NULL
  AND u.active_wedding_id IS NULL
  AND EXISTS (SELECT 1 FROM weddings w WHERE w.id = u.active_owner_id);

-- ============================================================
-- 4. Digest dedupe moves to wedding grain: one digest per wedding per day,
--    emailed to the wedding's owner. digest_log (user grain) is dropped in 044.
-- ============================================================

CREATE TABLE IF NOT EXISTS wedding_digest_log (
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  sent_on    DATE NOT NULL,
  PRIMARY KEY (wedding_id, sent_on)
);

INSERT INTO wedding_digest_log (wedding_id, sent_on)
SELECT d.user_id, d.sent_on
FROM digest_log d
JOIN weddings w ON w.id = d.user_id
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. The historical column name stays; its meaning is now "wedding id".
-- ============================================================

COMMENT ON COLUMN venues.user_id             IS 'wedding id (historical name; FK -> weddings.id since 043)';
COMMENT ON COLUMN events.user_id             IS 'wedding id (historical name; FK -> weddings.id since 043)';
COMMENT ON COLUMN guest_groups.user_id       IS 'wedding id (historical name; FK -> weddings.id since 043)';
COMMENT ON COLUMN guests.user_id             IS 'wedding id (historical name; FK -> weddings.id since 043)';
COMMENT ON COLUMN vendors.user_id            IS 'wedding id (historical name; FK -> weddings.id since 043)';
COMMENT ON COLUMN expense_categories.user_id IS 'wedding id (historical name; FK -> weddings.id since 043)';
COMMENT ON COLUMN expenses.user_id           IS 'wedding id (historical name; FK -> weddings.id since 043)';
COMMENT ON COLUMN expense_summary.user_id    IS 'wedding id (historical name; FK -> weddings.id since 043)';
COMMENT ON COLUMN tasks.user_id              IS 'wedding id (historical name; FK -> weddings.id since 043)';
COMMENT ON COLUMN website_content.user_id    IS 'wedding id (historical name; FK -> weddings.id since 043)';
COMMENT ON COLUMN public_pages.user_id       IS 'wedding id (historical name; FK -> weddings.id since 043)';
