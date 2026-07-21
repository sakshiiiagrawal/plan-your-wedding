-- Splitwise-style free editing of payments.
--
-- The subledger used to assert that an item's net paid never exceeded its
-- committed amount, which made "record 12,000 against a 10,000 obligation"
-- a hard error and forced the user to invent a line item mid-edit. Real
-- weddings overpay (tips, rounding, a vendor's last-minute ask), so an
-- overpayment is now a legal state: it simply shows as Paid > Allocated, and
-- finance_item_balances_v already clamps outstanding_amount at 0 via GREATEST.
--
-- The two invariants that actually protect the ledger are kept:
--   * a posted payment must allocate exactly its own amount
--   * only posted payments may carry allocations
--   * net paid may not go negative (you cannot refund more than was paid)

BEGIN;

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

  -- Overpayment (net_paid > ei.amount) is allowed; only a negative net paid
  -- is nonsense, since it would mean refunding money never received.
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
    AND COALESCE(paid.net_paid, 0) < 0
  LIMIT 1;

  IF offending_item_id IS NOT NULL THEN
    RAISE EXCEPTION 'Expense item % has a negative net paid amount', offending_item_id;
  END IF;
END;
$$;

COMMIT;
