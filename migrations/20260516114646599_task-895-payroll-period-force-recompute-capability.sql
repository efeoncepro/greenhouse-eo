-- Up Migration

-- TASK-893 V1.1 / TASK-895 — Capability canonical `payroll.period.force_recompute`
-- + audit log append-only `member_payroll_force_recompute_audit_log`.
--
-- Capability granular escape hatch para cuando los guards canonicos TASK-893
-- (BL-2 single-member, BL-5 reopened) bloquean recompute legitimo bajo flag
-- PAYROLL_PARTICIPATION_WINDOW_ENABLED=true. EFEONCE_ADMIN + FINANCE_ADMIN.
-- Reason >= 20 chars persistido en audit row append-only.
--
-- Pattern fuente: TASK-785 + TASK-873 (audit log) + TASK-891 (capability seed).
-- Spec: TASK-893 ADR `GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md`.

-- ============================================================================
-- 1. Capability registry seed
-- ============================================================================

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'payroll.period.force_recompute',
    'hr',
    ARRAY['execute'],
    ARRAY['tenant'],
    'TASK-893 V1.1 — Force recompute payroll cuando los guards canonicos (BL-2 single-member, BL-5 reopened) lo bloquean. Operator escape hatch con reason >= 20 chars + audit row append-only. EFEONCE_ADMIN + FINANCE_ADMIN solo.',
    NOW(),
    NULL
  )
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- ============================================================================
-- 2. Audit log append-only `member_payroll_force_recompute_audit_log`
-- ============================================================================

CREATE TABLE IF NOT EXISTS greenhouse_core.member_payroll_force_recompute_audit_log (
  audit_id              TEXT PRIMARY KEY,
  target_kind           TEXT NOT NULL,
  target_period_id      TEXT,
  target_entry_id       TEXT,
  target_member_id      TEXT,
  actor_user_id         TEXT NOT NULL,
  actor_email           TEXT,
  reason                TEXT NOT NULL,
  flag_state_snapshot   JSONB NOT NULL DEFAULT '{}'::jsonb,
  effective_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address            TEXT,
  user_agent            TEXT,
  metadata_json         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT member_payroll_force_recompute_audit_target_kind_check
    CHECK (target_kind IN ('period', 'entry')),
  CONSTRAINT member_payroll_force_recompute_audit_reason_min_chars
    CHECK (char_length(trim(reason)) >= 20),
  CONSTRAINT member_payroll_force_recompute_audit_target_required
    CHECK (
      (target_kind = 'period' AND target_period_id IS NOT NULL)
      OR (target_kind = 'entry' AND target_entry_id IS NOT NULL AND target_member_id IS NOT NULL)
    ),
  CONSTRAINT member_payroll_force_recompute_audit_flag_snapshot_object
    CHECK (jsonb_typeof(flag_state_snapshot) = 'object'),
  CONSTRAINT member_payroll_force_recompute_audit_metadata_object
    CHECK (jsonb_typeof(metadata_json) = 'object')
);

CREATE INDEX IF NOT EXISTS member_payroll_force_recompute_audit_period_idx
  ON greenhouse_core.member_payroll_force_recompute_audit_log (target_period_id, created_at DESC)
  WHERE target_period_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS member_payroll_force_recompute_audit_entry_idx
  ON greenhouse_core.member_payroll_force_recompute_audit_log (target_entry_id, created_at DESC)
  WHERE target_entry_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS member_payroll_force_recompute_audit_actor_idx
  ON greenhouse_core.member_payroll_force_recompute_audit_log (actor_user_id, created_at DESC);

COMMENT ON TABLE greenhouse_core.member_payroll_force_recompute_audit_log IS
  'TASK-893 V1.1 / TASK-895 — Append-only audit log para force_recompute de payroll bajo flag PAYROLL_PARTICIPATION_WINDOW_ENABLED. Reason >= 20 chars enforced en CHECK. Pattern fuente TASK-785 + TASK-873.';

CREATE OR REPLACE FUNCTION greenhouse_core.assert_payroll_force_recompute_audit_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'member_payroll_force_recompute_audit_log es append-only. Para correcciones, insertar nueva fila con metadata_json.correction_of=<audit_id>.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS member_payroll_force_recompute_audit_no_update_trigger
  ON greenhouse_core.member_payroll_force_recompute_audit_log;
DROP TRIGGER IF EXISTS member_payroll_force_recompute_audit_no_delete_trigger
  ON greenhouse_core.member_payroll_force_recompute_audit_log;

CREATE TRIGGER member_payroll_force_recompute_audit_no_update_trigger
  BEFORE UPDATE ON greenhouse_core.member_payroll_force_recompute_audit_log
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.assert_payroll_force_recompute_audit_append_only();

CREATE TRIGGER member_payroll_force_recompute_audit_no_delete_trigger
  BEFORE DELETE ON greenhouse_core.member_payroll_force_recompute_audit_log
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.assert_payroll_force_recompute_audit_append_only();

ALTER TABLE greenhouse_core.member_payroll_force_recompute_audit_log OWNER TO greenhouse_ops;
GRANT SELECT, INSERT ON greenhouse_core.member_payroll_force_recompute_audit_log TO greenhouse_runtime;

-- ============================================================================
-- 3. Anti pre-up-marker bug guard
-- ============================================================================

DO $$
DECLARE
  registered_count INTEGER;
  table_exists BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO registered_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key = 'payroll.period.force_recompute';

  IF registered_count <> 1 THEN
    RAISE EXCEPTION 'TASK-895 anti pre-up-marker check: expected 1 capabilities_registry row for payroll.period.force_recompute, got %', registered_count;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_core'
      AND table_name = 'member_payroll_force_recompute_audit_log'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-895 anti pre-up-marker check: member_payroll_force_recompute_audit_log table was NOT created. Migration markers may be inverted.';
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'payroll.period.force_recompute'
  AND deprecated_at IS NULL;

DROP TABLE IF EXISTS greenhouse_core.member_payroll_force_recompute_audit_log;
DROP FUNCTION IF EXISTS greenhouse_core.assert_payroll_force_recompute_audit_append_only();
