-- Up Migration
SET search_path = greenhouse_growth, greenhouse_core, public;
-- Multiple legacy profiles are separate configurations, not proven duplicates.
-- Preserve them while country/locale ownership is explicitly reconciled by the operator.
DROP INDEX IF EXISTS greenhouse_growth.grader_profiles_one_active_org;
DO $$ BEGIN
 IF to_regclass('greenhouse_growth.grader_profiles_one_active_org') IS NOT NULL THEN
  RAISE EXCEPTION 'TASK-1863 legacy profile compatibility index removal failed';
 END IF;
END $$;

-- Down Migration
-- Intentionally retain permissive compatibility: restoring uniqueness would reject live legacy profiles.
SELECT 1;
