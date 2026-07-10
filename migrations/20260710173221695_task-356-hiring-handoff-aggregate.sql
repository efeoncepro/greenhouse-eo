-- Up Migration

-- TASK-356 Slice 1 — HiringHandoff aggregate: boundary object explícito y auditable entre la
-- decisión de reclutamiento (355) y el runtime downstream (770/HRIS/Staff Aug).
-- Additive-only. Un handoff por aplicación (UNIQUE), con supersede explícito anclado a
-- `decision_id` (correlaciona con explainability_json.decisionHistory[].decisionId de
-- hiring_application — acoplamiento a shape JSON aceptado, ver task §Resolved Open Questions).
-- Boundary duro: este aggregate NUNCA escribe members/assignments/placements/payroll_*/
-- compensation_versions/final_settlements/contractor_engagements/providers/expenses.
-- `expected_legal_entity` es snapshot informativo de la decisión — propuesta NO vinculante,
-- NUNCA interpretable como contractType; la clasificación del régimen la hace el owner
-- downstream (770 / EPIC-013 / legal), nunca Hiring.
-- Arch: GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md + task TASK-356.

-- 1. hiring_handoff — aggregate mutable con state-machine gobernada por command.
CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_handoff (
  hiring_handoff_id     TEXT PRIMARY KEY DEFAULT ('hhof-' || gen_random_uuid()::text),
  hiring_application_id TEXT NOT NULL UNIQUE
                          REFERENCES greenhouse_hiring.hiring_application (application_id) ON DELETE RESTRICT,
  -- Única vía de scope: hiring_application no tiene space_id/organization_id; se hereda
  -- por opening_id → hiring_opening.space_id/organization_id en los readers.
  opening_id            TEXT NOT NULL
                          REFERENCES greenhouse_hiring.hiring_opening (opening_id) ON DELETE RESTRICT,
  -- Ancla del supersede: la entrada de decisionHistory[] que produjo/actualizó esta fila.
  decision_id           TEXT NOT NULL,
  identity_profile_id   TEXT NOT NULL
                          REFERENCES greenhouse_core.identity_profiles (profile_id) ON DELETE RESTRICT,
  candidate_facet_id    TEXT NOT NULL
                          REFERENCES greenhouse_hiring.candidate_facet (candidate_facet_id) ON DELETE RESTRICT,
  selected_destination  TEXT NOT NULL CHECK (selected_destination IN (
                          'internal_reassignment', 'internal_hire', 'staff_augmentation',
                          'contractor', 'partner')),
  state                 TEXT NOT NULL DEFAULT 'pending' CHECK (state IN (
                          'pending', 'approved', 'in_setup', 'completed', 'blocked', 'cancelled')),
  -- Snapshot informativo (propuesta NO vinculante — NUNCA clasificación de contrato).
  expected_legal_entity TEXT,
  tentative_start_date  DATE,
  prerequisites_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Evidencia del owner downstream; requerido para state='completed' (CHECK abajo).
  downstream_ref        TEXT,
  -- Código estable (enum HiringHandoffBlockedReason) — el consumer (770) localiza desde
  -- el código; NUNCA prosa cruda al cliente. blocked_detail es interno, no client-facing.
  blocked_reason        TEXT CHECK (blocked_reason IN (
                          'destination_not_supported', 'missing_legal_entity', 'missing_start_date',
                          'ambiguous_identity', 'decision_superseded_after_approval',
                          'decision_revoked', 'prerequisites_open')),
  blocked_detail        TEXT,
  state_changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- completed exige evidencia downstream; blocked exige código de razón.
  CONSTRAINT hiring_handoff_completed_requires_ref CHECK (
    state <> 'completed' OR downstream_ref IS NOT NULL
  ),
  CONSTRAINT hiring_handoff_blocked_requires_reason CHECK (
    state <> 'blocked' OR blocked_reason IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS hiring_handoff_state_idx
  ON greenhouse_hiring.hiring_handoff (state, state_changed_at);
CREATE INDEX IF NOT EXISTS hiring_handoff_destination_state_idx
  ON greenhouse_hiring.hiring_handoff (selected_destination, state);
CREATE INDEX IF NOT EXISTS hiring_handoff_identity_profile_idx
  ON greenhouse_hiring.hiring_handoff (identity_profile_id);
CREATE INDEX IF NOT EXISTS hiring_handoff_opening_idx
  ON greenhouse_hiring.hiring_handoff (opening_id);

DROP TRIGGER IF EXISTS trg_hiring_handoff_touch ON greenhouse_hiring.hiring_handoff;
CREATE TRIGGER trg_hiring_handoff_touch
  BEFORE UPDATE ON greenhouse_hiring.hiring_handoff
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.touch_updated_at();

-- 2. hiring_handoff_audit — trail append-only (state-machine + CHECK + audit trio).
CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_handoff_audit (
  audit_id              TEXT PRIMARY KEY DEFAULT ('hhau-' || gen_random_uuid()::text),
  hiring_handoff_id     TEXT NOT NULL
                          REFERENCES greenhouse_hiring.hiring_handoff (hiring_handoff_id) ON DELETE RESTRICT,
  from_state            TEXT,
  to_state              TEXT NOT NULL,
  decision_id           TEXT,
  actor_user_id         TEXT,
  reason_code           TEXT,
  reason_detail         TEXT,
  downstream_ref        TEXT,
  open_prerequisites_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hiring_handoff_audit_handoff_idx
  ON greenhouse_hiring.hiring_handoff_audit (hiring_handoff_id, occurred_at);

CREATE OR REPLACE FUNCTION greenhouse_hiring.assert_hiring_handoff_audit_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'hiring_handoff_audit es append-only. Para correcciones, insertar nueva fila con reason_detail referenciando la original.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hiring_handoff_audit_no_update_trigger ON greenhouse_hiring.hiring_handoff_audit;
CREATE TRIGGER hiring_handoff_audit_no_update_trigger
  BEFORE UPDATE ON greenhouse_hiring.hiring_handoff_audit
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.assert_hiring_handoff_audit_append_only();

DROP TRIGGER IF EXISTS hiring_handoff_audit_no_delete_trigger ON greenhouse_hiring.hiring_handoff_audit;
CREATE TRIGGER hiring_handoff_audit_no_delete_trigger
  BEFORE DELETE ON greenhouse_hiring.hiring_handoff_audit
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.assert_hiring_handoff_audit_append_only();

-- 3. Capability seed — hiring.handoff.approve (governance verb, mismo PR que el grant TS).
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('hiring.handoff.approve', 'hiring', ARRAY['execute'], ARRAY['tenant'],
   'TASK-356 — Gobernar las transiciones del HiringHandoff (approve/setup/complete/cancel). Verbo execute (gobernanza). Grant: internal + EFEONCE_ADMIN + HR_MANAGER + EFEONCE_OPERATIONS.',
   NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- 4. GRANTs (espeja TASK-353: aggregate mutable → DML completo a runtime; audit solo
--    SELECT/INSERT a nivel de grant además de los triggers — defensa en profundidad).
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_handoff TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_handoff TO greenhouse_app;
GRANT SELECT, INSERT ON greenhouse_hiring.hiring_handoff_audit TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_hiring.hiring_handoff_audit TO greenhouse_app;

-- 5. Anti pre-up-marker bug guard (ISSUE-068): aborta si el DDL/seed no quedó aplicado.
DO $$
DECLARE table_count INTEGER;
DECLARE cap_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'greenhouse_hiring'
    AND table_name IN ('hiring_handoff', 'hiring_handoff_audit');

  IF table_count <> 2 THEN
    RAISE EXCEPTION 'TASK-356 anti pre-up-marker: expected 2 handoff tables, got %. Markers may be inverted.', table_count;
  END IF;

  SELECT COUNT(*) INTO cap_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key = 'hiring.handoff.approve' AND deprecated_at IS NULL;

  IF cap_count <> 1 THEN
    RAISE EXCEPTION 'TASK-356 anti pre-up-marker: capability hiring.handoff.approve not seeded.';
  END IF;
END
$$;

-- Down Migration

-- Solo undo. La capability se soft-deprecia (NUNCA DELETE — gobernanza TASK-840).
UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'hiring.handoff.approve';

DROP TRIGGER IF EXISTS hiring_handoff_audit_no_update_trigger ON greenhouse_hiring.hiring_handoff_audit;
DROP TRIGGER IF EXISTS hiring_handoff_audit_no_delete_trigger ON greenhouse_hiring.hiring_handoff_audit;
DROP FUNCTION IF EXISTS greenhouse_hiring.assert_hiring_handoff_audit_append_only();
DROP TRIGGER IF EXISTS trg_hiring_handoff_touch ON greenhouse_hiring.hiring_handoff;
DROP TABLE IF EXISTS greenhouse_hiring.hiring_handoff_audit;
DROP TABLE IF EXISTS greenhouse_hiring.hiring_handoff;
