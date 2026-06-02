-- Fix runtime grants for TASK-742 auth recovery tables.
--
-- The tables were created with only SELECT for greenhouse_runtime, so the
-- credentials/magic-link runtime could read but not insert login attempts or
-- magic-link tokens.

-- Up Migration

GRANT USAGE ON SCHEMA greenhouse_serving TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON TABLE greenhouse_serving.auth_magic_links TO greenhouse_runtime;
GRANT INSERT ON TABLE greenhouse_serving.auth_attempts TO greenhouse_runtime;

-- Down Migration

REVOKE INSERT, UPDATE ON TABLE greenhouse_serving.auth_magic_links FROM greenhouse_runtime;
REVOKE INSERT ON TABLE greenhouse_serving.auth_attempts FROM greenhouse_runtime;
