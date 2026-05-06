-- Up Migration
SET search_path = public;

-- TASK-431 follow-up hardening / existing drift remediation.
-- Runtime login `greenhouse_app` had a direct UC grant on serving/payroll,
-- bypassing the canonical `greenhouse_runtime` group-role posture.
-- Keep USAGE for runtime reads/writes through table-level grants, but remove
-- schema-level CREATE so runtime cannot create tables/views/functions ad hoc.
REVOKE CREATE ON SCHEMA greenhouse_payroll FROM greenhouse_app;
REVOKE CREATE ON SCHEMA greenhouse_serving FROM greenhouse_app;

REVOKE CREATE ON SCHEMA greenhouse_payroll FROM greenhouse_runtime;
REVOKE CREATE ON SCHEMA greenhouse_serving FROM greenhouse_runtime;
REVOKE CREATE ON SCHEMA greenhouse_payroll FROM PUBLIC;
REVOKE CREATE ON SCHEMA greenhouse_serving FROM PUBLIC;

GRANT USAGE ON SCHEMA greenhouse_payroll TO greenhouse_app;
GRANT USAGE ON SCHEMA greenhouse_serving TO greenhouse_app;
GRANT USAGE ON SCHEMA greenhouse_payroll TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_serving TO greenhouse_runtime;

-- Down Migration
SET search_path = public;

-- Rollback restores the pre-remediation direct CREATE grant only for the
-- runtime login. Do not grant CREATE to PUBLIC or greenhouse_runtime.
GRANT CREATE ON SCHEMA greenhouse_payroll TO greenhouse_app;
GRANT CREATE ON SCHEMA greenhouse_serving TO greenhouse_app;
