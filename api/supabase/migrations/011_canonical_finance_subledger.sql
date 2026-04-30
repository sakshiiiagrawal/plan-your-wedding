BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  CREATE TYPE finance_source_type AS ENUM ('manual', 'vendor', 'venue');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE finance_header_status AS ENUM ('active', 'closed', 'terminated');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE finance_item_side AS ENUM ('bride', 'groom', 'shared');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE finance_payment_direction AS ENUM ('outflow', 'inflow');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE finance_payment_status AS ENUM ('scheduled', 'posted', 'cancelled', 'entered_in_error');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE finance_paid_by_side AS ENUM ('bride', 'groom', 'shared');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE finance_activity_entity_type AS ENUM ('expense', 'expense_item', 'payment', 'payment_allocation');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE finance_activity_action_type AS ENUM (
    'created',
    'updated',
    'deleted',
    'cancelled',
    'status_changed',
    'reallocated',
    'entered_in_error'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE vendors DROP COLUMN IF EXISTS category;
ALTER TABLE vendors DROP COLUMN IF EXISTS total_cost;
ALTER TABLE vendors DROP COLUMN IF EXISTS side;
ALTER TABLE vendors DROP COLUMN IF EXISTS is_shared;

ALTER TABLE venues DROP COLUMN IF EXISTS total_cost;

DROP VIEW IF EXISTS finance_side_cash_rollups_v;
DROP VIEW IF EXISTS finance_side_liability_rollups_v;
DROP VIEW IF EXISTS finance_category_rollups_v;
DROP VIEW IF EXISTS finance_scheduled_payments_v;
DROP VIEW IF EXISTS finance_expense_balances_v;
DROP VIEW IF EXISTS finance_item_balances_v;

DROP TABLE IF EXISTS payment_allocations CASCADE;
DROP TABLE IF EXISTS finance_activity CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS expense_items CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type finance_source_type NOT NULL,
  source_id UUID NULL,
  description TEXT NOT NULL,
  expense_date DATE NOT NULL,
  notes TEXT NULL,
  status finance_header_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT expenses_source_shape_chk CHECK (
    (source_type = 'manual' AND source_id IS NULL)
    OR (source_type IN ('vendor', 'venue') AND source_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX expenses_one_active_source_idx
  ON expenses (source_type, source_id)
  WHERE status = 'active' AND source_id IS NOT NULL;

CREATE INDEX expenses_user_status_idx ON expenses (user_id, status, expense_date DESC);
CREATE INDEX expenses_source_idx ON expenses (source_type, source_id);

CREATE TABLE expense_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
  event_id UUID NULL REFERENCES events(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  side finance_item_side NOT NULL,
  bride_share_percentage NUMERIC(5, 2) NULL,
  display_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT expense_items_shared_pct_chk CHECK (
    (side = 'shared' AND bride_share_percentage IS NOT NULL AND bride_share_percentage >= 0 AND bride_share_percentage <= 100)
    OR (side IN ('bride', 'groom') AND bride_share_percentage IS NULL)
  )
);

CREATE INDEX expense_items_expense_order_idx ON expense_items (expense_id, display_order, id);
CREATE INDEX expense_items_category_idx ON expense_items (category_id);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  direction finance_payment_direction NOT NULL DEFAULT 'outflow',
  status finance_payment_status NOT NULL,
  due_date DATE NULL,
  paid_date DATE NULL,
  payment_method payment_method NULL,
  paid_by_side finance_paid_by_side NULL,
  transaction_reference TEXT NULL,
  notes TEXT NULL,
  reverses_payment_id UUID NULL REFERENCES payments(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payments_status_fields_chk CHECK (
    (status = 'scheduled' AND due_date IS NOT NULL AND paid_date IS NULL AND payment_method IS NULL)
    OR (status = 'cancelled' AND due_date IS NOT NULL AND paid_date IS NULL AND payment_method IS NULL)
    OR (status = 'posted' AND paid_date IS NOT NULL AND payment_method IS NOT NULL)
    OR (status = 'entered_in_error' AND paid_date IS NOT NULL AND payment_method IS NOT NULL)
  ),
  CONSTRAINT payments_reversal_direction_chk CHECK (
    reverses_payment_id IS NULL OR direction = 'inflow'
  )
);

CREATE INDEX payments_expense_idx ON payments (expense_id, created_at DESC);
CREATE INDEX payments_status_due_idx ON payments (status, due_date);

CREATE TABLE payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  expense_item_id UUID NOT NULL REFERENCES expense_items(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payment_allocations_unique_item_per_payment UNIQUE (payment_id, expense_item_id)
);

CREATE INDEX payment_allocations_payment_idx ON payment_allocations (payment_id);
CREATE INDEX payment_allocations_expense_item_idx ON payment_allocations (expense_item_id);

CREATE TABLE finance_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE RESTRICT,
  entity_type finance_activity_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  action_type finance_activity_action_type NOT NULL,
  before_state JSONB NULL,
  after_state JSONB NULL,
  actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX finance_activity_expense_created_idx ON finance_activity (expense_id, created_at DESC);
CREATE INDEX finance_activity_entity_idx ON finance_activity (entity_type, entity_id, created_at DESC);

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expense_items_updated_at
  BEFORE UPDATE ON expense_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_allocations_updated_at
  BEFORE UPDATE ON payment_allocations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION finance_validate_expense_source()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.source_type = 'manual' THEN
    IF NEW.source_id IS NOT NULL THEN
      RAISE EXCEPTION 'Manual expenses cannot have source_id';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.source_type = 'vendor' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM vendors v
      WHERE v.id = NEW.source_id
        AND v.user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Vendor source % is invalid for expense %', NEW.source_id, NEW.id;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.source_type = 'venue' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM venues v
      WHERE v.id = NEW.source_id
        AND v.user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Venue source % is invalid for expense %', NEW.source_id, NEW.id;
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Unsupported expense source_type %', NEW.source_type;
END;
$$;

CREATE TRIGGER validate_expense_source_trigger
  BEFORE INSERT OR UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION finance_validate_expense_source();

CREATE OR REPLACE FUNCTION finance_prevent_vendor_delete_with_history()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM expenses e
    WHERE e.source_type = 'vendor'
      AND e.source_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Cannot delete vendor with linked finance history';
  END IF;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION finance_prevent_venue_delete_with_history()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM expenses e
    WHERE e.source_type = 'venue'
      AND e.source_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Cannot delete venue with linked finance history';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS prevent_vendor_delete_with_history_trigger ON vendors;
CREATE TRIGGER prevent_vendor_delete_with_history_trigger
  BEFORE DELETE ON vendors
  FOR EACH ROW EXECUTE FUNCTION finance_prevent_vendor_delete_with_history();

DROP TRIGGER IF EXISTS prevent_venue_delete_with_history_trigger ON venues;
CREATE TRIGGER prevent_venue_delete_with_history_trigger
  BEFORE DELETE ON venues
  FOR EACH ROW EXECUTE FUNCTION finance_prevent_venue_delete_with_history();

CREATE OR REPLACE FUNCTION finance_validate_payment_allocation_expense()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  payment_expense_id UUID;
  item_expense_id UUID;
BEGIN
  SELECT expense_id INTO payment_expense_id
  FROM payments
  WHERE id = NEW.payment_id;

  SELECT expense_id INTO item_expense_id
  FROM expense_items
  WHERE id = NEW.expense_item_id;

  IF payment_expense_id IS NULL OR item_expense_id IS NULL OR payment_expense_id <> item_expense_id THEN
    RAISE EXCEPTION 'Payment allocation must point to an item under the same expense';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_payment_allocation_expense_trigger
  BEFORE INSERT OR UPDATE ON payment_allocations
  FOR EACH ROW EXECUTE FUNCTION finance_validate_payment_allocation_expense();

CREATE OR REPLACE FUNCTION finance_validate_payment_reverse_link()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  reversed_expense_id UUID;
BEGIN
  IF NEW.reverses_payment_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT expense_id INTO reversed_expense_id
  FROM payments
  WHERE id = NEW.reverses_payment_id;

  IF reversed_expense_id IS NULL OR reversed_expense_id <> NEW.expense_id THEN
    RAISE EXCEPTION 'Reversed payment must belong to the same expense';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_payment_reverse_link_trigger
  BEFORE INSERT OR UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION finance_validate_payment_reverse_link();

CREATE OR REPLACE FUNCTION finance_assert_expense_integrity(target_expense_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  mismatch_payment_id UUID;
  offending_item_id UUID;
BEGIN
  IF target_expense_id IS NULL THEN
    RETURN;
  END IF;

  SELECT p.id
  INTO mismatch_payment_id
  FROM payments p
  LEFT JOIN payment_allocations pa ON pa.payment_id = p.id
  WHERE p.expense_id = target_expense_id
    AND p.status = 'posted'
  GROUP BY p.id, p.amount
  HAVING COALESCE(SUM(pa.amount), 0) <> p.amount
  LIMIT 1;

  IF mismatch_payment_id IS NOT NULL THEN
    RAISE EXCEPTION 'Posted payment % must allocate exactly its full amount', mismatch_payment_id;
  END IF;

  SELECT p.id
  INTO mismatch_payment_id
  FROM payments p
  JOIN payment_allocations pa ON pa.payment_id = p.id
  WHERE p.expense_id = target_expense_id
    AND p.status <> 'posted'
  LIMIT 1;

  IF mismatch_payment_id IS NOT NULL THEN
    RAISE EXCEPTION 'Only posted payments may have allocations (payment %)', mismatch_payment_id;
  END IF;

  SELECT ei.id
  INTO offending_item_id
  FROM expense_items ei
  LEFT JOIN (
    SELECT
      pa.expense_item_id,
      SUM(
        CASE
          WHEN p.direction = 'outflow' THEN pa.amount
          ELSE -pa.amount
        END
      ) AS net_paid
    FROM payment_allocations pa
    JOIN payments p ON p.id = pa.payment_id
    WHERE p.status = 'posted'
      AND p.expense_id = target_expense_id
    GROUP BY pa.expense_item_id
  ) paid ON paid.expense_item_id = ei.id
  WHERE ei.expense_id = target_expense_id
    AND (
      COALESCE(paid.net_paid, 0) < 0
      OR COALESCE(paid.net_paid, 0) > ei.amount
    )
  LIMIT 1;

  IF offending_item_id IS NOT NULL THEN
    RAISE EXCEPTION 'Expense item % has invalid net paid amount', offending_item_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION finance_validate_expense_integrity_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_expense_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'payments' THEN
    target_expense_id := COALESCE(NEW.expense_id, OLD.expense_id);
  ELSIF TG_TABLE_NAME = 'expense_items' THEN
    target_expense_id := COALESCE(NEW.expense_id, OLD.expense_id);
  ELSE
    SELECT expense_id
    INTO target_expense_id
    FROM payments
    WHERE id = COALESCE(NEW.payment_id, OLD.payment_id);
  END IF;

  PERFORM finance_assert_expense_integrity(target_expense_id);
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER validate_payments_expense_integrity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON payments
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION finance_validate_expense_integrity_trigger();

CREATE CONSTRAINT TRIGGER validate_payment_allocations_expense_integrity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON payment_allocations
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION finance_validate_expense_integrity_trigger();

CREATE CONSTRAINT TRIGGER validate_expense_items_expense_integrity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON expense_items
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION finance_validate_expense_integrity_trigger();

CREATE VIEW finance_item_balances_v AS
WITH item_paid AS (
  SELECT
    pa.expense_item_id,
    SUM(
      CASE
        WHEN p.direction = 'outflow' THEN pa.amount
        ELSE -pa.amount
      END
    ) AS paid_amount
  FROM payment_allocations pa
  JOIN payments p ON p.id = pa.payment_id
  WHERE p.status = 'posted'
  GROUP BY pa.expense_item_id
)
SELECT
  e.user_id,
  e.id AS expense_id,
  e.source_type,
  e.source_id,
  e.status AS expense_status,
  e.description AS expense_description,
  e.expense_date,
  ei.id AS expense_item_id,
  ei.category_id,
  ei.event_id,
  ei.description AS item_description,
  ei.amount AS committed_amount,
  ei.side,
  ei.bride_share_percentage,
  ei.display_order,
  COALESCE(ip.paid_amount, 0)::NUMERIC(12, 2) AS paid_amount,
  GREATEST(ei.amount - COALESCE(ip.paid_amount, 0), 0)::NUMERIC(12, 2) AS outstanding_amount
FROM expenses e
JOIN expense_items ei ON ei.expense_id = e.id
LEFT JOIN item_paid ip ON ip.expense_item_id = ei.id;

CREATE VIEW finance_expense_balances_v AS
SELECT
  fib.user_id,
  fib.expense_id,
  fib.source_type,
  fib.source_id,
  fib.expense_status,
  fib.expense_description,
  fib.expense_date,
  COUNT(*)::INTEGER AS item_count,
  SUM(fib.committed_amount)::NUMERIC(12, 2) AS committed_amount,
  SUM(fib.paid_amount)::NUMERIC(12, 2) AS paid_amount,
  SUM(fib.outstanding_amount)::NUMERIC(12, 2) AS outstanding_amount
FROM finance_item_balances_v fib
GROUP BY
  fib.user_id,
  fib.expense_id,
  fib.source_type,
  fib.source_id,
  fib.expense_status,
  fib.expense_description,
  fib.expense_date;

CREATE VIEW finance_scheduled_payments_v AS
SELECT
  p.id,
  e.user_id,
  p.expense_id,
  e.description AS expense_description,
  e.source_type,
  e.source_id,
  p.amount,
  p.direction,
  p.status,
  p.due_date,
  p.notes,
  p.created_at
FROM payments p
JOIN expenses e ON e.id = p.expense_id
WHERE p.status = 'scheduled';

CREATE VIEW finance_category_rollups_v AS
SELECT
  fib.user_id,
  fib.category_id,
  ec.parent_category_id,
  SUM(fib.committed_amount)::NUMERIC(12, 2) AS committed_amount,
  SUM(fib.paid_amount)::NUMERIC(12, 2) AS paid_amount,
  SUM(fib.outstanding_amount)::NUMERIC(12, 2) AS outstanding_amount
FROM finance_item_balances_v fib
JOIN expense_categories ec ON ec.id = fib.category_id
GROUP BY fib.user_id, fib.category_id, ec.parent_category_id;

CREATE VIEW finance_side_liability_rollups_v AS
SELECT
  user_id,
  side,
  SUM(committed_amount)::NUMERIC(12, 2) AS committed_amount,
  SUM(paid_amount)::NUMERIC(12, 2) AS paid_amount,
  SUM(outstanding_amount)::NUMERIC(12, 2) AS outstanding_amount
FROM (
  SELECT
    fib.user_id,
    'bride'::finance_paid_by_side AS side,
    CASE
      WHEN fib.side = 'bride' THEN fib.committed_amount
      WHEN fib.side = 'shared' THEN fib.committed_amount * (fib.bride_share_percentage / 100)
      ELSE 0
    END AS committed_amount,
    CASE
      WHEN fib.side = 'bride' THEN fib.paid_amount
      WHEN fib.side = 'shared' THEN fib.paid_amount * (fib.bride_share_percentage / 100)
      ELSE 0
    END AS paid_amount,
    CASE
      WHEN fib.side = 'bride' THEN fib.outstanding_amount
      WHEN fib.side = 'shared' THEN fib.outstanding_amount * (fib.bride_share_percentage / 100)
      ELSE 0
    END AS outstanding_amount
  FROM finance_item_balances_v fib

  UNION ALL

  SELECT
    fib.user_id,
    'groom'::finance_paid_by_side AS side,
    CASE
      WHEN fib.side = 'groom' THEN fib.committed_amount
      WHEN fib.side = 'shared' THEN fib.committed_amount * ((100 - fib.bride_share_percentage) / 100)
      ELSE 0
    END AS committed_amount,
    CASE
      WHEN fib.side = 'groom' THEN fib.paid_amount
      WHEN fib.side = 'shared' THEN fib.paid_amount * ((100 - fib.bride_share_percentage) / 100)
      ELSE 0
    END AS paid_amount,
    CASE
      WHEN fib.side = 'groom' THEN fib.outstanding_amount
      WHEN fib.side = 'shared' THEN fib.outstanding_amount * ((100 - fib.bride_share_percentage) / 100)
      ELSE 0
    END AS outstanding_amount
  FROM finance_item_balances_v fib
) rolled
GROUP BY user_id, side;

CREATE VIEW finance_side_cash_rollups_v AS
SELECT
  e.user_id,
  p.paid_by_side AS side,
  SUM(
    CASE
      WHEN p.direction = 'outflow' THEN p.amount
      ELSE -p.amount
    END
  )::NUMERIC(12, 2) AS paid_amount
FROM payments p
JOIN expenses e ON e.id = p.expense_id
WHERE p.status = 'posted'
  AND p.paid_by_side IS NOT NULL
GROUP BY e.user_id, p.paid_by_side;

COMMIT;
