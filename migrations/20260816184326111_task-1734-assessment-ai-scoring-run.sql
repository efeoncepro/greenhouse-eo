-- Up Migration

-- TASK-1734 Slice 1 — Run asíncrono durable de scoring IA por hiring_assessment exacto.
-- ADR: GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1 (D1 aggregate + state machine,
-- D3 reconciliación del backlog huérfano). Patrón trio state-machine+CHECK+audit
-- (GREENHOUSE_CANONICAL_PATTERNS_V1): CHECK de estados válidos + state machine en código
-- + historia append-only. Grants column-scoped desde el nacimiento (patrón hardening
-- 20260816183255999 de TASK-1735): las columnas de identidad/digest son inmutables a
-- nivel estructural, solo las columnas de transición aceptan UPDATE del runtime.

-- ── 1. hiring_assessment_ai_scoring_run — el aggregate del run ──
-- A lo más UN run activo por (assessment_id, input_digest): el digest captura answers +
-- rubric + prompt version + policy version + modelo EFECTIVO resuelto (nunca el default).
CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_assessment_ai_scoring_run (
  run_id           TEXT PRIMARY KEY DEFAULT ('asrun-' || gen_random_uuid()::text),
  assessment_id    TEXT NOT NULL REFERENCES greenhouse_hiring.hiring_assessment (assessment_id) ON DELETE RESTRICT,
  application_id   TEXT NOT NULL REFERENCES greenhouse_hiring.hiring_application (application_id) ON DELETE RESTRICT,
  input_digest     TEXT NOT NULL,
  model            TEXT NOT NULL,
  prompt_version   TEXT NOT NULL,
  policy_version   TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'created' CHECK (status IN (
                     'created', 'enumerating', 'scoring', 'awaiting_review',
                     'confirmable', 'confirmed', 'cancelled', 'failed')),
  status_reason    TEXT,
  lease_owner      TEXT,
  lease_expires_at TIMESTAMPTZ,
  created_by       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotencia del start (D1): replay/duplicado de hiring.assessment.submitted resuelve
-- al MISMO run activo — nunca doble scoring. El arbiter es este índice único parcial.
CREATE UNIQUE INDEX IF NOT EXISTS hiring_ai_scoring_run_active_digest_uniq
  ON greenhouse_hiring.hiring_assessment_ai_scoring_run (assessment_id, input_digest)
  WHERE status NOT IN ('confirmed', 'cancelled', 'failed');

CREATE INDEX IF NOT EXISTS hiring_ai_scoring_run_assessment_idx
  ON greenhouse_hiring.hiring_assessment_ai_scoring_run (assessment_id, status);
-- Drain/reconcile: runs no terminales.
CREATE INDEX IF NOT EXISTS hiring_ai_scoring_run_active_idx
  ON greenhouse_hiring.hiring_assessment_ai_scoring_run (status, created_at)
  WHERE status NOT IN ('confirmed', 'cancelled', 'failed');

-- ── 2. hiring_assessment_ai_scoring_run_item — lineage exacto por respuesta ──
-- applicationId → assessmentId → responseId + proposal_id + input_digest del proposal
-- (TASK-1383). risk_class la puebla la policy versionada (Slice 2); acá nace nullable.
CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_assessment_ai_scoring_run_item (
  run_item_id    TEXT PRIMARY KEY DEFAULT ('asri-' || gen_random_uuid()::text),
  run_id         TEXT NOT NULL REFERENCES greenhouse_hiring.hiring_assessment_ai_scoring_run (run_id) ON DELETE RESTRICT,
  assessment_id  TEXT NOT NULL REFERENCES greenhouse_hiring.hiring_assessment (assessment_id) ON DELETE RESTRICT,
  application_id TEXT NOT NULL REFERENCES greenhouse_hiring.hiring_application (application_id) ON DELETE RESTRICT,
  response_id    TEXT NOT NULL REFERENCES greenhouse_hiring.hiring_assessment_response (response_id) ON DELETE RESTRICT,
  proposal_id    TEXT REFERENCES greenhouse_hiring.hiring_assessment_ai_proposal (proposal_id) ON DELETE RESTRICT,
  input_digest   TEXT,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                   'pending', 'claimed', 'proposed', 'abstained', 'failed',
                   'stale', 'superseded_by_manual', 'cancelled', 'confirmed')),
  risk_class     TEXT CHECK (risk_class IS NULL OR risk_class IN ('mandatory_review', 'quality_sample', 'batch_eligible')),
  reason_code    TEXT,
  attempt_count  INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (run_id, response_id)
);

