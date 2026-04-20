-- Up Migration

SET search_path = greenhouse_commercial, greenhouse_core, greenhouse_sync, greenhouse_context, public;

GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_migrator;
GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_app;
GRANT USAGE ON SCHEMA greenhouse_sync TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_sync TO greenhouse_migrator;
GRANT USAGE ON SCHEMA greenhouse_context TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_context TO greenhouse_migrator;

CREATE SEQUENCE IF NOT EXISTS greenhouse_commercial.seq_commercial_cost_basis_public_id
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  NO MAXVALUE
  CACHE 1;

CREATE OR REPLACE FUNCTION greenhouse_commercial.generate_commercial_cost_basis_public_id()
RETURNS text AS $$
BEGIN
  RETURN 'EO-CCB-' || LPAD(nextval('greenhouse_commercial.seq_commercial_cost_basis_public_id')::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS greenhouse_commercial.commercial_cost_basis_snapshots (
  snapshot_key text PRIMARY KEY,
  public_id text NOT NULL UNIQUE
    DEFAULT greenhouse_commercial.generate_commercial_cost_basis_public_id(),
  source_sync_run_id text NOT NULL
    REFERENCES greenhouse_sync.source_sync_runs (sync_run_id) ON DELETE CASCADE,
  context_id text
    REFERENCES greenhouse_context.context_documents (context_id) ON DELETE SET NULL,
  basis_scope text NOT NULL
    CHECK (basis_scope = ANY (ARRAY[
      'people'::text,
      'tools'::text,
      'bundle'::text,
      'roles'::text,
      'quote_reprice'::text,
      'margin_feedback'::text
    ])),
  status text NOT NULL DEFAULT 'running'
    CHECK (status = ANY (ARRAY[
      'running'::text,
      'succeeded'::text,
      'failed'::text,
      'partial'::text,
      'cancelled'::text
    ])),
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  period_id text NOT NULL,
  organization_id text
    REFERENCES greenhouse_core.organizations (organization_id) ON DELETE SET NULL,
  space_id text
    REFERENCES greenhouse_core.spaces (space_id) ON DELETE SET NULL,
  client_id text
    REFERENCES greenhouse_core.clients (client_id) ON DELETE SET NULL,
  engine_version text NOT NULL DEFAULT 'task-483.v1',
  trigger_source text,
  triggered_by text,
  input_hash text,
  input_manifest_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  records_read integer NOT NULL DEFAULT 0,
  records_written integer NOT NULL DEFAULT 0,
  records_failed integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT commercial_cost_basis_period_month_check
    CHECK (period_month BETWEEN 1 AND 12),
  CONSTRAINT commercial_cost_basis_period_id_match_check
    CHECK (period_id = period_year::text || '-' || LPAD(period_month::text, 2, '0')),
  CONSTRAINT commercial_cost_basis_records_non_negative
    CHECK (records_read >= 0 AND records_written >= 0 AND records_failed >= 0)
);

CREATE INDEX IF NOT EXISTS greenhouse_commercial_cost_basis_scope_period_idx
  ON greenhouse_commercial.commercial_cost_basis_snapshots (basis_scope, period_year DESC, period_month DESC);

CREATE INDEX IF NOT EXISTS greenhouse_commercial_cost_basis_status_idx
  ON greenhouse_commercial.commercial_cost_basis_snapshots (status, started_at DESC);

CREATE INDEX IF NOT EXISTS greenhouse_commercial_cost_basis_run_idx
  ON greenhouse_commercial.commercial_cost_basis_snapshots (source_sync_run_id);

CREATE INDEX IF NOT EXISTS greenhouse_commercial_cost_basis_space_idx
  ON greenhouse_commercial.commercial_cost_basis_snapshots (space_id, period_year DESC, period_month DESC)
  WHERE space_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS greenhouse_commercial_cost_basis_active_run_scope_period_idx
  ON greenhouse_commercial.commercial_cost_basis_snapshots (basis_scope, period_id, COALESCE(space_id, '__global__'), source_sync_run_id);

ALTER TABLE greenhouse_commercial.commercial_cost_basis_snapshots OWNER TO greenhouse_ops;
ALTER SEQUENCE greenhouse_commercial.seq_commercial_cost_basis_public_id OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.commercial_cost_basis_snapshots TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON greenhouse_commercial.commercial_cost_basis_snapshots TO greenhouse_migrator;
GRANT SELECT ON greenhouse_commercial.commercial_cost_basis_snapshots TO greenhouse_app;

GRANT USAGE, SELECT ON SEQUENCE greenhouse_commercial.seq_commercial_cost_basis_public_id TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_commercial.seq_commercial_cost_basis_public_id TO greenhouse_migrator;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_commercial.seq_commercial_cost_basis_public_id TO greenhouse_app;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_commercial.commercial_cost_basis_snapshots;
DROP FUNCTION IF EXISTS greenhouse_commercial.generate_commercial_cost_basis_public_id();
DROP SEQUENCE IF EXISTS greenhouse_commercial.seq_commercial_cost_basis_public_id;
