-- Reverses 039. The "planned" estimate was removed from the product: it was a
-- second money figure users had to reconcile against Allocated, and every
-- surface that showed both had to explain the difference. Allocated is now the
-- single figure the app rolls up.
--
-- Drops expense_items.planned_amount and rebuilds the four finance views
-- without it. Same drop order as 011/039 — dependents first, base view last.
--
-- IRREVERSIBLE: existing planned_amount values are destroyed. Re-applying 039
-- recreates the column but backfills planned = amount.
--
-- Views not touched: finance_scheduled_payments_v and finance_side_cash_rollups_v
-- read from payments only and do not depend on finance_item_balances_v.

BEGIN;

DROP VIEW IF EXISTS finance_side_liability_rollups_v;
DROP VIEW IF EXISTS finance_category_rollups_v;
DROP VIEW IF EXISTS finance_expense_balances_v;
DROP VIEW IF EXISTS finance_item_balances_v;

-- Column goes only after the views that select it are gone.
ALTER TABLE expense_items DROP CONSTRAINT IF EXISTS expense_items_planned_amount_nonnegative;
ALTER TABLE expense_items DROP COLUMN IF EXISTS planned_amount;

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

COMMIT;
