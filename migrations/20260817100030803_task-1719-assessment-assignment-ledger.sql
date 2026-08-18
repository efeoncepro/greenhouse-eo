-- Up Migration

-- TASK-1719 Slice 2 — Ledger durable del assignment de assessment. ADR D2 (idempotencia en
-- tres capas): éste es la CAPA 1. La capa 2 es `ON CONFLICT DO NOTHING RETURNING` sobre el
-- índice parcial de abajo + re-lectura del ganador (patrón `createScoringRun`, sin excepción
-- de por medio). La capa 3 es el límite de autoridad: la automatización SOLO escribe
-- `attempt_seq = 1` — retake y re-asignación post-cancelación son commands humanos.
--
-- Las dos rutas de assignment (confirmación humana y entrada a etapa) convergen acá: una sola
-- clave de idempotencia para ambas. `trigger_stage='manual'` identifica la ruta humana.
--
-- `superseded_at` es lo que permite reintentar gobernadamente un outcome terminal-pero-
-- recuperable (`held`/`blocked`/`stale`): la reconciliación lo supersede y vuelve a intentar.
-- Sin él, un `blocked: volume_cap` congelaría la postulación para siempre.

CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_assessment_assignment (
  assignment_id   TEXT PRIMARY KEY DEFAULT ('hoaa-' || gen_random_uuid()::text),
  application_id  TEXT NOT NULL
                    REFERENCES greenhouse_hiring.hiring_application (application_id) ON DELETE RESTRICT,
  policy_id       TEXT NOT NULL
                    REFERENCES greenhouse_hiring.hiring_opening_assessment_policy (policy_id) ON DELETE RESTRICT,
  -- Nullable: el ledger se escribe ANTES de crear la instancia (y en los outcomes terminales
  -- no se crea ninguna). El hecho durable es el intent; la instancia es su consecuencia.
  assessment_id   TEXT
                    REFERENCES greenhouse_hiring.hiring_assessment (assessment_id) ON DELETE SET NULL,
  policy_version  INTEGER NOT NULL CHECK (policy_version >= 1),
  trigger_stage   TEXT NOT NULL CHECK (trigger_stage IN ('shortlisted', 'interview', 'manual')),
  attempt_seq     INTEGER NOT NULL DEFAULT 1 CHECK (attempt_seq >= 1),
  origin          TEXT NOT NULL CHECK (origin IN ('manual', 'stage_auto', 'reconciliation')),
  outcome         TEXT NOT NULL CHECK (outcome IN (
                    'assigned', 'already_assigned', 'held', 'blocked', 'stale', 'cancelled')),
  -- Reason codes estables, sin PII: nunca nombre, email, token, respuesta ni score.
  outcome_reason  TEXT CHECK (outcome_reason IS NULL OR length(outcome_reason) BETWEEN 1 AND 64),
  superseded_at   TIMESTAMPTZ,
  actor_user_id   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Un outcome `assigned` sin instancia es un ledger que miente.
  CONSTRAINT hiring_assessment_assignment_assigned_instance_ck
    CHECK (outcome <> 'assigned' OR assessment_id IS NOT NULL)
);

-- CAPA 1 de la idempotencia: un intento vigente por (application, policy, versión, etapa,
-- intento). El replay del mismo trigger colisiona acá y devuelve el outcome ya registrado.
CREATE UNIQUE INDEX IF NOT EXISTS hiring_assessment_assignment_active_unique_idx
  ON greenhouse_hiring.hiring_assessment_assignment
     (application_id, policy_id, policy_version, trigger_stage, attempt_seq)
  WHERE superseded_at IS NULL;

-- Conteo del cap de volumen por policy/ventana (D5.2) y reconciliación por policy.
CREATE INDEX IF NOT EXISTS hiring_assessment_assignment_policy_idx
  ON greenhouse_hiring.hiring_assessment_assignment (policy_id, created_at DESC);

CREATE INDEX IF NOT EXISTS hiring_assessment_assignment_application_idx
  ON greenhouse_hiring.hiring_assessment_assignment (application_id, created_at DESC);

ALTER TABLE greenhouse_hiring.hiring_assessment_assignment OWNER TO greenhouse_ops;

-- Grants column-scoped: el runtime no puede reescribir la clave de idempotencia
-- (application/policy/versión/etapa/intento/origen) ni el actor. Sólo cierra la fila con su
-- instancia, corrige el outcome dentro de la misma transacción del command, o la supersede.
-- DELETE nunca: la reversa es superseder, no borrar.
GRANT SELECT, INSERT ON greenhouse_hiring.hiring_assessment_assignment TO greenhouse_runtime;
GRANT UPDATE (assessment_id, outcome, outcome_reason, superseded_at, updated_at)
  ON greenhouse_hiring.hiring_assessment_assignment TO greenhouse_runtime;

-- Anti pre-up-marker bug guard (ISSUE-068): aborta si el DDL no se aplicó de verdad.
DO $$
DECLARE
  table_ok boolean;
  unique_idx_ok boolean;
  assigned_ck_ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_hiring' AND table_name = 'hiring_assessment_assignment'
  ) INTO table_ok;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_hiring'
      AND indexname = 'hiring_assessment_assignment_active_unique_idx'
  ) INTO unique_idx_ok;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'hiring_assessment_assignment_assigned_instance_ck'
  ) INTO assigned_ck_ok;

  IF NOT table_ok OR NOT unique_idx_ok OR NOT assigned_ck_ok THEN
    RAISE EXCEPTION 'TASK-1719 Slice 2 anti pre-up-marker check failed: table=% unique_idx=% assigned_ck=%',
      table_ok, unique_idx_ok, assigned_ck_ok;
  END IF;
END
$$;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_hiring.hiring_assessment_assignment;
