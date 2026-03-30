-- Migration 009: Expense payment fields + planned payments flag
-- • Add paid_amount, payment_method, payment_status to expenses
-- • Add user_id to expense_categories, expenses, expense_summary (IF NOT EXISTS)
-- • Add is_planned to payments (IF NOT EXISTS)

BEGIN;

-- ============================================================
-- 1. Ensure user_id exists on core expense tables
--    (may already exist on live DBs that had manual migrations)
-- ============================================================

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE expense_categories
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE expense_summary
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- 2. Add missing payment-tracking fields to expenses
-- ============================================================

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (
    payment_method IN ('cash', 'bank_transfer', 'upi', 'cheque', 'credit_card')
  ),
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'partial', 'paid')
  );

-- ============================================================
-- 3. Add is_planned flag to payments
--    (used to distinguish future planned payments from actual ones)
-- ============================================================

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS is_planned BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 4. Indexes for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_user ON expense_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_summary_user ON expense_summary(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_planned ON payments(is_planned) WHERE is_planned = true;

COMMIT;
