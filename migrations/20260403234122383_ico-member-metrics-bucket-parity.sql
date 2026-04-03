-- Up Migration
SET search_path = greenhouse_serving, greenhouse_core, public;

ALTER TABLE greenhouse_serving.ico_member_metrics
  ADD COLUMN IF NOT EXISTS on_time_count INTEGER,
  ADD COLUMN IF NOT EXISTS late_drop_count INTEGER,
  ADD COLUMN IF NOT EXISTS overdue_count INTEGER,
  ADD COLUMN IF NOT EXISTS overdue_carried_forward_count INTEGER;

CREATE INDEX IF NOT EXISTS idx_ico_member_metrics_member_period
  ON greenhouse_serving.ico_member_metrics (member_id, period_year DESC, period_month DESC);

-- Down Migration
SET search_path = greenhouse_serving, greenhouse_core, public;

DROP INDEX IF EXISTS idx_ico_member_metrics_member_period;

ALTER TABLE greenhouse_serving.ico_member_metrics
  DROP COLUMN IF EXISTS overdue_carried_forward_count,
  DROP COLUMN IF EXISTS overdue_count,
  DROP COLUMN IF EXISTS late_drop_count,
  DROP COLUMN IF EXISTS on_time_count;
