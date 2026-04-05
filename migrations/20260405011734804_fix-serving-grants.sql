-- Up Migration
-- Fix: ensure greenhouse_runtime has DML on greenhouse_serving tables
-- (tables created before default privileges were properly configured)
GRANT USAGE ON SCHEMA greenhouse_serving TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA greenhouse_serving TO greenhouse_runtime;

-- Down Migration
-- No rollback needed — grants are additive and safe to keep