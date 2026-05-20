-- Up Migration

-- TASK-894 — International internal contract type.
--
-- Safety posture:
-- - Do not backfill production members automatically.
-- - Widen existing enum-like CHECK constraints first.
-- - Add the members tuple invariant as VALID because live preflight found zero
--   invalid member tuples.
-- - Add the compensation_versions tuple invariant as NOT VALID because live
--   preflight found six legacy rows with `indefinido/international`; PostgreSQL
--   will still enforce the invariant for new/updated rows without rewriting
--   history.

-- ============================================================================
-- 1. Contract taxonomy CHECK constraints
-- ============================================================================

ALTER TABLE greenhouse_core.members
  DROP CONSTRAINT IF EXISTS members_contract_type_check;

ALTER TABLE greenhouse_core.members
  ADD CONSTRAINT members_contract_type_check
  CHECK (contract_type IN (
    'indefinido',
    'plazo_fijo',
    'honorarios',
    'contractor',
    'eor',
    'international_internal'
  ));

ALTER TABLE greenhouse_core.members
  DROP CONSTRAINT IF EXISTS members_contract_payroll_tuple_check;

ALTER TABLE greenhouse_core.members
  ADD CONSTRAINT members_contract_payroll_tuple_check
  CHECK (
    (
      contract_type IN ('indefinido', 'plazo_fijo', 'honorarios')
      AND pay_regime = 'chile'
      AND payroll_via = 'internal'
    )
    OR (
      contract_type IN ('contractor', 'eor')
      AND pay_regime = 'international'
      AND payroll_via = 'deel'
    )
    OR (
      contract_type = 'international_internal'
      AND pay_regime = 'international'
      AND payroll_via = 'internal'
    )
  );

ALTER TABLE greenhouse_payroll.compensation_versions
  ADD COLUMN IF NOT EXISTS metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE greenhouse_payroll.compensation_versions
  DROP CONSTRAINT IF EXISTS compensation_versions_contract_type_check;

ALTER TABLE greenhouse_payroll.compensation_versions
  ADD CONSTRAINT compensation_versions_contract_type_check
  CHECK (contract_type IN (
    'indefinido',
    'plazo_fijo',
    'honorarios',
    'contractor',
    'eor',
    'international_internal'
  ));

ALTER TABLE greenhouse_payroll.compensation_versions
  DROP CONSTRAINT IF EXISTS compensation_versions_contract_pay_regime_check;

ALTER TABLE greenhouse_payroll.compensation_versions
  ADD CONSTRAINT compensation_versions_contract_pay_regime_check
  CHECK (
    (
      contract_type IN ('indefinido', 'plazo_fijo', 'honorarios')
      AND pay_regime = 'chile'
    )
    OR (
      contract_type IN ('contractor', 'eor', 'international_internal')
      AND pay_regime = 'international'
    )
  ) NOT VALID;

ALTER TABLE greenhouse_payroll.payroll_entries
  DROP CONSTRAINT IF EXISTS payroll_entries_contract_type_snapshot_check;

ALTER TABLE greenhouse_payroll.payroll_entries
  ADD CONSTRAINT payroll_entries_contract_type_snapshot_check
  CHECK (
    contract_type_snapshot IS NULL
    OR contract_type_snapshot IN (
      'indefinido',
      'plazo_fijo',
      'honorarios',
      'contractor',
      'eor',
      'international_internal'
    )
  );

-- ============================================================================
-- 2. Capability registry seed
-- ============================================================================

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'payroll.contract.use_international_internal',
    'hr',
    ARRAY['create', 'update'],
    ARRAY['tenant'],
    'TASK-894 — Uso controlado del contract_type international_internal. EFEONCE_ADMIN only; requiere legalReviewReference >= 10 chars por write path.',
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
-- 3. Append-only audit log
-- ============================================================================

CREATE TABLE IF NOT EXISTS greenhouse_core.member_contract_type_audit_log (
  audit_id                 TEXT PRIMARY KEY,
  member_id                TEXT NOT NULL REFERENCES greenhouse_core.members(member_id) ON DELETE RESTRICT,
  actor_user_id            TEXT NOT NULL,
  actor_email              TEXT,
  source                   TEXT NOT NULL,
  reason                   TEXT,
  legal_review_reference   TEXT,
  previous_contract_type   TEXT,
  previous_pay_regime      TEXT,
  previous_payroll_via     TEXT,
  previous_deel_contract_id TEXT,
  new_contract_type        TEXT NOT NULL,
  new_pay_regime           TEXT NOT NULL,
  new_payroll_via          TEXT NOT NULL,
  new_deel_contract_id     TEXT,
  effective_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata_json            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT member_contract_type_audit_source_check
    CHECK (source IN ('payroll_compensation', 'workforce_intake')),
  CONSTRAINT member_contract_type_audit_legal_review_reference_check
    CHECK (
      new_contract_type <> 'international_internal'
      OR char_length(trim(COALESCE(legal_review_reference, ''))) >= 10
    ),
  CONSTRAINT member_contract_type_audit_metadata_object
    CHECK (jsonb_typeof(metadata_json) = 'object')
);

