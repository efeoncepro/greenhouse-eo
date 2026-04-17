-- Up Migration
-- TASK-245 follow-up: grant greenhouse_app full DML on Nexa Insights serving
-- tables. Cloud Run workers (ico-batch-worker, ops-worker) connect to Postgres
-- as greenhouse_app and write enrichment results there. The original
-- TASK-118 / TASK-232 / TASK-245 migrations only granted SELECT to
-- greenhouse_runtime, which left greenhouse_app without INSERT/UPDATE/DELETE
-- and caused "permission denied" errors when the ico-batch-worker tried
-- to materialize finance signals.
--
-- Idempotent: granting an existing privilege is a no-op. We also include
-- the ICO tables defensively in case their original permissions relied on
-- implicit default privileges that could drift.

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.ico_ai_signals TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.ico_ai_signal_enrichments TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.ico_ai_enrichment_runs TO greenhouse_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.finance_ai_signals TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.finance_ai_signal_enrichments TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.finance_ai_enrichment_runs TO greenhouse_app;

-- Grant runtime role full DML too, so Vercel API routes running as
-- greenhouse_runtime (Cloud SQL Connector path) can trigger materialization
-- via /api/cron/finance-ai-signals as a fallback when the Cloud Run worker
-- is unavailable.

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.finance_ai_signals TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.finance_ai_signal_enrichments TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.finance_ai_enrichment_runs TO greenhouse_runtime;

-- Down Migration

REVOKE INSERT, UPDATE, DELETE ON greenhouse_serving.finance_ai_enrichment_runs FROM greenhouse_runtime;
REVOKE INSERT, UPDATE, DELETE ON greenhouse_serving.finance_ai_signal_enrichments FROM greenhouse_runtime;
REVOKE INSERT, UPDATE, DELETE ON greenhouse_serving.finance_ai_signals FROM greenhouse_runtime;

REVOKE ALL ON greenhouse_serving.finance_ai_enrichment_runs FROM greenhouse_app;
REVOKE ALL ON greenhouse_serving.finance_ai_signal_enrichments FROM greenhouse_app;
REVOKE ALL ON greenhouse_serving.finance_ai_signals FROM greenhouse_app;

REVOKE ALL ON greenhouse_serving.ico_ai_enrichment_runs FROM greenhouse_app;
REVOKE ALL ON greenhouse_serving.ico_ai_signal_enrichments FROM greenhouse_app;
REVOKE ALL ON greenhouse_serving.ico_ai_signals FROM greenhouse_app;
