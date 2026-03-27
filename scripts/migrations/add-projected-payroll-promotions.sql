CREATE TABLE IF NOT EXISTS greenhouse_payroll.projected_payroll_promotions ( -- projected payroll promotion audit
  promotion_id TEXT PRIMARY KEY,
  period_id TEXT NOT NULL REFERENCES greenhouse_payroll.payroll_periods(period_id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  projection_mode TEXT NOT NULL CHECK (projection_mode IN ('actual_to_date', 'projected_month_end')),
  as_of_date DATE NOT NULL,
  source_snapshot_count INTEGER NOT NULL DEFAULT 0,
  promoted_entry_count INTEGER NOT NULL DEFAULT 0,
  source_period_status TEXT,
  actor_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  actor_identifier TEXT,
  promotion_status TEXT NOT NULL DEFAULT 'started' CHECK (promotion_status IN ('started', 'completed', 'failed')),
  promoted_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS projected_payroll_promotions_period_idx
  ON greenhouse_payroll.projected_payroll_promotions (period_year DESC, period_month DESC, projection_mode);
