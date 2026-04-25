-- Up Migration
-- TASK-535 Fase A: Party Lifecycle foundation on greenhouse_core.organizations.
-- Adds canonical lifecycle columns plus the immutable history table that acts as
-- the audit trail for every party lifecycle transition.

SET search_path = greenhouse_core, public;

-- ── organizations: canonical lifecycle columns ──────────────────────────────

ALTER TABLE greenhouse_core.organizations
  ADD COLUMN IF NOT EXISTS lifecycle_stage text NOT NULL DEFAULT 'prospect',
  ADD COLUMN IF NOT EXISTS lifecycle_stage_since timestamptz NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS lifecycle_stage_source text NOT NULL DEFAULT 'bootstrap',
  ADD COLUMN IF NOT EXISTS lifecycle_stage_by text,
  ADD COLUMN IF NOT EXISTS is_dual_role boolean NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS commercial_party_id uuid NOT NULL DEFAULT gen_random_uuid();

-- Stage domain. Kept wide enough to cover the full lifecycle spec (§4.2).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_lifecycle_stage_valid'
  ) THEN
    ALTER TABLE greenhouse_core.organizations
      ADD CONSTRAINT organizations_lifecycle_stage_valid
      CHECK (lifecycle_stage IN (
        'prospect',
        'opportunity',
        'active_client',
        'inactive',
        'churned',
        'provider_only',
        'disqualified'
      ));
  END IF;
END $$;

-- Source domain — every transition must declare which side effect wrote it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_lifecycle_stage_source_valid'
  ) THEN
    ALTER TABLE greenhouse_core.organizations
      ADD CONSTRAINT organizations_lifecycle_stage_source_valid
      CHECK (lifecycle_stage_source IN (
        'bootstrap',
        'hubspot_sync',
        'manual',
        'auto_sweep',
        'quote_converted',
        'deal_won',
        'contract_created',
        'deal_lost_sweep',
        'inactivity_sweep',
        'operator_override'
      ));
  END IF;
END $$;

-- commercial_party_id must be unique — it is the stable public identifier used
-- in outbox events and cross-module projections, independent of organization_id.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_commercial_party_id_unique'
  ) THEN
    ALTER TABLE greenhouse_core.organizations
      ADD CONSTRAINT organizations_commercial_party_id_unique UNIQUE (commercial_party_id);
  END IF;
END $$;

-- Active-funnel index: we almost never filter by churned / disqualified /
-- provider_only in portal surfaces, so exclude them from the hot index.
CREATE INDEX IF NOT EXISTS idx_organizations_lifecycle_stage_active
  ON greenhouse_core.organizations (lifecycle_stage)
  WHERE lifecycle_stage NOT IN ('churned', 'disqualified', 'provider_only');

COMMENT ON COLUMN greenhouse_core.organizations.lifecycle_stage IS
  'Canonical party lifecycle stage — source of truth for commercial state. See GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1 §4.';
COMMENT ON COLUMN greenhouse_core.organizations.lifecycle_stage_source IS
  'Which command/pipeline drove the most recent transition (bootstrap, hubspot_sync, manual, …).';
COMMENT ON COLUMN greenhouse_core.organizations.commercial_party_id IS
  'Stable surfaceable identifier for the party — used in outbox events and cross-module projections.';
COMMENT ON COLUMN greenhouse_core.organizations.is_dual_role IS
  'Marks the rare organization that is simultaneously a commercial target and a provider (§4.2 invariant 7).';

-- ── organization_lifecycle_history: append-only audit trail ─────────────────

CREATE TABLE IF NOT EXISTS greenhouse_core.organization_lifecycle_history (
  history_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL
    REFERENCES greenhouse_core.organizations(organization_id) ON DELETE RESTRICT,
  commercial_party_id uuid NOT NULL,
  from_stage text,
  to_stage text NOT NULL,
  transitioned_at timestamptz NOT NULL DEFAULT NOW(),
  transition_source text NOT NULL,
  transitioned_by text,
  trigger_entity_type text,
  trigger_entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT organization_lifecycle_history_no_self_transition
    CHECK (to_stage IS DISTINCT FROM from_stage),
  CONSTRAINT organization_lifecycle_history_to_stage_valid
    CHECK (to_stage IN (
      'prospect', 'opportunity', 'active_client', 'inactive',
      'churned', 'provider_only', 'disqualified'
    )),
  CONSTRAINT organization_lifecycle_history_from_stage_valid
    CHECK (from_stage IS NULL OR from_stage IN (
      'prospect', 'opportunity', 'active_client', 'inactive',
      'churned', 'provider_only', 'disqualified'
    )),
  CONSTRAINT organization_lifecycle_history_source_valid
    CHECK (transition_source IN (
      'bootstrap', 'hubspot_sync', 'manual', 'auto_sweep',
      'quote_converted', 'deal_won', 'contract_created',
      'deal_lost_sweep', 'inactivity_sweep', 'operator_override'
    )),
  CONSTRAINT organization_lifecycle_history_trigger_entity_valid
    CHECK (
      trigger_entity_type IS NULL OR trigger_entity_type IN ('deal', 'quote', 'contract', 'manual')
    )
);

