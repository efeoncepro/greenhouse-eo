-- Up Migration
-- TASK-535 Fase A: idempotent backfill of lifecycle_stage for every existing
-- organization, plus a bootstrap row in organization_lifecycle_history.
--
-- Spec §10.1 assumed `organizations.client_id` and `organizations.is_provider`
-- columns that do not exist in the current schema. The real relationships are:
--   - organizations ↔ clients: matched via shared hubspot_company_id or via
--     greenhouse_finance.client_profiles.organization_id bridge.
--   - active contracts: greenhouse_commercial.contracts (status, end_date,
--     organization_id) — TASK-460.
--   - recent invoicing: greenhouse_finance.income (organization_id, invoice_date).
--
-- Organizations with no backing client row default to `prospect`. Providers
-- are not detectable from organizations in the current schema (follow-up); any
-- org with no client FK and no contracts/income falls into `prospect`.
--
-- Idempotence: only rows with lifecycle_stage_source='bootstrap' and no history
-- entry yet are touched, so a second run is a no-op.

SET search_path = greenhouse_core, greenhouse_commercial, greenhouse_finance, public;

WITH org_snapshot AS (
  SELECT
    o.organization_id,
    o.commercial_party_id,
    EXISTS (
      SELECT 1
      FROM greenhouse_finance.client_profiles cp
      WHERE cp.organization_id = o.organization_id
    ) OR EXISTS (
      SELECT 1
      FROM greenhouse_core.clients c
      WHERE c.hubspot_company_id IS NOT NULL
        AND c.hubspot_company_id = o.hubspot_company_id
    ) AS has_client_link,
    EXISTS (
      SELECT 1
      FROM greenhouse_commercial.contracts k
      WHERE k.organization_id = o.organization_id
        AND k.status = 'active'
        AND (k.end_date IS NULL OR k.end_date > CURRENT_DATE)
    ) AS has_active_contract,
    EXISTS (
      SELECT 1
      FROM greenhouse_finance.income i
      WHERE i.organization_id = o.organization_id
        AND i.invoice_date > (CURRENT_DATE - INTERVAL '6 months')
    ) AS has_recent_income
  FROM greenhouse_core.organizations o
  WHERE o.lifecycle_stage_source = 'bootstrap'
    AND NOT EXISTS (
      SELECT 1
      FROM greenhouse_core.organization_lifecycle_history h
      WHERE h.organization_id = o.organization_id
    )
),
org_classified AS (
  SELECT
    organization_id,
    commercial_party_id,
    CASE
      WHEN has_client_link AND has_active_contract THEN 'active_client'
      WHEN has_client_link AND NOT has_recent_income THEN 'inactive'
      WHEN has_client_link THEN 'active_client'
      ELSE 'prospect'
    END AS to_stage
  FROM org_snapshot
),
org_updated AS (
  UPDATE greenhouse_core.organizations AS o
  SET lifecycle_stage = oc.to_stage,
      lifecycle_stage_since = NOW(),
      lifecycle_stage_source = 'bootstrap',
      lifecycle_stage_by = 'system'
  FROM org_classified oc
  WHERE o.organization_id = oc.organization_id
    AND o.lifecycle_stage_source = 'bootstrap'
  RETURNING o.organization_id, o.commercial_party_id, o.lifecycle_stage
)
INSERT INTO greenhouse_core.organization_lifecycle_history (
  organization_id,
  commercial_party_id,
  from_stage,
  to_stage,
  transition_source,
  transitioned_by,
  metadata
)
SELECT
  organization_id,
  commercial_party_id,
  NULL AS from_stage,
  lifecycle_stage AS to_stage,
  'bootstrap' AS transition_source,
  'system' AS transitioned_by,
  jsonb_build_object('backfill_task', 'TASK-535')
FROM org_updated
ON CONFLICT DO NOTHING;

-- Sanity guard: fail the migration if any organization was left without a
-- history row. Belt-and-suspenders — the CTE above should cover every row.
DO $$
DECLARE
  orphan_count integer;
BEGIN
  SELECT COUNT(*)
    INTO orphan_count
    FROM greenhouse_core.organizations o
    WHERE NOT EXISTS (
      SELECT 1
      FROM greenhouse_core.organization_lifecycle_history h
      WHERE h.organization_id = o.organization_id
    );

  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'TASK-535 backfill incomplete: % organizations without lifecycle history', orphan_count;
  END IF;
END $$;

-- Down Migration
-- Intentional no-op. The lifecycle_history table has an append-only trigger
-- installed by M1 that blocks DELETE at the DB level, and un-backfilling
-- lifecycle_stage back to the physical default would destroy transition data
-- without being able to reconstruct it. The only safe rollback is to also
-- roll back M1, which drops the table and columns entirely.
