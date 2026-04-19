-- Up Migration

SET search_path = greenhouse_commercial, greenhouse_ai, greenhouse_core, greenhouse_finance, public;

GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_migrator;
GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_app;

CREATE SEQUENCE IF NOT EXISTS greenhouse_commercial.seq_tool_provider_cost_basis_snapshot_id
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  NO MAXVALUE
  CACHE 1;

CREATE OR REPLACE FUNCTION greenhouse_commercial.generate_tool_provider_cost_basis_snapshot_id()
RETURNS text AS $$
BEGIN
  RETURN 'EO-TPB-' || LPAD(nextval('greenhouse_commercial.seq_tool_provider_cost_basis_snapshot_id')::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS greenhouse_commercial.tool_provider_cost_basis_snapshots (
  snapshot_id text PRIMARY KEY
    DEFAULT greenhouse_commercial.generate_tool_provider_cost_basis_snapshot_id(),
  snapshot_key text NOT NULL UNIQUE,
  tool_id text NOT NULL
    REFERENCES greenhouse_ai.tool_catalog (tool_id) ON DELETE CASCADE,
  tool_sku text,
  tool_name text NOT NULL,
  provider_id text NOT NULL
    REFERENCES greenhouse_core.providers (provider_id) ON DELETE CASCADE,
  provider_name text NOT NULL,
  supplier_id text
    REFERENCES greenhouse_finance.suppliers (supplier_id) ON DELETE SET NULL,
  organization_id text
    REFERENCES greenhouse_core.organizations (organization_id) ON DELETE SET NULL,
  client_id text
    REFERENCES greenhouse_core.clients (client_id) ON DELETE SET NULL,
  space_id text
    REFERENCES greenhouse_core.spaces (space_id) ON DELETE SET NULL,
  tenant_scope_key text NOT NULL DEFAULT 'global',
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  period_id text NOT NULL,
  snapshot_date date NOT NULL,
  source_kind text NOT NULL
    CHECK (source_kind = ANY (ARRAY[
      'finance_observed'::text,
      'hybrid_modeled'::text,
      'license_modeled'::text,
      'usage_modeled'::text,
      'catalog_prorated'::text,
      'unresolved'::text
    ])),
  source_ref text,
  source_currency text NOT NULL DEFAULT 'CLP',
  source_amount numeric(14,2) NOT NULL DEFAULT 0,
  resolved_currency text NOT NULL DEFAULT 'CLP',
  resolved_amount numeric(14,2) NOT NULL DEFAULT 0,
  resolved_amount_clp numeric(14,2) NOT NULL DEFAULT 0,
  observed_cost_clp numeric(14,2) NOT NULL DEFAULT 0,
  modeled_subscription_cost_clp numeric(14,2) NOT NULL DEFAULT 0,
  modeled_usage_cost_clp numeric(14,2) NOT NULL DEFAULT 0,
  fallback_catalog_cost_usd numeric(14,4),
  fx_rate_to_clp numeric(14,6),
  fx_rate_date date,
  freshness_days integer NOT NULL DEFAULT 0,
  freshness_status text NOT NULL DEFAULT 'unknown'
    CHECK (freshness_status = ANY (ARRAY[
      'fresh'::text,
      'stale'::text,
      'unknown'::text
    ])),
  confidence_score numeric(5,4) NOT NULL DEFAULT 0,
  confidence_label text NOT NULL DEFAULT 'low'
    CHECK (confidence_label = ANY (ARRAY[
      'high'::text,
      'medium'::text,
      'low'::text
    ])),
  active_license_count integer NOT NULL DEFAULT 0,
  active_member_count integer NOT NULL DEFAULT 0,
  wallet_count integer NOT NULL DEFAULT 0,
  active_wallet_count integer NOT NULL DEFAULT 0,
  finance_expense_count integer NOT NULL DEFAULT 0,
  provider_snapshot_id text,
  latest_observed_expense_date date,
  latest_tooling_activity_at timestamptz,
  snapshot_status text NOT NULL DEFAULT 'complete'
    CHECK (snapshot_status = ANY (ARRAY[
      'complete'::text,
      'partial'::text,
      'unresolved'::text
    ])),
  refresh_reason text,
  detail_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  materialized_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tool_provider_cost_basis_period_month_check
    CHECK (period_month BETWEEN 1 AND 12),
  CONSTRAINT tool_provider_cost_basis_period_id_match_check
    CHECK (period_id = period_year::text || '-' || LPAD(period_month::text, 2, '0')),
  CONSTRAINT tool_provider_cost_basis_non_negative_check
    CHECK (
      source_amount >= 0
      AND resolved_amount >= 0
      AND resolved_amount_clp >= 0
      AND observed_cost_clp >= 0
      AND modeled_subscription_cost_clp >= 0
      AND modeled_usage_cost_clp >= 0
      AND active_license_count >= 0
      AND active_member_count >= 0
      AND wallet_count >= 0
      AND active_wallet_count >= 0
      AND finance_expense_count >= 0
      AND freshness_days >= 0
      AND confidence_score >= 0
      AND confidence_score <= 1
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS greenhouse_tool_provider_cost_basis_snapshot_scope_idx
  ON greenhouse_commercial.tool_provider_cost_basis_snapshots (
    tool_id,
    provider_id,
    period_year,
    period_month,
    tenant_scope_key
  );

CREATE INDEX IF NOT EXISTS greenhouse_tool_provider_cost_basis_provider_period_idx
  ON greenhouse_commercial.tool_provider_cost_basis_snapshots (
    provider_id,
    period_year DESC,
    period_month DESC
  );

CREATE INDEX IF NOT EXISTS greenhouse_tool_provider_cost_basis_tool_period_idx
  ON greenhouse_commercial.tool_provider_cost_basis_snapshots (
    tool_id,
    period_year DESC,
    period_month DESC
  );

CREATE INDEX IF NOT EXISTS greenhouse_tool_provider_cost_basis_space_period_idx
  ON greenhouse_commercial.tool_provider_cost_basis_snapshots (
    space_id,
    period_year DESC,
    period_month DESC
  )
  WHERE space_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS greenhouse_tool_provider_cost_basis_source_idx
  ON greenhouse_commercial.tool_provider_cost_basis_snapshots (
    source_kind,
    confidence_label,
    period_year DESC,
    period_month DESC
  );

ALTER TABLE greenhouse_commercial.tool_provider_cost_basis_snapshots OWNER TO greenhouse_ops;
ALTER SEQUENCE greenhouse_commercial.seq_tool_provider_cost_basis_snapshot_id OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.tool_provider_cost_basis_snapshots TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON greenhouse_commercial.tool_provider_cost_basis_snapshots TO greenhouse_migrator;
GRANT SELECT ON greenhouse_commercial.tool_provider_cost_basis_snapshots TO greenhouse_app;

GRANT USAGE, SELECT ON SEQUENCE greenhouse_commercial.seq_tool_provider_cost_basis_snapshot_id TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_commercial.seq_tool_provider_cost_basis_snapshot_id TO greenhouse_migrator;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_commercial.seq_tool_provider_cost_basis_snapshot_id TO greenhouse_app;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_commercial.tool_provider_cost_basis_snapshots;
DROP FUNCTION IF EXISTS greenhouse_commercial.generate_tool_provider_cost_basis_snapshot_id();
DROP SEQUENCE IF EXISTS greenhouse_commercial.seq_tool_provider_cost_basis_snapshot_id;
