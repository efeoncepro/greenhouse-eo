-- Up Migration

-- TASK-696 Smart Home v2 — Continúa Con rail
-- Per-user, per-entity-kind. Tracked by middleware on route hits.

CREATE TABLE IF NOT EXISTS greenhouse_serving.user_recent_items (
  id              BIGSERIAL PRIMARY KEY,
  user_id         TEXT NOT NULL,
  entity_kind     TEXT NOT NULL,
  entity_id       TEXT NOT NULL,
  tenant_id       TEXT NULL,
  view_code       TEXT NULL,
  title           TEXT NULL,
  href            TEXT NULL,
  snapshot_jsonb  JSONB NULL,
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  visit_count     INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_recent_items_unique_per_user_entity UNIQUE (user_id, entity_kind, entity_id)
);

CREATE INDEX IF NOT EXISTS user_recent_items_user_lastseen_idx
  ON greenhouse_serving.user_recent_items (user_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS user_recent_items_tenant_idx
  ON greenhouse_serving.user_recent_items (tenant_id) WHERE tenant_id IS NOT NULL;

COMMENT ON TABLE  greenhouse_serving.user_recent_items IS 'TASK-696 Smart Home v2 — Continúa Con rail. Tracks last entities each user touched.';
COMMENT ON COLUMN greenhouse_serving.user_recent_items.entity_kind  IS 'project | quote | client | invoice | payroll_period | view | report | task | space';
COMMENT ON COLUMN greenhouse_serving.user_recent_items.tenant_id    IS 'tenant_id snapshot at time of visit; null for global views. Used for tenant isolation.';
COMMENT ON COLUMN greenhouse_serving.user_recent_items.view_code    IS 'VIEW_REGISTRY view_code if applicable.';
COMMENT ON COLUMN greenhouse_serving.user_recent_items.snapshot_jsonb IS 'Optional cached display snapshot (status, last activity ts, badge, etc.) so the rail renders without re-querying entity tables.';

ALTER TABLE greenhouse_serving.user_recent_items OWNER TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.user_recent_items TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_serving.user_recent_items_id_seq TO greenhouse_runtime;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_serving.user_recent_items_tenant_idx;
DROP INDEX IF EXISTS greenhouse_serving.user_recent_items_user_lastseen_idx;
DROP TABLE IF EXISTS greenhouse_serving.user_recent_items;
