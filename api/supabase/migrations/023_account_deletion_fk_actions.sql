-- Migration 023: Let account deletion succeed (DELETE /auth/me)
-- payments.user_id (005), the created_by/updated_by audit stamps (012), and
-- finance_activity.actor_user_id (011) reference users(id) with NO ACTION /
-- RESTRICT, so deleting any user with real data failed with an FK violation.
-- Wedding-scoped rows die with the user; audit stamps null out.
-- ponytail: core tables' user_id columns carry no FK at all, so their rows are
-- orphaned (unreachable — every query filters by owner) rather than purged;
-- add real FKs if true data purging ever matters.

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;
ALTER TABLE payments ADD CONSTRAINT payments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

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
