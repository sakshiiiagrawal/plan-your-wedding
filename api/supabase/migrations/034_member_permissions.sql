-- Migration 034: Fine-grained member permissions.
-- permissions is an opt-in grant list on top of role/allowed_sections:
-- 'budget:splits' (see/edit bride-groom liability split) and 'members:manage'
-- (invite/manage other members). Admins implicitly hold all permissions.
ALTER TABLE wedding_members
  ADD COLUMN IF NOT EXISTS permissions TEXT[] NOT NULL DEFAULT '{}';

-- Existing non-admin members could already see splits under the old model —
-- preserve that behavior. members:manage is NOT backfilled (member
-- management was admin-only before this migration).
UPDATE wedding_members SET permissions = ARRAY['budget:splits'] WHERE role <> 'admin';