CREATE INDEX IF NOT EXISTS idx_org_lifecycle_history_org
  ON greenhouse_core.organization_lifecycle_history (organization_id, transitioned_at DESC);

CREATE INDEX IF NOT EXISTS idx_org_lifecycle_history_party
  ON greenhouse_core.organization_lifecycle_history (commercial_party_id, transitioned_at DESC);

CREATE INDEX IF NOT EXISTS idx_org_lifecycle_history_trigger
  ON greenhouse_core.organization_lifecycle_history (trigger_entity_type, trigger_entity_id)
  WHERE trigger_entity_id IS NOT NULL;

COMMENT ON TABLE greenhouse_core.organization_lifecycle_history IS
  'Append-only audit trail of every party lifecycle transition. No UPDATE/DELETE allowed. Source of truth for the commercial history surface.';

-- ── Block mutations on history rows ─────────────────────────────────────────
-- Defense in depth: application layer must be the only writer.

CREATE OR REPLACE FUNCTION greenhouse_core.organization_lifecycle_history_block_mutation()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'organization_lifecycle_history is append-only; % is not permitted', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS organization_lifecycle_history_no_update
  ON greenhouse_core.organization_lifecycle_history;

CREATE TRIGGER organization_lifecycle_history_no_update
  BEFORE UPDATE ON greenhouse_core.organization_lifecycle_history
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_core.organization_lifecycle_history_block_mutation();

DROP TRIGGER IF EXISTS organization_lifecycle_history_no_delete
  ON greenhouse_core.organization_lifecycle_history;

CREATE TRIGGER organization_lifecycle_history_no_delete
  BEFORE DELETE ON greenhouse_core.organization_lifecycle_history
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_core.organization_lifecycle_history_block_mutation();

-- ── Runtime grants ──────────────────────────────────────────────────────────

GRANT SELECT, INSERT
  ON greenhouse_core.organization_lifecycle_history
  TO greenhouse_runtime;

-- Runtime already has SELECT/UPDATE on organizations; no new grants needed.

-- Down Migration

SET search_path = greenhouse_core, public;

DROP TRIGGER IF EXISTS organization_lifecycle_history_no_delete
  ON greenhouse_core.organization_lifecycle_history;

DROP TRIGGER IF EXISTS organization_lifecycle_history_no_update
  ON greenhouse_core.organization_lifecycle_history;

DROP FUNCTION IF EXISTS greenhouse_core.organization_lifecycle_history_block_mutation();

DROP INDEX IF EXISTS greenhouse_core.idx_org_lifecycle_history_trigger;
DROP INDEX IF EXISTS greenhouse_core.idx_org_lifecycle_history_party;
DROP INDEX IF EXISTS greenhouse_core.idx_org_lifecycle_history_org;

DROP TABLE IF EXISTS greenhouse_core.organization_lifecycle_history;

DROP INDEX IF EXISTS greenhouse_core.idx_organizations_lifecycle_stage_active;

ALTER TABLE greenhouse_core.organizations
  DROP CONSTRAINT IF EXISTS organizations_commercial_party_id_unique,
  DROP CONSTRAINT IF EXISTS organizations_lifecycle_stage_source_valid,
  DROP CONSTRAINT IF EXISTS organizations_lifecycle_stage_valid;

ALTER TABLE greenhouse_core.organizations
  DROP COLUMN IF EXISTS commercial_party_id,
  DROP COLUMN IF EXISTS is_dual_role,
  DROP COLUMN IF EXISTS lifecycle_stage_by,
  DROP COLUMN IF EXISTS lifecycle_stage_source,
  DROP COLUMN IF EXISTS lifecycle_stage_since,
  DROP COLUMN IF EXISTS lifecycle_stage;
