-- Up Migration
-- TASK-542 Fase H: serving snapshot for Commercial Party Lifecycle admin views.
-- Source of truth remains:
--   - greenhouse_core.organization_lifecycle_history
--   - greenhouse_commercial.party_sync_conflicts
-- The snapshot denormalizes current state + stage timestamps for serving.

CREATE TABLE IF NOT EXISTS greenhouse_serving.party_lifecycle_snapshots (
  organization_id text PRIMARY KEY
    REFERENCES greenhouse_core.organizations(organization_id) ON DELETE CASCADE,
  commercial_party_id uuid NOT NULL,
  hubspot_company_id text,
  organization_name text NOT NULL,

  lifecycle_stage text NOT NULL,
  lifecycle_stage_since timestamptz NOT NULL,
  lifecycle_stage_source text NOT NULL,
  lifecycle_stage_by text,

  first_seen_at timestamptz NOT NULL,
  latest_history_id uuid,
  latest_transition_at timestamptz NOT NULL,
  latest_transition_source text,
  latest_transition_by text,
  latest_reason text,

  prospect_at timestamptz,
  opportunity_at timestamptz,
  active_client_at timestamptz,
  inactive_at timestamptz,
  churned_at timestamptz,
  provider_only_at timestamptz,
  disqualified_at timestamptz,

  total_transitions integer NOT NULL DEFAULT 0,
  unresolved_conflicts_count integer NOT NULL DEFAULT 0,
  last_conflict_at timestamptz,
  last_conflict_type text,

  last_quote_at timestamptz,
  active_quotes_count integer NOT NULL DEFAULT 0,
  last_contract_at timestamptz,
  active_contracts_count integer NOT NULL DEFAULT 0,

  materialized_at timestamptz NOT NULL DEFAULT NOW(),

  CONSTRAINT party_lifecycle_snapshots_stage_valid
    CHECK (lifecycle_stage IN (
      'prospect', 'opportunity', 'active_client', 'inactive',
      'churned', 'provider_only', 'disqualified'
    )),
  CONSTRAINT party_lifecycle_snapshots_stage_source_valid
    CHECK (lifecycle_stage_source IN (
      'bootstrap', 'hubspot_sync', 'manual', 'auto_sweep',
      'quote_converted', 'deal_won', 'contract_created',
      'deal_lost_sweep', 'inactivity_sweep', 'operator_override'
    )),
  CONSTRAINT party_lifecycle_snapshots_transition_counts_non_negative
    CHECK (total_transitions >= 0),
  CONSTRAINT party_lifecycle_snapshots_conflicts_non_negative
    CHECK (unresolved_conflicts_count >= 0),
  CONSTRAINT party_lifecycle_snapshots_quotes_non_negative
    CHECK (active_quotes_count >= 0),
  CONSTRAINT party_lifecycle_snapshots_contracts_non_negative
    CHECK (active_contracts_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_party_lifecycle_snapshots_party
  ON greenhouse_serving.party_lifecycle_snapshots (commercial_party_id);

CREATE INDEX IF NOT EXISTS idx_party_lifecycle_snapshots_stage
  ON greenhouse_serving.party_lifecycle_snapshots (lifecycle_stage, latest_transition_at DESC);

CREATE INDEX IF NOT EXISTS idx_party_lifecycle_snapshots_conflicts
  ON greenhouse_serving.party_lifecycle_snapshots (unresolved_conflicts_count, last_conflict_at DESC)
  WHERE unresolved_conflicts_count > 0;

CREATE INDEX IF NOT EXISTS idx_party_lifecycle_snapshots_hubspot
  ON greenhouse_serving.party_lifecycle_snapshots (hubspot_company_id)
  WHERE hubspot_company_id IS NOT NULL;

COMMENT ON TABLE greenhouse_serving.party_lifecycle_snapshots IS
  'TASK-542: serving snapshot for admin commercial party lifecycle surfaces. Derived from organization_lifecycle_history + party_sync_conflicts + quote/contract rollups.';

ALTER TABLE greenhouse_serving.party_lifecycle_snapshots OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON greenhouse_serving.party_lifecycle_snapshots
  TO greenhouse_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON greenhouse_serving.party_lifecycle_snapshots
  TO greenhouse_migrator;

GRANT SELECT
  ON greenhouse_serving.party_lifecycle_snapshots
  TO greenhouse_app;

WITH history_rollup AS (
  SELECT
    h.organization_id,
    MIN(h.transitioned_at) AS first_seen_at,
    MIN(h.transitioned_at) FILTER (WHERE h.to_stage = 'prospect') AS prospect_at,
    MIN(h.transitioned_at) FILTER (WHERE h.to_stage = 'opportunity') AS opportunity_at,
    MIN(h.transitioned_at) FILTER (WHERE h.to_stage = 'active_client') AS active_client_at,
    MIN(h.transitioned_at) FILTER (WHERE h.to_stage = 'inactive') AS inactive_at,
    MIN(h.transitioned_at) FILTER (WHERE h.to_stage = 'churned') AS churned_at,
    MIN(h.transitioned_at) FILTER (WHERE h.to_stage = 'provider_only') AS provider_only_at,
    MIN(h.transitioned_at) FILTER (WHERE h.to_stage = 'disqualified') AS disqualified_at,
    COUNT(*)::integer AS total_transitions
  FROM greenhouse_core.organization_lifecycle_history h
  GROUP BY h.organization_id
),
latest_history AS (
  SELECT DISTINCT ON (h.organization_id)
    h.organization_id,
    h.history_id,
    h.transitioned_at,
    h.transition_source,
    h.transitioned_by,
    NULLIF(COALESCE(h.metadata ->> 'reason', h.metadata ->> 'backfill_task'), '') AS latest_reason
  FROM greenhouse_core.organization_lifecycle_history h
  ORDER BY h.organization_id, h.transitioned_at DESC, h.history_id DESC
),
conflict_rollup AS (
  SELECT
    c.organization_id,
    COUNT(*) FILTER (WHERE c.resolution_status = 'pending')::integer AS unresolved_conflicts_count,
    MAX(c.detected_at) AS last_conflict_at,
    (
      ARRAY_AGG(c.conflict_type ORDER BY c.detected_at DESC, c.conflict_id DESC)
    )[1] AS last_conflict_type
  FROM greenhouse_commercial.party_sync_conflicts c
  WHERE c.organization_id IS NOT NULL
  GROUP BY c.organization_id
),
quote_summary AS (
  SELECT
    q.organization_id,
    MAX(COALESCE(q.issued_at, q.quote_date::timestamp, q.created_at)) FILTER (
      WHERE q.status = ANY(ARRAY['issued', 'approved', 'sent']::text[])
    ) AS last_quote_at,
    COUNT(*) FILTER (
      WHERE q.status = ANY(ARRAY['issued', 'approved', 'sent']::text[])
    )::integer AS active_quotes_count
  FROM greenhouse_commercial.quotations q
  WHERE q.organization_id IS NOT NULL
  GROUP BY q.organization_id
),
contract_summary AS (
  SELECT
    c.organization_id,
    MAX(COALESCE(c.signed_at, c.start_date::timestamp, c.created_at)) AS last_contract_at,
    COUNT(*) FILTER (WHERE c.status = 'active')::integer AS active_contracts_count
  FROM greenhouse_commercial.contracts c
  WHERE c.organization_id IS NOT NULL
  GROUP BY c.organization_id
)
INSERT INTO greenhouse_serving.party_lifecycle_snapshots (
  organization_id,
  commercial_party_id,
  hubspot_company_id,
  organization_name,
  lifecycle_stage,
  lifecycle_stage_since,
  lifecycle_stage_source,
  lifecycle_stage_by,
  first_seen_at,
  latest_history_id,
  latest_transition_at,
  latest_transition_source,
  latest_transition_by,
  latest_reason,
  prospect_at,
  opportunity_at,
  active_client_at,
  inactive_at,
  churned_at,
  provider_only_at,
  disqualified_at,
  total_transitions,
  unresolved_conflicts_count,
  last_conflict_at,
  last_conflict_type,
  last_quote_at,
  active_quotes_count,
  last_contract_at,
  active_contracts_count,
  materialized_at
)
SELECT
  o.organization_id,
  o.commercial_party_id,
  o.hubspot_company_id,
  o.organization_name,
  o.lifecycle_stage,
  o.lifecycle_stage_since,
  o.lifecycle_stage_source,
  o.lifecycle_stage_by,
  COALESCE(hr.first_seen_at, o.created_at, NOW()) AS first_seen_at,
  lh.history_id,
  COALESCE(lh.transitioned_at, o.lifecycle_stage_since, o.created_at, NOW()) AS latest_transition_at,
  lh.transition_source,
  lh.transitioned_by,
  lh.latest_reason,
  hr.prospect_at,
  hr.opportunity_at,
  hr.active_client_at,
  hr.inactive_at,
  hr.churned_at,
  hr.provider_only_at,
  hr.disqualified_at,
  COALESCE(hr.total_transitions, 0),
  COALESCE(cr.unresolved_conflicts_count, 0),
  cr.last_conflict_at,
  cr.last_conflict_type,
  qs.last_quote_at,
  COALESCE(qs.active_quotes_count, 0),
  cs.last_contract_at,
  COALESCE(cs.active_contracts_count, 0),
  NOW()
FROM greenhouse_core.organizations o
LEFT JOIN history_rollup hr
  ON hr.organization_id = o.organization_id
LEFT JOIN latest_history lh
  ON lh.organization_id = o.organization_id
LEFT JOIN conflict_rollup cr
  ON cr.organization_id = o.organization_id
LEFT JOIN quote_summary qs
  ON qs.organization_id = o.organization_id
LEFT JOIN contract_summary cs
  ON cs.organization_id = o.organization_id
WHERE o.active = TRUE
ON CONFLICT (organization_id) DO UPDATE SET
  commercial_party_id = EXCLUDED.commercial_party_id,
  hubspot_company_id = EXCLUDED.hubspot_company_id,
  organization_name = EXCLUDED.organization_name,
  lifecycle_stage = EXCLUDED.lifecycle_stage,
  lifecycle_stage_since = EXCLUDED.lifecycle_stage_since,
  lifecycle_stage_source = EXCLUDED.lifecycle_stage_source,
  lifecycle_stage_by = EXCLUDED.lifecycle_stage_by,
  first_seen_at = EXCLUDED.first_seen_at,
  latest_history_id = EXCLUDED.latest_history_id,
  latest_transition_at = EXCLUDED.latest_transition_at,
  latest_transition_source = EXCLUDED.latest_transition_source,
  latest_transition_by = EXCLUDED.latest_transition_by,
  latest_reason = EXCLUDED.latest_reason,
  prospect_at = EXCLUDED.prospect_at,
  opportunity_at = EXCLUDED.opportunity_at,
  active_client_at = EXCLUDED.active_client_at,
  inactive_at = EXCLUDED.inactive_at,
  churned_at = EXCLUDED.churned_at,
  provider_only_at = EXCLUDED.provider_only_at,
  disqualified_at = EXCLUDED.disqualified_at,
  total_transitions = EXCLUDED.total_transitions,
  unresolved_conflicts_count = EXCLUDED.unresolved_conflicts_count,
  last_conflict_at = EXCLUDED.last_conflict_at,
  last_conflict_type = EXCLUDED.last_conflict_type,
  last_quote_at = EXCLUDED.last_quote_at,
  active_quotes_count = EXCLUDED.active_quotes_count,
  last_contract_at = EXCLUDED.last_contract_at,
  active_contracts_count = EXCLUDED.active_contracts_count,
  materialized_at = NOW();

-- Down Migration

REVOKE ALL PRIVILEGES
  ON greenhouse_serving.party_lifecycle_snapshots
  FROM greenhouse_runtime, greenhouse_migrator, greenhouse_app;

DROP INDEX IF EXISTS greenhouse_serving.idx_party_lifecycle_snapshots_hubspot;
DROP INDEX IF EXISTS greenhouse_serving.idx_party_lifecycle_snapshots_conflicts;
DROP INDEX IF EXISTS greenhouse_serving.idx_party_lifecycle_snapshots_stage;
DROP INDEX IF EXISTS greenhouse_serving.idx_party_lifecycle_snapshots_party;

DROP TABLE IF EXISTS greenhouse_serving.party_lifecycle_snapshots;
