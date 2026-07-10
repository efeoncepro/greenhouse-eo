-- Up Migration

-- TASK-770 Slice 1 — hiring_activation_request: mapping durable del bridge Hiring→HRIS.
-- Additive-only. Un request por handoff (UNIQUE). El request NO es un state-machine paralelo
-- de member: registra el progreso del bridge (review → member_created → onboarding_open →
-- active) y los ids downstream reales (member/onboarding). La activación del colaborador
-- pasa SOLO por completeWorkforceMemberIntake + readiness (gobernanza TASK-872/874);
-- `ready_to_activate` NO se persiste (se computa live con el resolver de readiness).
-- Boundary: este dominio NUNCA escribe payroll_*/compensation/assignments/placements/
-- user_role_assignments/client_users.
-- Arch: Greenhouse_HRIS_Architecture_v1.md + GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md + task TASK-770.

-- 1. hiring_activation_request — aggregate del bridge.
CREATE TABLE IF NOT EXISTS greenhouse_hr.hiring_activation_request (
  activation_request_id TEXT PRIMARY KEY DEFAULT ('hact-' || gen_random_uuid()::text),
  hiring_handoff_id     TEXT NOT NULL UNIQUE
                          REFERENCES greenhouse_hiring.hiring_handoff (hiring_handoff_id) ON DELETE RESTRICT,
  hiring_application_id TEXT NOT NULL
                          REFERENCES greenhouse_hiring.hiring_application (application_id) ON DELETE RESTRICT,
  identity_profile_id   TEXT NOT NULL
                          REFERENCES greenhouse_core.identity_profiles (profile_id) ON DELETE RESTRICT,
  candidate_facet_id    TEXT NOT NULL
                          REFERENCES greenhouse_hiring.candidate_facet (candidate_facet_id) ON DELETE RESTRICT,
  -- Ids downstream reales (evidencia; nunca por inferencia).
  member_id             TEXT REFERENCES greenhouse_core.members (member_id) ON DELETE RESTRICT,
  -- created_new | linked_existing | reactivated (cómo se materializó la faceta member).
  member_outcome        TEXT CHECK (member_outcome IN ('created_new', 'linked_existing', 'reactivated')),
  onboarding_instance_id TEXT,
  onboarding_case_id    TEXT,
  state                 TEXT NOT NULL DEFAULT 'pending_hr_review' CHECK (state IN (
                          'pending_hr_review', 'blocked', 'member_created', 'onboarding_open',
                          'active', 'cancelled')),
  -- Código estable (enum HiringActivationBlockedReason) — la UI (1368) localiza desde el código.
  blocked_reason        TEXT CHECK (blocked_reason IN (
                          'ambiguous_identity', 'member_conflict', 'member_already_active',
                          'onboarding_template_missing', 'handoff_not_approved', 'legal_data_missing')),
  blocked_detail        TEXT,
  state_changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_user_id    TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- member_created/onboarding_open/active exigen member real; blocked exige código.
  CONSTRAINT hiring_activation_member_required CHECK (
    state NOT IN ('member_created', 'onboarding_open', 'active') OR member_id IS NOT NULL
  ),
  CONSTRAINT hiring_activation_blocked_requires_reason CHECK (
    state <> 'blocked' OR blocked_reason IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS hiring_activation_request_state_idx
  ON greenhouse_hr.hiring_activation_request (state, state_changed_at);
CREATE INDEX IF NOT EXISTS hiring_activation_request_member_idx
  ON greenhouse_hr.hiring_activation_request (member_id);
CREATE INDEX IF NOT EXISTS hiring_activation_request_profile_idx
  ON greenhouse_hr.hiring_activation_request (identity_profile_id);

-- touch updated_at (función compartida del schema hiring; greenhouse_hr no tiene una propia).
CREATE OR REPLACE FUNCTION greenhouse_hr.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hiring_activation_request_touch ON greenhouse_hr.hiring_activation_request;
CREATE TRIGGER trg_hiring_activation_request_touch
  BEFORE UPDATE ON greenhouse_hr.hiring_activation_request
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hr.touch_updated_at();

-- 2. hiring_activation_request_events — trail append-only por transición.
CREATE TABLE IF NOT EXISTS greenhouse_hr.hiring_activation_request_events (
  event_id              TEXT PRIMARY KEY DEFAULT ('hace-' || gen_random_uuid()::text),
  activation_request_id TEXT NOT NULL
                          REFERENCES greenhouse_hr.hiring_activation_request (activation_request_id) ON DELETE RESTRICT,
  from_state            TEXT,
  to_state              TEXT NOT NULL,
  actor_user_id         TEXT,
  reason_code           TEXT,
  reason_detail         TEXT,
  member_id             TEXT,
  onboarding_instance_id TEXT,
  onboarding_case_id    TEXT,
  metadata_json         JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hiring_activation_request_events_request_idx
  ON greenhouse_hr.hiring_activation_request_events (activation_request_id, occurred_at);

CREATE OR REPLACE FUNCTION greenhouse_hr.assert_hiring_activation_events_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'hiring_activation_request_events es append-only. Para correcciones, insertar nueva fila con metadata_json.correction_of=<event_id>.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hiring_activation_events_no_update_trigger ON greenhouse_hr.hiring_activation_request_events;
CREATE TRIGGER hiring_activation_events_no_update_trigger
  BEFORE UPDATE ON greenhouse_hr.hiring_activation_request_events
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hr.assert_hiring_activation_events_append_only();

DROP TRIGGER IF EXISTS hiring_activation_events_no_delete_trigger ON greenhouse_hr.hiring_activation_request_events;
CREATE TRIGGER hiring_activation_events_no_delete_trigger
  BEFORE DELETE ON greenhouse_hr.hiring_activation_request_events
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hr.assert_hiring_activation_events_append_only();

-- 3. Capability seed — hiring.activation.review (única nueva de 770; el resto se reusa).
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('hiring.activation.review', 'hiring', ARRAY['execute'], ARRAY['tenant'],
   'TASK-770 — Triage de la cola de activación hiring→HRIS (review de handoffs aprobados + mark-completed con evidencia). Verbo execute. Grant: hr routeGroup + EFEONCE_ADMIN + HR_MANAGER. Las demás acciones reusan workforce.member.intake.update / hr.onboarding_instance.',
   NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- 4. GRANTs (aggregate mutable → DML a runtime; events append-only → solo SELECT/INSERT).
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.hiring_activation_request TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.hiring_activation_request TO greenhouse_app;
GRANT SELECT, INSERT ON greenhouse_hr.hiring_activation_request_events TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_hr.hiring_activation_request_events TO greenhouse_app;

-- 5. Anti pre-up-marker guard (ISSUE-068).
DO $$
DECLARE table_count INTEGER;
DECLARE cap_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'greenhouse_hr'
    AND table_name IN ('hiring_activation_request', 'hiring_activation_request_events');

  IF table_count <> 2 THEN
    RAISE EXCEPTION 'TASK-770 anti pre-up-marker: expected 2 activation tables, got %. Markers may be inverted.', table_count;
  END IF;

  SELECT COUNT(*) INTO cap_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key = 'hiring.activation.review' AND deprecated_at IS NULL;

  IF cap_count <> 1 THEN
    RAISE EXCEPTION 'TASK-770 anti pre-up-marker: capability hiring.activation.review not seeded.';
  END IF;
END
$$;

-- Down Migration

-- Solo undo. Capability soft-deprecated (NUNCA DELETE — gobernanza TASK-840).
UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'hiring.activation.review';

DROP TRIGGER IF EXISTS hiring_activation_events_no_update_trigger ON greenhouse_hr.hiring_activation_request_events;
DROP TRIGGER IF EXISTS hiring_activation_events_no_delete_trigger ON greenhouse_hr.hiring_activation_request_events;
DROP FUNCTION IF EXISTS greenhouse_hr.assert_hiring_activation_events_append_only();
DROP TRIGGER IF EXISTS trg_hiring_activation_request_touch ON greenhouse_hr.hiring_activation_request;
DROP FUNCTION IF EXISTS greenhouse_hr.touch_updated_at();
DROP TABLE IF EXISTS greenhouse_hr.hiring_activation_request_events;
DROP TABLE IF EXISTS greenhouse_hr.hiring_activation_request;
