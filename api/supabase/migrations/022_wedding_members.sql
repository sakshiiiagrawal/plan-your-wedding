-- Migration 022: Wedding collaboration — invite other users with roles
CREATE TABLE IF NOT EXISTS wedding_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_id UUID REFERENCES users(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'active')) DEFAULT 'pending',
  token_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (owner_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_wedding_members_member_id ON wedding_members(member_id);
CREATE INDEX IF NOT EXISTS idx_wedding_members_token_hash ON wedding_members(token_hash);
