-- Up Migration

-- TASK-812 resilience fix: the same deterministic file can be downloaded more
-- than once by an operator. Keep hash indexed for audit lookup, but do not make
-- it unique.

DROP INDEX IF EXISTS greenhouse_payroll.compliance_export_artifacts_file_hash_unique_idx;

CREATE INDEX IF NOT EXISTS compliance_export_artifacts_file_hash_idx
  ON greenhouse_payroll.compliance_export_artifacts(export_kind, artifact_sha256);

-- Down Migration

DROP INDEX IF EXISTS greenhouse_payroll.compliance_export_artifacts_file_hash_idx;

CREATE UNIQUE INDEX IF NOT EXISTS compliance_export_artifacts_file_hash_unique_idx
  ON greenhouse_payroll.compliance_export_artifacts(export_kind, artifact_sha256);
