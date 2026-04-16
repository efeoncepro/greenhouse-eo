-- Up Migration

UPDATE greenhouse_hr.leave_policies
SET
  accrual_type = 'monthly_accrual',
  updated_at = CURRENT_TIMESTAMP
WHERE policy_id = 'policy-vacation-chile';

-- Down Migration

UPDATE greenhouse_hr.leave_policies
SET
  accrual_type = 'annual_fixed',
  updated_at = CURRENT_TIMESTAMP
WHERE policy_id = 'policy-vacation-chile';
