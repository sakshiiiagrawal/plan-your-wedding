-- Migration 043: repoint every wedding-scoped user_id FK at weddings(id).
-- 041 guaranteed weddings.id = the old owner user id, so no values change —
-- only the constraints. All get ON DELETE CASCADE, which makes deleting a
-- weddings row purge the whole wedding (fulfilling 023's "add real FKs if true
-- data purging ever matters"). payments/expense_items/finance_activity carry
-- no user_id (they hang off expenses, with RESTRICT chains the service layer
-- clears explicitly before deleting a wedding).

-- ============================================================
-- 1. Purge orphans: rows whose user_id resolves to no wedding (left behind by
--    old account deletions that failed midway). Ordered so RESTRICT / NO ACTION
--    references are gone before their targets. Normally this deletes nothing.
-- ============================================================

-- Finance chain first (payments/allocations/activity RESTRICT on expenses).
DELETE FROM payment_allocations WHERE payment_id IN (
  SELECT p.id FROM payments p
  JOIN expenses e ON e.id = p.expense_id
  WHERE e.user_id NOT IN (SELECT id FROM weddings)
);
-- Reversal payments reference other payments (RESTRICT) — delete them first.
DELETE FROM payments WHERE reverses_payment_id IS NOT NULL AND expense_id IN (
  SELECT id FROM expenses WHERE user_id NOT IN (SELECT id FROM weddings)
);
DELETE FROM payments WHERE expense_id IN (
  SELECT id FROM expenses WHERE user_id NOT IN (SELECT id FROM weddings)
);
DELETE FROM finance_activity WHERE expense_id IN (
  SELECT id FROM expenses WHERE user_id NOT IN (SELECT id FROM weddings)
);
DELETE FROM expense_items WHERE expense_id IN (
  SELECT id FROM expenses WHERE user_id NOT IN (SELECT id FROM weddings)
);
DELETE FROM expenses WHERE user_id NOT IN (SELECT id FROM weddings);

-- Guests/groups reference each other (group_id / primary_contact_id) — break
-- the cycle, then delete leaf-first.
UPDATE guest_groups SET primary_contact_id = NULL
  WHERE user_id NOT IN (SELECT id FROM weddings);
DELETE FROM tasks WHERE user_id NOT IN (SELECT id FROM weddings);
DELETE FROM rituals WHERE event_id IN (
  SELECT id FROM events WHERE user_id NOT IN (SELECT id FROM weddings)
);
DELETE FROM events WHERE user_id NOT IN (SELECT id FROM weddings);
DELETE FROM guests WHERE user_id NOT IN (SELECT id FROM weddings);
DELETE FROM guest_groups WHERE user_id NOT IN (SELECT id FROM weddings);
DELETE FROM room_allocations WHERE room_id IN (
  SELECT r.id FROM rooms r
  JOIN venues v ON v.id = r.venue_id
  WHERE v.user_id NOT IN (SELECT id FROM weddings)
);
DELETE FROM rooms WHERE venue_id IN (
  SELECT id FROM venues WHERE user_id NOT IN (SELECT id FROM weddings)
);
DELETE FROM venues WHERE user_id NOT IN (SELECT id FROM weddings);
DELETE FROM vendors WHERE user_id NOT IN (SELECT id FROM weddings);
DELETE FROM expense_categories WHERE user_id NOT IN (SELECT id FROM weddings);
DELETE FROM expense_summary WHERE user_id NOT IN (SELECT id FROM weddings);
DELETE FROM website_content WHERE user_id NOT IN (SELECT id FROM weddings);
DELETE FROM public_pages WHERE user_id NOT IN (SELECT id FROM weddings);

-- ============================================================
-- 2. Repoint / add the FKs. DROP covers both the standard names and the two
--    legacy budget_* names that live DBs carry. NOT VALID + VALIDATE keeps the
--    lock window short on data-bearing tables.
-- ============================================================

ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_user_id_fkey;
ALTER TABLE venues ADD CONSTRAINT venues_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES weddings(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE venues VALIDATE CONSTRAINT venues_user_id_fkey;

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_user_id_fkey;
ALTER TABLE events ADD CONSTRAINT events_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES weddings(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE events VALIDATE CONSTRAINT events_user_id_fkey;

ALTER TABLE guest_groups DROP CONSTRAINT IF EXISTS guest_groups_user_id_fkey;
ALTER TABLE guest_groups ADD CONSTRAINT guest_groups_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES weddings(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE guest_groups VALIDATE CONSTRAINT guest_groups_user_id_fkey;

ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_user_id_fkey;
ALTER TABLE guests ADD CONSTRAINT guests_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES weddings(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE guests VALIDATE CONSTRAINT guests_user_id_fkey;

ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_user_id_fkey;
ALTER TABLE vendors ADD CONSTRAINT vendors_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES weddings(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE vendors VALIDATE CONSTRAINT vendors_user_id_fkey;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_user_id_fkey;
ALTER TABLE tasks ADD CONSTRAINT tasks_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES weddings(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE tasks VALIDATE CONSTRAINT tasks_user_id_fkey;

ALTER TABLE expense_categories DROP CONSTRAINT IF EXISTS budget_categories_user_id_fkey;
ALTER TABLE expense_categories DROP CONSTRAINT IF EXISTS expense_categories_user_id_fkey;
ALTER TABLE expense_categories ADD CONSTRAINT expense_categories_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES weddings(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE expense_categories VALIDATE CONSTRAINT expense_categories_user_id_fkey;

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_user_id_fkey;
ALTER TABLE expenses ADD CONSTRAINT expenses_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES weddings(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE expenses VALIDATE CONSTRAINT expenses_user_id_fkey;

ALTER TABLE expense_summary DROP CONSTRAINT IF EXISTS budget_summary_user_id_fkey;
ALTER TABLE expense_summary DROP CONSTRAINT IF EXISTS expense_summary_user_id_fkey;
ALTER TABLE expense_summary ADD CONSTRAINT expense_summary_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES weddings(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE expense_summary VALIDATE CONSTRAINT expense_summary_user_id_fkey;

ALTER TABLE website_content DROP CONSTRAINT IF EXISTS website_content_user_id_fkey;
ALTER TABLE website_content ADD CONSTRAINT website_content_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES weddings(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE website_content VALIDATE CONSTRAINT website_content_user_id_fkey;

ALTER TABLE public_pages DROP CONSTRAINT IF EXISTS public_pages_user_id_fkey;
ALTER TABLE public_pages ADD CONSTRAINT public_pages_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES weddings(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public_pages VALIDATE CONSTRAINT public_pages_user_id_fkey;
