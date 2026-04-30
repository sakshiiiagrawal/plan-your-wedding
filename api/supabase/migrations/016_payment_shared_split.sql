BEGIN;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS paid_bride_share_percentage NUMERIC(5, 2) NULL;

UPDATE payments
SET paid_bride_share_percentage = 50
WHERE paid_by_side = 'shared'
  AND paid_bride_share_percentage IS NULL;

UPDATE payments
SET paid_bride_share_percentage = NULL
WHERE paid_by_side IS DISTINCT FROM 'shared';

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_paid_by_share_chk;

ALTER TABLE payments
  ADD CONSTRAINT payments_paid_by_share_chk CHECK (
    (paid_by_side IS NULL AND paid_bride_share_percentage IS NULL)
    OR (
      paid_by_side = 'shared'
      AND paid_bride_share_percentage IS NOT NULL
      AND paid_bride_share_percentage >= 0
      AND paid_bride_share_percentage <= 100
    )
    OR (paid_by_side IN ('bride', 'groom') AND paid_bride_share_percentage IS NULL)
  );

DROP VIEW IF EXISTS finance_side_cash_rollups_v;

CREATE VIEW finance_side_cash_rollups_v AS
SELECT
  user_id,
  side,
  SUM(paid_amount)::NUMERIC(12, 2) AS paid_amount
FROM (
  SELECT
    e.user_id,
    'bride'::finance_paid_by_side AS side,
    (
      CASE
        WHEN p.paid_by_side = 'bride' THEN p.amount
        WHEN p.paid_by_side = 'shared' THEN p.amount * (COALESCE(p.paid_bride_share_percentage, 50) / 100)
        ELSE 0
      END
    ) * CASE WHEN p.direction = 'outflow' THEN 1 ELSE -1 END AS paid_amount
  FROM payments p
  JOIN expenses e ON e.id = p.expense_id
  WHERE p.status = 'posted'
    AND p.paid_by_side IS NOT NULL

  UNION ALL

  SELECT
    e.user_id,
    'groom'::finance_paid_by_side AS side,
    (
      CASE
        WHEN p.paid_by_side = 'groom' THEN p.amount
        WHEN p.paid_by_side = 'shared' THEN p.amount * ((100 - COALESCE(p.paid_bride_share_percentage, 50)) / 100)
        ELSE 0
      END
    ) * CASE WHEN p.direction = 'outflow' THEN 1 ELSE -1 END AS paid_amount
  FROM payments p
  JOIN expenses e ON e.id = p.expense_id
  WHERE p.status = 'posted'
    AND p.paid_by_side IS NOT NULL
) rolled
GROUP BY user_id, side;

COMMIT;
