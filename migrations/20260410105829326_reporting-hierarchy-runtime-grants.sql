-- Up Migration

SET search_path = greenhouse_core, public;

ALTER TABLE greenhouse_core.reporting_lines OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.reporting_lines TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.reporting_lines TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.reporting_lines TO greenhouse_migrator_user;

GRANT EXECUTE ON FUNCTION greenhouse_core.touch_reporting_lines_updated_at() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_core.touch_reporting_lines_updated_at() TO greenhouse_app;
GRANT EXECUTE ON FUNCTION greenhouse_core.touch_reporting_lines_updated_at() TO greenhouse_migrator_user;

GRANT EXECUTE ON FUNCTION greenhouse_core.sync_current_reports_to_snapshot(TEXT) TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_core.sync_current_reports_to_snapshot(TEXT) TO greenhouse_app;
GRANT EXECUTE ON FUNCTION greenhouse_core.sync_current_reports_to_snapshot(TEXT) TO greenhouse_migrator_user;

GRANT EXECUTE ON FUNCTION greenhouse_core.reporting_lines_sync_snapshot_trigger() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_core.reporting_lines_sync_snapshot_trigger() TO greenhouse_app;
GRANT EXECUTE ON FUNCTION greenhouse_core.reporting_lines_sync_snapshot_trigger() TO greenhouse_migrator_user;

-- Down Migration

REVOKE EXECUTE ON FUNCTION greenhouse_core.reporting_lines_sync_snapshot_trigger() FROM greenhouse_migrator_user;
REVOKE EXECUTE ON FUNCTION greenhouse_core.reporting_lines_sync_snapshot_trigger() FROM greenhouse_app;
REVOKE EXECUTE ON FUNCTION greenhouse_core.reporting_lines_sync_snapshot_trigger() FROM greenhouse_runtime;

REVOKE EXECUTE ON FUNCTION greenhouse_core.sync_current_reports_to_snapshot(TEXT) FROM greenhouse_migrator_user;
REVOKE EXECUTE ON FUNCTION greenhouse_core.sync_current_reports_to_snapshot(TEXT) FROM greenhouse_app;
REVOKE EXECUTE ON FUNCTION greenhouse_core.sync_current_reports_to_snapshot(TEXT) FROM greenhouse_runtime;

REVOKE EXECUTE ON FUNCTION greenhouse_core.touch_reporting_lines_updated_at() FROM greenhouse_migrator_user;
REVOKE EXECUTE ON FUNCTION greenhouse_core.touch_reporting_lines_updated_at() FROM greenhouse_app;
REVOKE EXECUTE ON FUNCTION greenhouse_core.touch_reporting_lines_updated_at() FROM greenhouse_runtime;

REVOKE SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.reporting_lines FROM greenhouse_migrator_user;
REVOKE SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.reporting_lines FROM greenhouse_app;
REVOKE SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.reporting_lines FROM greenhouse_runtime;
