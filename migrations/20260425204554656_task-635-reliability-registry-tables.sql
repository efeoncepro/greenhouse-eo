-- Up Migration
--
-- TASK-635: Reliability Registry DB persistence + tenant overrides.
--
-- Migra el registry de TASK-600 desde código estático a un híbrido DB-backed:
--   greenhouse_core.reliability_module_registry  → defaults (módulo, label,
--     filesOwned, smokeTests, expectedSignalKinds, sloThresholds, ...). Seed
--     idempotente desde código vía boot script `ensureReliabilityRegistrySeed`.
--   greenhouse_core.reliability_module_overrides → diffs per-tenant (hidden,
--     extraSignalKinds, sloOverrides). UNIQUE (space_id, module_key).
--
-- El reader DB-aware lee defaults + overlays overrides. Cuando overrides está
-- vacío, comportamiento idéntico al registry estático actual.

CREATE TABLE IF NOT EXISTS greenhouse_core.reliability_module_registry (
  module_key             TEXT PRIMARY KEY,
  label                  TEXT NOT NULL,
  description            TEXT NOT NULL,
  domain                 TEXT NOT NULL,
  routes                 JSONB NOT NULL DEFAULT '[]'::jsonb,
  apis                   JSONB NOT NULL DEFAULT '[]'::jsonb,
  dependencies           JSONB NOT NULL DEFAULT '[]'::jsonb,
  smoke_tests            JSONB NOT NULL DEFAULT '[]'::jsonb,
  files_owned            JSONB NOT NULL DEFAULT '[]'::jsonb,
  expected_signal_kinds  JSONB NOT NULL DEFAULT '[]'::jsonb,
  slo_thresholds         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE greenhouse_core.reliability_module_registry OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.reliability_module_registry TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.reliability_module_registry TO greenhouse_migrator;

CREATE TABLE IF NOT EXISTS greenhouse_core.reliability_module_overrides (
  override_id          TEXT PRIMARY KEY,
  space_id             TEXT NOT NULL REFERENCES greenhouse_core.spaces(space_id) ON DELETE CASCADE,
  module_key           TEXT NOT NULL REFERENCES greenhouse_core.reliability_module_registry(module_key) ON DELETE CASCADE,
  hidden               BOOLEAN NOT NULL DEFAULT FALSE,
  extra_signal_kinds   JSONB NOT NULL DEFAULT '[]'::jsonb,
  slo_overrides        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (space_id, module_key)
);

ALTER TABLE greenhouse_core.reliability_module_overrides OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.reliability_module_overrides TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.reliability_module_overrides TO greenhouse_migrator;

CREATE INDEX IF NOT EXISTS idx_reliability_module_overrides_space
  ON greenhouse_core.reliability_module_overrides (space_id);

COMMENT ON TABLE greenhouse_core.reliability_module_registry IS
  'TASK-635: defaults canónicos del Reliability Registry. Seed idempotente desde código (STATIC_RELIABILITY_REGISTRY).';

COMMENT ON TABLE greenhouse_core.reliability_module_overrides IS
  'TASK-635: overrides per-tenant aplicados sobre defaults. UNIQUE(space_id, module_key).';

-- Down Migration

DROP INDEX IF EXISTS greenhouse_core.idx_reliability_module_overrides_space;
DROP TABLE IF EXISTS greenhouse_core.reliability_module_overrides;
DROP TABLE IF EXISTS greenhouse_core.reliability_module_registry;