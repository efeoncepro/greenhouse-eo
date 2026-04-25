-- Up Migration

-- Repair migration for environments where the original SQL file was recorded in
-- pgmigrations before its DDL body was corrected. Keep this idempotent and do
-- not drop the tables on down; the canonical ownership remains in the original
-- migration file once fixed in-repo.

SET search_path = greenhouse_serving, greenhouse_core, public;

CREATE TABLE IF NOT EXISTS greenhouse_serving.service_attribution_facts (
  attribution_id text PRIMARY KEY,
  space_id text NOT NULL REFERENCES greenhouse_core.spaces(space_id) ON DELETE CASCADE,
  organization_id text,
  client_id text,
  service_id text NOT NULL REFERENCES greenhouse_core.services(service_id) ON DELETE CASCADE,
  period_year integer NOT NULL CHECK (period_year >= 2000),
  period_month integer NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  source_domain text NOT NULL CHECK (
    source_domain = ANY (ARRAY[
      'finance_revenue'::text,
      'finance_direct_cost'::text,
      'commercial_labor'::text,
      'commercial_overhead'::text
    ])
  ),
  source_type text NOT NULL,
  source_id text NOT NULL,
  amount_kind text NOT NULL CHECK (
    amount_kind = ANY (ARRAY[
      'revenue'::text,
      'direct_cost'::text,
      'labor_cost'::text,
      'overhead_cost'::text
    ])
  ),
  source_currency text,
  source_amount numeric(14,2),
  amount_clp numeric(14,2) NOT NULL,
  attribution_method text NOT NULL,
  confidence_label text NOT NULL CHECK (
    confidence_label = ANY (ARRAY[
      'high'::text,
      'medium'::text,
      'low'::text
    ])
  ),
  confidence_score numeric(5,4) NOT NULL DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  evidence_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  materialization_reason text,
  materialized_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT service_attribution_facts_unique_source UNIQUE (
    service_id,
    period_year,
    period_month,
    source_domain,
    source_type,
    source_id,
    amount_kind
  )
);

CREATE INDEX IF NOT EXISTS idx_service_attr_facts_space_period
  ON greenhouse_serving.service_attribution_facts (space_id, period_year, period_month);

CREATE INDEX IF NOT EXISTS idx_service_attr_facts_service_period
  ON greenhouse_serving.service_attribution_facts (service_id, period_year, period_month);

CREATE INDEX IF NOT EXISTS idx_service_attr_facts_source
  ON greenhouse_serving.service_attribution_facts (source_domain, source_type, source_id, period_year, period_month);

CREATE TABLE IF NOT EXISTS greenhouse_serving.service_attribution_unresolved (
  unresolved_id text PRIMARY KEY,
  period_year integer NOT NULL CHECK (period_year >= 2000),
  period_month integer NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  space_id text,
  organization_id text,
  client_id text,
  source_domain text NOT NULL CHECK (
    source_domain = ANY (ARRAY[
      'finance_revenue'::text,
      'finance_direct_cost'::text,
      'commercial_labor'::text,
      'commercial_overhead'::text
    ])
  ),
  source_type text NOT NULL,
  source_id text NOT NULL,
  amount_kind text NOT NULL CHECK (
    amount_kind = ANY (ARRAY[
      'revenue'::text,
      'direct_cost'::text,
      'labor_cost'::text,
      'overhead_cost'::text
    ])
  ),
  source_currency text,
  source_amount numeric(14,2),
  amount_clp numeric(14,2) NOT NULL,
  attempted_method text,
  reason_code text NOT NULL,
  confidence_label text NOT NULL DEFAULT 'low' CHECK (
    confidence_label = ANY (ARRAY[
      'high'::text,
      'medium'::text,
      'low'::text
    ])
  ),
  confidence_score numeric(5,4) NOT NULL DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  candidate_service_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  candidate_space_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  evidence_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  materialization_reason text,
  materialized_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT service_attribution_unresolved_unique_source UNIQUE (
    period_year,
    period_month,
    source_domain,
    source_type,
    source_id,
    amount_kind,
    reason_code
  )
);

CREATE INDEX IF NOT EXISTS idx_service_attr_unresolved_space_period
  ON greenhouse_serving.service_attribution_unresolved (space_id, period_year, period_month);

CREATE INDEX IF NOT EXISTS idx_service_attr_unresolved_org_period
  ON greenhouse_serving.service_attribution_unresolved (organization_id, period_year, period_month);

CREATE INDEX IF NOT EXISTS idx_service_attr_unresolved_source
  ON greenhouse_serving.service_attribution_unresolved (source_domain, source_type, source_id, period_year, period_month);

COMMENT ON TABLE greenhouse_serving.service_attribution_facts IS
  'TASK-452 repair: ensure canonical service-level attribution facts table exists in environments where the original migration recorded without executing DDL.';

COMMENT ON TABLE greenhouse_serving.service_attribution_unresolved IS
  'TASK-452 repair: ensure unresolved service attribution table exists in environments where the original migration recorded without executing DDL.';

-- Down Migration

-- no-op by design
