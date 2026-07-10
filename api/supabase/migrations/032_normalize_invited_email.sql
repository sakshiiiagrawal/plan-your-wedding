-- Migration 032: invited_email is lowercased+trimmed at write/lookup time, but
-- historical rows may be mixed-case — those never match acceptPendingInvite's
-- lowercased lookup, and the 031 unique index is case-sensitive so a lowercase
-- duplicate could still be inserted alongside them. Normalize in place.

-- Dedupe rows that collide once normalized (same keep-preference as 031:
-- active membership over pending invite, then newest).
DELETE FROM wedding_members
WHERE id NOT IN (
  SELECT DISTINCT ON (owner_id, lower(btrim(invited_email))) id
  FROM wedding_members
  ORDER BY owner_id, lower(btrim(invited_email)), (status = 'active') DESC, created_at DESC
);

UPDATE wedding_members
SET invited_email = lower(btrim(invited_email))
WHERE invited_email <> lower(btrim(invited_email));
