-- Up Migration
-- Grant greenhouse_runtime SELECT on serving tables used by talent discovery and talent ops.
-- Also set default privileges for greenhouse_serving so future tables auto-grant.

GRANT SELECT ON greenhouse_serving.member_capacity_economics TO greenhouse_runtime;

-- Evidence and endorsement tables (created in TASK-319)
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.member_evidence TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.member_endorsements TO greenhouse_runtime;

-- Default privileges for greenhouse_serving (prevent future misses)
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_serving
  GRANT SELECT ON TABLES TO greenhouse_runtime;

-- Down Migration

REVOKE SELECT ON greenhouse_serving.member_capacity_economics FROM greenhouse_runtime;
