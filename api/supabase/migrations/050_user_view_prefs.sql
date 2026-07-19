-- Migration 050: per-user view/tab preferences (list vs kanban, desktop vs
-- mobile preview, active budget tab, etc). Same grain as users.reminder_prefs
-- (account-level, not per-wedding) — a user's preferred layout is a personal
-- habit, not something that should reset when they switch which wedding
-- they're managing.
ALTER TABLE users ADD COLUMN IF NOT EXISTS view_prefs JSONB NOT NULL DEFAULT '{}';
