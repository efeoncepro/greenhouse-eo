-- Up Migration
-- TASK-540 Fase F: conflict trace table for Party Lifecycle outbound sync
-- (Greenhouse -> HubSpot companies). Mirrors the domain-specific pattern used
-- by product_sync_conflicts rather than assuming a non-existent global
-- greenhouse_sync.sync_conflicts table.

SET search_path = greenhouse_commercial, public;

CREATE TABLE IF NOT EXISTS greenhouse_commercial.party_sync_conflicts (
  conflict_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text
    REFERENCES greenhouse_core.organizations(organization_id) ON DELETE SET NULL,
  commercial_party_id text,
  hubspot_company_id text,
  conflict_type text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT NOW(),
  conflicting_fields jsonb,
  resolution_status text NOT NULL DEFAULT 'pending',
  resolution_applied_at timestamptz,
  resolved_by text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT party_sync_conflicts_type_valid
    CHECK (conflict_type IN (
      'field_authority',
      'anti_ping_pong',
      'operator_override_hold'
    )),
  CONSTRAINT party_sync_conflicts_resolution_valid
    CHECK (resolution_status IN (
      'pending',
      'resolved_greenhouse_wins',
      'resolved_hubspot_wins',
      'ignored'
    )),
  CONSTRAINT party_sync_conflicts_resolution_consistent
    CHECK (
      (resolution_status = 'pending' AND resolution_applied_at IS NULL AND resolved_by IS NULL)
      OR (resolution_status <> 'pending' AND resolution_applied_at IS NOT NULL)
    ),
  CONSTRAINT party_sync_conflicts_anchor_present
    CHECK (
      organization_id IS NOT NULL
      OR commercial_party_id IS NOT NULL
      OR hubspot_company_id IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_party_sync_conflicts_unresolved
  ON greenhouse_commercial.party_sync_conflicts (detected_at DESC)
  WHERE resolution_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_party_sync_conflicts_organization
  ON greenhouse_commercial.party_sync_conflicts (organization_id, conflict_type)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_party_sync_conflicts_hubspot
  ON greenhouse_commercial.party_sync_conflicts (hubspot_company_id, conflict_type)
  WHERE hubspot_company_id IS NOT NULL;

COMMENT ON TABLE greenhouse_commercial.party_sync_conflicts IS
  'Conflict trace for Party Lifecycle outbound sync (Greenhouse -> HubSpot companies). Populated by TASK-540 bridge when field authority, anti-ping-pong or operator override block an outbound write.';

GRANT SELECT, INSERT, UPDATE
  ON greenhouse_commercial.party_sync_conflicts
  TO greenhouse_runtime;

-- Down Migration

SET search_path = greenhouse_commercial, public;

DROP INDEX IF EXISTS greenhouse_commercial.idx_party_sync_conflicts_hubspot;
DROP INDEX IF EXISTS greenhouse_commercial.idx_party_sync_conflicts_organization;
DROP INDEX IF EXISTS greenhouse_commercial.idx_party_sync_conflicts_unresolved;

DROP TABLE IF EXISTS greenhouse_commercial.party_sync_conflicts;
