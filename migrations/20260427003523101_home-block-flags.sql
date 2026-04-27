-- Up Migration

-- TASK-696 Smart Home v2 — block-level kill switches
-- Per-block feature flags scoped global / tenant / role / user.
-- Read-time precedence: user > role > tenant > global. Default enabled when no row.

CREATE TABLE IF NOT EXISTS greenhouse_serving.home_block_flags (
  id              BIGSERIAL PRIMARY KEY,
  block_id        TEXT NOT NULL,
  scope_type      TEXT NOT NULL,
  scope_id        TEXT NULL,
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  reason          TEXT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT home_block_flags_scope_check CHECK (scope_type IN ('global','tenant','role','user')),
  CONSTRAINT home_block_flags_scope_id_required CHECK (
    (scope_type = 'global' AND scope_id IS NULL)
    OR (scope_type <> 'global' AND scope_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS home_block_flags_block_scope_idx
  ON greenhouse_serving.home_block_flags (block_id, scope_type, COALESCE(scope_id, ''));

CREATE INDEX IF NOT EXISTS home_block_flags_lookup_idx
  ON greenhouse_serving.home_block_flags (block_id, scope_type);

COMMENT ON TABLE  greenhouse_serving.home_block_flags IS 'TASK-696 Smart Home v2 — kill switches per block. Scope precedence user>role>tenant>global.';
COMMENT ON COLUMN greenhouse_serving.home_block_flags.block_id    IS 'HomeBlockId from src/lib/home/contract.ts (e.g. hero-ai, pulse-strip, today-inbox).';
COMMENT ON COLUMN greenhouse_serving.home_block_flags.scope_type  IS 'global | tenant | role | user';
COMMENT ON COLUMN greenhouse_serving.home_block_flags.scope_id    IS 'tenant_id | role_code | user_id; NULL when scope_type=global';
COMMENT ON COLUMN greenhouse_serving.home_block_flags.enabled     IS 'TRUE renders the block; FALSE hides it. Default behavior when no row matches: enabled.';

ALTER TABLE greenhouse_serving.home_block_flags OWNER TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.home_block_flags TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_serving.home_block_flags_id_seq TO greenhouse_runtime;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_serving.home_block_flags_lookup_idx;
DROP INDEX IF EXISTS greenhouse_serving.home_block_flags_block_scope_idx;
DROP TABLE IF EXISTS greenhouse_serving.home_block_flags;
