-- TASK-204: Add overdue_carried_forward_count to serving tables
-- Separates Carry-Over (forward workload) from Overdue Carried Forward (backward debt)

ALTER TABLE greenhouse_serving.agency_performance_reports
  ADD COLUMN IF NOT EXISTS overdue_carried_forward_count INTEGER;

ALTER TABLE greenhouse_serving.ico_member_metrics
  ADD COLUMN IF NOT EXISTS overdue_carried_forward_count INTEGER;

---- DOWN ----

ALTER TABLE greenhouse_serving.agency_performance_reports
  DROP COLUMN IF EXISTS overdue_carried_forward_count;

ALTER TABLE greenhouse_serving.ico_member_metrics
  DROP COLUMN IF EXISTS overdue_carried_forward_count;
