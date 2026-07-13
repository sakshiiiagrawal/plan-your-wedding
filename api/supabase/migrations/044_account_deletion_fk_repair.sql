-- Migration 044: re-assert 023's FK delete actions.
-- 023 is recorded as applied on databases where it actually failed partway
-- (its payments block referenced a column 011 had dropped), leaving
-- finance_activity.actor_user_id ON DELETE RESTRICT and the created_by/
-- updated_by stamps without SET NULL — which is what makes DELETE /auth/me
-- fail for any user who ever wrote finance data. Idempotent re-run of the
-- surviving 023 statements.

ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_created_by_fkey;
ALTER TABLE guests ADD CONSTRAINT guests_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_updated_by_fkey;
ALTER TABLE guests ADD CONSTRAINT guests_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_created_by_fkey;
ALTER TABLE vendors ADD CONSTRAINT vendors_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_updated_by_fkey;
ALTER TABLE vendors ADD CONSTRAINT vendors_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;
ALTER TABLE tasks ADD CONSTRAINT tasks_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_updated_by_fkey;
ALTER TABLE tasks ADD CONSTRAINT tasks_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE finance_activity DROP CONSTRAINT IF EXISTS finance_activity_actor_user_id_fkey;
ALTER TABLE finance_activity ADD CONSTRAINT finance_activity_actor_user_id_fkey
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE CASCADE;
