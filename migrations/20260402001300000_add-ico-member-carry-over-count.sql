-- Up Migration
SET search_path = greenhouse_serving, greenhouse_core, public;

ALTER TABLE greenhouse_serving.ico_member_metrics
  ADD COLUMN IF NOT EXISTS carry_over_count INTEGER;

-- Down Migration
SET search_path = greenhouse_serving, greenhouse_core, public;

ALTER TABLE greenhouse_serving.ico_member_metrics
  DROP COLUMN IF EXISTS carry_over_count;
