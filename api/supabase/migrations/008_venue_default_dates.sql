-- Add default check-in/check-out dates to venues (used as defaults for room allocations)
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS default_check_in_date DATE,
  ADD COLUMN IF NOT EXISTS default_check_out_date DATE;
