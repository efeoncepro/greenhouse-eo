-- Up Migration
-- TASK-351 hotfix — grant runtime role access to the quotation intelligence tables
-- that were missed in the original migration (20260418005940703).
--
-- `greenhouse_serving` is classified as readonly for runtime in the grant
-- reconciliation pattern, but the materialize endpoints under /api/finance/
-- commercial-intelligence/ run in Vercel as greenhouse_runtime and must be able
-- to upsert pipeline + profitability snapshots. Same shape as TASK-346 which
-- granted explicit DML on greenhouse_commercial.* tables.

ALTER TABLE greenhouse_serving.quotation_pipeline_snapshots OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_serving.quotation_profitability_snapshots OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_commercial.quotation_renewal_reminders OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON greenhouse_serving.quotation_pipeline_snapshots
  TO greenhouse_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON greenhouse_serving.quotation_profitability_snapshots
  TO greenhouse_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON greenhouse_commercial.quotation_renewal_reminders
  TO greenhouse_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON greenhouse_serving.quotation_pipeline_snapshots
  TO greenhouse_migrator;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON greenhouse_serving.quotation_profitability_snapshots
  TO greenhouse_migrator;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON greenhouse_commercial.quotation_renewal_reminders
  TO greenhouse_migrator;

-- Down Migration

REVOKE ALL PRIVILEGES
  ON greenhouse_serving.quotation_pipeline_snapshots
  FROM greenhouse_runtime, greenhouse_migrator;

REVOKE ALL PRIVILEGES
  ON greenhouse_serving.quotation_profitability_snapshots
  FROM greenhouse_runtime, greenhouse_migrator;

REVOKE ALL PRIVILEGES
  ON greenhouse_commercial.quotation_renewal_reminders
  FROM greenhouse_runtime, greenhouse_migrator;
