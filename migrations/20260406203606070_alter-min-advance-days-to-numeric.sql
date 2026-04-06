-- Align min_advance_days with the rest of leave_policies columns (all NUMERIC(10,2)).
-- Enables fractional-day advance rules (e.g. 1.5 days = 36 hours).

SET search_path = greenhouse_hr, public;

-- 1. Widen column from INTEGER to NUMERIC(10,2)
ALTER TABLE leave_policies
  ALTER COLUMN min_advance_days TYPE NUMERIC(10, 2) USING min_advance_days::NUMERIC(10, 2);

-- 2. Update study leave: 3 days → 1.5 days (36 hours)
UPDATE leave_policies
SET min_advance_days = 1.5, updated_at = CURRENT_TIMESTAMP
WHERE policy_id = 'policy-study-default';

-- 3. Update unpaid leave: 1 day → 2 days (48 hours)
UPDATE leave_policies
SET min_advance_days = 2, updated_at = CURRENT_TIMESTAMP
WHERE policy_id = 'policy-unpaid-default';