CREATE INDEX IF NOT EXISTS member_contract_type_audit_member_idx
  ON greenhouse_core.member_contract_type_audit_log (member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS member_contract_type_audit_actor_idx
  ON greenhouse_core.member_contract_type_audit_log (actor_user_id, created_at DESC);

COMMENT ON TABLE greenhouse_core.member_contract_type_audit_log IS
  'TASK-894 — Append-only audit log for member contract_type/pay_regime/payroll_via changes. legal_review_reference is persisted only here and in compensation metadata; outbox payloads expose only hasLegalReviewReference.';

CREATE OR REPLACE FUNCTION greenhouse_core.assert_member_contract_type_audit_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'member_contract_type_audit_log es append-only. Para correcciones, insertar nueva fila con metadata_json.correction_of=<audit_id>.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS member_contract_type_audit_no_update_trigger
  ON greenhouse_core.member_contract_type_audit_log;
DROP TRIGGER IF EXISTS member_contract_type_audit_no_delete_trigger
  ON greenhouse_core.member_contract_type_audit_log;

CREATE TRIGGER member_contract_type_audit_no_update_trigger
  BEFORE UPDATE ON greenhouse_core.member_contract_type_audit_log
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.assert_member_contract_type_audit_append_only();

CREATE TRIGGER member_contract_type_audit_no_delete_trigger
  BEFORE DELETE ON greenhouse_core.member_contract_type_audit_log
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.assert_member_contract_type_audit_append_only();

ALTER TABLE greenhouse_core.member_contract_type_audit_log OWNER TO greenhouse_ops;
GRANT SELECT, INSERT ON greenhouse_core.member_contract_type_audit_log TO greenhouse_runtime;

-- ============================================================================
-- 4. Anti pre-up-marker checks
-- ============================================================================

DO $$
DECLARE
  capability_count INTEGER;
  audit_table_exists BOOLEAN;
  invalid_member_tuples INTEGER;
BEGIN
  SELECT COUNT(*) INTO capability_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key = 'payroll.contract.use_international_internal'
    AND module = 'hr'
    AND deprecated_at IS NULL;

  IF capability_count <> 1 THEN
    RAISE EXCEPTION 'TASK-894 anti pre-up-marker check: expected active capability, got %', capability_count;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'greenhouse_core'
      AND table_name = 'member_contract_type_audit_log'
  ) INTO audit_table_exists;

  IF NOT audit_table_exists THEN
    RAISE EXCEPTION 'TASK-894 anti pre-up-marker check: member_contract_type_audit_log missing';
  END IF;

  SELECT COUNT(*) INTO invalid_member_tuples
  FROM greenhouse_core.members
  WHERE NOT (
    (
      contract_type IN ('indefinido', 'plazo_fijo', 'honorarios')
      AND pay_regime = 'chile'
      AND payroll_via = 'internal'
    )
    OR (
      contract_type IN ('contractor', 'eor')
      AND pay_regime = 'international'
      AND payroll_via = 'deel'
    )
    OR (
      contract_type = 'international_internal'
      AND pay_regime = 'international'
      AND payroll_via = 'internal'
    )
  );

  IF invalid_member_tuples <> 0 THEN
    RAISE EXCEPTION 'TASK-894 anti pre-up-marker check: expected zero invalid member tuples, got %', invalid_member_tuples;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'payroll.contract.use_international_internal'
  AND deprecated_at IS NULL;

ALTER TABLE greenhouse_core.members
  DROP CONSTRAINT IF EXISTS members_contract_payroll_tuple_check;

ALTER TABLE greenhouse_core.members
  DROP CONSTRAINT IF EXISTS members_contract_type_check;

ALTER TABLE greenhouse_core.members
  ADD CONSTRAINT members_contract_type_check
  CHECK (contract_type IN ('indefinido', 'plazo_fijo', 'honorarios', 'contractor', 'eor'));

ALTER TABLE greenhouse_payroll.compensation_versions
  DROP CONSTRAINT IF EXISTS compensation_versions_contract_pay_regime_check;

ALTER TABLE greenhouse_payroll.compensation_versions
  DROP CONSTRAINT IF EXISTS compensation_versions_contract_type_check;

ALTER TABLE greenhouse_payroll.compensation_versions
  ADD CONSTRAINT compensation_versions_contract_type_check
  CHECK (contract_type IN ('indefinido', 'plazo_fijo', 'honorarios', 'contractor', 'eor'));

ALTER TABLE greenhouse_payroll.payroll_entries
  DROP CONSTRAINT IF EXISTS payroll_entries_contract_type_snapshot_check;

ALTER TABLE greenhouse_payroll.payroll_entries
  ADD CONSTRAINT payroll_entries_contract_type_snapshot_check
  CHECK (
    contract_type_snapshot IS NULL
    OR contract_type_snapshot IN ('indefinido', 'plazo_fijo', 'honorarios', 'contractor', 'eor')
  ) NOT VALID;

DROP TABLE IF EXISTS greenhouse_core.member_contract_type_audit_log;
DROP FUNCTION IF EXISTS greenhouse_core.assert_member_contract_type_audit_append_only();
