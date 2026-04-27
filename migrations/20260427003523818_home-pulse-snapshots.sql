-- Up Migration

-- TASK-696 Smart Home v2 — pre-computed Pulse Strip snapshots
-- Cron `/api/cron/precompute-home-pulse` runs every 5 min and upserts here.
-- Read-time uses lookup O(1) by (audience_key, role_code, tenant_scope) when ttl_ends_at > now().

CREATE TABLE IF NOT EXISTS greenhouse_serving.home_pulse_snapshots (
  audience_key    TEXT NOT NULL,
  role_code       TEXT NOT NULL DEFAULT '__default__',
  tenant_scope    TEXT NOT NULL DEFAULT '__all__',
  snapshot_jsonb  JSONB NOT NULL,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ttl_ends_at     TIMESTAMPTZ NOT NULL,
  source_version  TEXT NOT NULL DEFAULT 'home-pulse.v1',
  PRIMARY KEY (audience_key, role_code, tenant_scope)
);

CREATE INDEX IF NOT EXISTS home_pulse_snapshots_ttl_idx
  ON greenhouse_serving.home_pulse_snapshots (ttl_ends_at);

CREATE INDEX IF NOT EXISTS home_pulse_snapshots_computed_at_idx
  ON greenhouse_serving.home_pulse_snapshots (computed_at DESC);

COMMENT ON TABLE  greenhouse_serving.home_pulse_snapshots IS 'TASK-696 Smart Home v2 — pre-computed Pulse Strip per audience+role+tenant. Refreshed every 5 min by cron.';
COMMENT ON COLUMN greenhouse_serving.home_pulse_snapshots.audience_key   IS 'AudienceKey from buildHomeEntitlementsContext (admin|internal|client|hr|finance|delivery|collaborator).';
COMMENT ON COLUMN greenhouse_serving.home_pulse_snapshots.role_code      IS 'role code or __default__ for audience-level snapshot.';
COMMENT ON COLUMN greenhouse_serving.home_pulse_snapshots.tenant_scope   IS 'tenant_id when tenant-scoped, __all__ for cross-tenant. NEVER allow leak across tenants.';
COMMENT ON COLUMN greenhouse_serving.home_pulse_snapshots.snapshot_jsonb IS 'JSONB matching HomePulseStripData from contract.ts. Includes 4-6 KPI cards with sparkline series + delta + status.';
COMMENT ON COLUMN greenhouse_serving.home_pulse_snapshots.ttl_ends_at    IS 'Wall-clock expiry. Read-time skips snapshot if expired.';

ALTER TABLE greenhouse_serving.home_pulse_snapshots OWNER TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.home_pulse_snapshots TO greenhouse_runtime;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_serving.home_pulse_snapshots_computed_at_idx;
DROP INDEX IF EXISTS greenhouse_serving.home_pulse_snapshots_ttl_idx;
DROP TABLE IF EXISTS greenhouse_serving.home_pulse_snapshots;
