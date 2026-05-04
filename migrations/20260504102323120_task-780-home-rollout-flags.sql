-- Up Migration

-- TASK-780 — Smart Home rollout flags table.
-- Governs which shell variant (legacy / v2) renders, with scope precedence
-- user > role > tenant > global. Mirrors the shape of home_block_flags but
-- separates concerns: this table governs SHELL variants, not per-block kill
-- switches. Rollback in seconds via UPDATE without redeploy.

CREATE TABLE IF NOT EXISTS greenhouse_serving.home_rollout_flags (
  id              BIGSERIAL PRIMARY KEY,
  flag_key        TEXT NOT NULL,
  scope_type      TEXT NOT NULL,
  scope_id        TEXT NULL,
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  reason          TEXT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT home_rollout_flags_scope_check CHECK (scope_type IN ('global','tenant','role','user')),
  CONSTRAINT home_rollout_flags_scope_id_required CHECK (
    (scope_type = 'global' AND scope_id IS NULL)
    OR (scope_type <> 'global' AND scope_id IS NOT NULL)
  ),
  CONSTRAINT home_rollout_flags_key_check CHECK (flag_key IN ('home_v2_shell'))
);

CREATE UNIQUE INDEX IF NOT EXISTS home_rollout_flags_key_scope_idx
  ON greenhouse_serving.home_rollout_flags (flag_key, scope_type, COALESCE(scope_id, ''));

CREATE INDEX IF NOT EXISTS home_rollout_flags_lookup_idx
  ON greenhouse_serving.home_rollout_flags (flag_key, scope_type);

COMMENT ON TABLE  greenhouse_serving.home_rollout_flags IS 'TASK-780 Smart Home rollout — shell variant flags. Scope precedence user>role>tenant>global. Replaces HOME_V2_ENABLED env var.';
COMMENT ON COLUMN greenhouse_serving.home_rollout_flags.flag_key   IS 'Stable identifier of the rollout flag. Today: home_v2_shell. Future shell variants extend the CHECK constraint.';
COMMENT ON COLUMN greenhouse_serving.home_rollout_flags.scope_type IS 'global | tenant | role | user';
COMMENT ON COLUMN greenhouse_serving.home_rollout_flags.scope_id   IS 'tenant_id | role_code | user_id; NULL when scope_type=global';
COMMENT ON COLUMN greenhouse_serving.home_rollout_flags.enabled    IS 'TRUE → variant active for matching subjects. FALSE → variant disabled.';
COMMENT ON COLUMN greenhouse_serving.home_rollout_flags.reason     IS 'Free-text audit note: why this row exists. Required by ops practice.';

-- Audit trigger: keep updated_at fresh on every UPDATE.
CREATE OR REPLACE FUNCTION greenhouse_serving.home_rollout_flags_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS home_rollout_flags_set_updated_at_trigger
  ON greenhouse_serving.home_rollout_flags;

CREATE TRIGGER home_rollout_flags_set_updated_at_trigger
  BEFORE UPDATE ON greenhouse_serving.home_rollout_flags
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_serving.home_rollout_flags_set_updated_at();

ALTER TABLE greenhouse_serving.home_rollout_flags OWNER TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.home_rollout_flags TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_serving.home_rollout_flags_id_seq TO greenhouse_runtime;

-- Seed: home_v2_shell enabled globally. Idempotent — re-runs of the seed
-- preserve operator overrides (UPSERT on conflict updates `reason`/`updated_at`
-- only, not `enabled`).
INSERT INTO greenhouse_serving.home_rollout_flags (flag_key, scope_type, scope_id, enabled, reason)
VALUES (
  'home_v2_shell',
  'global',
  NULL,
  TRUE,
  'TASK-780 cutover — replaces HOME_V2_ENABLED env var. Per-user opt-out preserved via client_users.home_v2_opt_out.'
)
ON CONFLICT (flag_key, scope_type, COALESCE(scope_id, ''))
DO UPDATE SET
  reason     = EXCLUDED.reason,
  updated_at = NOW();

-- Down Migration

DROP TRIGGER IF EXISTS home_rollout_flags_set_updated_at_trigger
  ON greenhouse_serving.home_rollout_flags;
DROP FUNCTION IF EXISTS greenhouse_serving.home_rollout_flags_set_updated_at();
DROP INDEX  IF EXISTS greenhouse_serving.home_rollout_flags_lookup_idx;
DROP INDEX  IF EXISTS greenhouse_serving.home_rollout_flags_key_scope_idx;
DROP TABLE  IF EXISTS greenhouse_serving.home_rollout_flags;
