-- Migration 030: Invalidate pre-existing sessions on password change/reset.
-- verifyToken rejects JWTs issued before this timestamp, so a stolen 7-day
-- session dies the moment the account owner resets or changes their password.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
