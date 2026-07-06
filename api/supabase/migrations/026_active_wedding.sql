-- Migration 026: Which wedding a collaborator is currently working in.
-- NULL means their own wedding (the default). Set to another user's id when the
-- user switches into a wedding they're an active member of. ON DELETE SET NULL
-- so if the owner's account is deleted, the collaborator falls back to their own.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS active_owner_id UUID REFERENCES users(id) ON DELETE SET NULL;
