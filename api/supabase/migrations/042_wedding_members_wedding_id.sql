-- Migration 042: wedding_members keys on the wedding, not the owner user.
-- owner_id ambiguity ("the wedding" vs "the user who owns it") is exactly what
-- the weddings table resolves — memberships attach to a wedding_id. owner_id
-- is kept (nullable) through the cutover window so serverless instances still
-- running pre-cutover code can write invites; 044 reconciles and drops it.

ALTER TABLE wedding_members ADD COLUMN IF NOT EXISTS
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE;

-- ids are preserved (weddings.id = old owner user id), so this is a straight copy.
UPDATE wedding_members SET wedding_id = owner_id WHERE wedding_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_wedding_members_wedding ON wedding_members(wedding_id);

-- New-shape uniqueness, mirroring 022's UNIQUE(owner_id, member_id) and 031's
-- pending-invite dedupe (member_id is NULL while pending, so a partial index
-- on invited_email is what actually blocks duplicate invites).
CREATE UNIQUE INDEX IF NOT EXISTS uq_wedding_members_wedding_member
  ON wedding_members(wedding_id, member_id) WHERE member_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_wedding_members_wedding_invited_email
  ON wedding_members(wedding_id, invited_email) WHERE status = 'pending';

ALTER TABLE wedding_members ALTER COLUMN owner_id DROP NOT NULL;