CREATE INDEX IF NOT EXISTS hiring_ai_scoring_run_item_run_idx
  ON greenhouse_hiring.hiring_assessment_ai_scoring_run_item (run_id, status);
CREATE INDEX IF NOT EXISTS hiring_ai_scoring_run_item_response_idx
  ON greenhouse_hiring.hiring_assessment_ai_scoring_run_item (response_id);
-- Claim atómico del drain (Slice 2): items pendientes.
CREATE INDEX IF NOT EXISTS hiring_ai_scoring_run_item_pending_idx
  ON greenhouse_hiring.hiring_assessment_ai_scoring_run_item (created_at)
  WHERE status IN ('pending', 'claimed');

-- ── 3. hiring_assessment_ai_scoring_run_event — historia append-only del lifecycle ──
-- Audit trail del trio: toda transición de run/item queda como hecho estructurado
-- (IDs, estados, reason codes, actor). NUNCA texto de respuesta ni PII.
CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_assessment_ai_scoring_run_event (
  run_event_id  TEXT PRIMARY KEY DEFAULT ('asre-' || gen_random_uuid()::text),
  run_id        TEXT NOT NULL REFERENCES greenhouse_hiring.hiring_assessment_ai_scoring_run (run_id) ON DELETE RESTRICT,
  run_item_id   TEXT REFERENCES greenhouse_hiring.hiring_assessment_ai_scoring_run_item (run_item_id) ON DELETE RESTRICT,
  event_type    TEXT NOT NULL CHECK (event_type IN ('run_transition', 'item_transition', 'reconciliation')),
  from_status   TEXT,
  to_status     TEXT,
  reason_code   TEXT,
  actor_user_id TEXT,
  detail_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hiring_ai_scoring_run_event_run_idx
  ON greenhouse_hiring.hiring_assessment_ai_scoring_run_event (run_id, created_at);

-- ── 4. Backlog huérfano (ADR D3 / Delta punto 3, caso EO-ASM-0050) ──
-- Estado terminal explícito para proposals superadas por el carril manual directo
-- (recordHumanScore + finalizeAssessment sin confirm). La reconciliación las cierra
-- por transición auditada, NUNCA por DELETE.
ALTER TABLE greenhouse_hiring.hiring_assessment_ai_proposal
  DROP CONSTRAINT IF EXISTS hiring_assessment_ai_proposal_status_check;

ALTER TABLE greenhouse_hiring.hiring_assessment_ai_proposal
  ADD CONSTRAINT hiring_assessment_ai_proposal_status_check
  CHECK (status IN ('proposed', 'confirmed', 'rejected', 'superseded_by_manual'));

-- ── 5. Triggers touch_updated_at (reusa la función del schema, TASK-1360) ──
DROP TRIGGER IF EXISTS trg_hiring_ai_scoring_run_touch ON greenhouse_hiring.hiring_assessment_ai_scoring_run;
CREATE TRIGGER trg_hiring_ai_scoring_run_touch BEFORE UPDATE ON greenhouse_hiring.hiring_assessment_ai_scoring_run
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.touch_updated_at();
DROP TRIGGER IF EXISTS trg_hiring_ai_scoring_run_item_touch ON greenhouse_hiring.hiring_assessment_ai_scoring_run_item;
CREATE TRIGGER trg_hiring_ai_scoring_run_item_touch BEFORE UPDATE ON greenhouse_hiring.hiring_assessment_ai_scoring_run_item
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.touch_updated_at();

-- ── 6. Ownership + grants mínimos (column-scoped UPDATE desde el nacimiento) ──
ALTER TABLE greenhouse_hiring.hiring_assessment_ai_scoring_run OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_hiring.hiring_assessment_ai_scoring_run_item OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_hiring.hiring_assessment_ai_scoring_run_event OWNER TO greenhouse_ops;

-- Run: identidad/digest/modelo inmutables; solo transición + lease mutan.
GRANT SELECT, INSERT ON greenhouse_hiring.hiring_assessment_ai_scoring_run TO greenhouse_runtime;
GRANT UPDATE (status, status_reason, lease_owner, lease_expires_at, updated_at)
  ON greenhouse_hiring.hiring_assessment_ai_scoring_run TO greenhouse_runtime;

-- Item: lineage inmutable; transición + resultado de scoring mutan.
GRANT SELECT, INSERT ON greenhouse_hiring.hiring_assessment_ai_scoring_run_item TO greenhouse_runtime;
GRANT UPDATE (status, risk_class, reason_code, proposal_id, input_digest, attempt_count, updated_at)
  ON greenhouse_hiring.hiring_assessment_ai_scoring_run_item TO greenhouse_runtime;

-- Historia: append-only estructural (sin UPDATE ni DELETE para runtime).
GRANT SELECT, INSERT ON greenhouse_hiring.hiring_assessment_ai_scoring_run_event TO greenhouse_runtime;

-- ── 7. Anti pre-up-marker guard (ISSUE-068): aborta si el DDL no quedó aplicado ──
DO $$
DECLARE run_ok boolean; item_ok boolean; event_ok boolean; uniq_ok boolean; check_ok integer;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_hiring' AND table_name = 'hiring_assessment_ai_scoring_run'
  ) INTO run_ok;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_hiring' AND table_name = 'hiring_assessment_ai_scoring_run_item'
  ) INTO item_ok;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_hiring' AND table_name = 'hiring_assessment_ai_scoring_run_event'
  ) INTO event_ok;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_hiring' AND indexname = 'hiring_ai_scoring_run_active_digest_uniq'
  ) INTO uniq_ok;

  SELECT COUNT(*) INTO check_ok
  FROM information_schema.check_constraints
  WHERE constraint_schema = 'greenhouse_hiring'
    AND constraint_name = 'hiring_assessment_ai_proposal_status_check'
    AND check_clause LIKE '%superseded_by_manual%';

  IF NOT run_ok OR NOT item_ok OR NOT event_ok OR NOT uniq_ok OR check_ok <> 1 THEN
    RAISE EXCEPTION 'TASK-1734 anti pre-up-marker check failed: run=% item=% event=% uniq=% status_check=%',
      run_ok, item_ok, event_ok, uniq_ok, check_ok;
  END IF;
END
$$;

-- Down Migration

-- Solo antes de que exista evidencia retenida (posture del ADR D3). Restaura el CHECK
-- original de TASK-1361 — falla si hay filas superseded_by_manual (protección deliberada).
DROP TABLE IF EXISTS greenhouse_hiring.hiring_assessment_ai_scoring_run_event;
DROP TABLE IF EXISTS greenhouse_hiring.hiring_assessment_ai_scoring_run_item;
DROP TABLE IF EXISTS greenhouse_hiring.hiring_assessment_ai_scoring_run;

ALTER TABLE greenhouse_hiring.hiring_assessment_ai_proposal
  DROP CONSTRAINT IF EXISTS hiring_assessment_ai_proposal_status_check;

ALTER TABLE greenhouse_hiring.hiring_assessment_ai_proposal
  ADD CONSTRAINT hiring_assessment_ai_proposal_status_check
  CHECK (status IN ('proposed', 'confirmed', 'rejected'));
