-- Up Migration
SET search_path = greenhouse_serving, greenhouse_core, public;

ALTER TABLE greenhouse_serving.ico_member_metrics
  ADD COLUMN IF NOT EXISTS metric_trust_json JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE greenhouse_serving.agency_performance_reports
  ADD COLUMN IF NOT EXISTS metric_trust_json JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Down Migration
SET search_path = greenhouse_serving, greenhouse_core, public;

ALTER TABLE greenhouse_serving.agency_performance_reports
  DROP COLUMN IF EXISTS metric_trust_json;

ALTER TABLE greenhouse_serving.ico_member_metrics
  DROP COLUMN IF EXISTS metric_trust_json;
