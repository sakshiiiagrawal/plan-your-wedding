-- Migration 040: Reminders — task reminder settings, user digest prefs, digest dedupe log
-- (see REMINDERS_PLAN.md)

-- Task reminders: relative offset (follows a rescheduled due date) OR an
-- absolute date, never both. reminder_offset_days with no due_date simply
-- never fires.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_offset_days INTEGER NULL
  CHECK (reminder_offset_days >= 0);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_date DATE NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_repeat TEXT NOT NULL DEFAULT 'once'
  CHECK (reminder_repeat IN ('once', 'daily'));
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_reminder_shape_chk;
ALTER TABLE tasks ADD CONSTRAINT tasks_reminder_shape_chk CHECK (
  reminder_offset_days IS NULL OR reminder_date IS NULL
);

-- Per-user reminder preferences (same grain as users.currency).
-- email_digest: daily digest opt-out. payment_lead_days: how far ahead
-- scheduled payments surface (7 | 3 | 1).
ALTER TABLE users ADD COLUMN IF NOT EXISTS reminder_prefs JSONB NOT NULL DEFAULT
  '{"email_digest": true, "payment_lead_days": 7}';

-- Digest dedupe: insert-first claim so a cron retry can't double-email.
CREATE TABLE IF NOT EXISTS digest_log (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sent_on DATE NOT NULL,
  PRIMARY KEY (user_id, sent_on)
);
