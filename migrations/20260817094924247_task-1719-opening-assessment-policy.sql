-- Up Migration

-- TASK-1719 Slice 1 — Policy versionada que vincula una HiringOpening con una plantilla de
-- assessment. ADR: GREENHOUSE_HIRING_ASSESSMENT_ASSIGNMENT_POLICY_DECISION_V1.
--
-- D5.1 (nacimiento seguro): toda policy nace `draft` + `manual`. Pasar a `enabled` +
-- `on_stage_entry` exige la capability `hiring.assessment.policy.govern` + opening `published`
-- + audit. Configurar NO es habilitar: por eso los DEFAULT de la tabla son los conservadores.
--
-- D5.2 (cap de volumen): `volume_cap_per_window` / `volume_window_minutes` son el freno de
-- blast radius. Un error de configuración se paga con N correos, no con la cohorte entera.
--
-- D4 (drift del banco de preguntas): `template_content_digest` guarda el digest OBSERVADO al
-- habilitar. No congela nada por sí solo — el snapshot inmutable por instancia es requisito
-- duro antes de expandir más allá del canary — pero detecta drift barato.
--
-- Historia: `hiring_opening_assessment_policy_event` es append-only (trigger). La fila de
-- policy es MUTABLE (una activa por opening, `policy_version` incrementa al editar); la
-- trazabilidad de qué cambió y quién lo cambió vive en el event log, nunca en la fila.

CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_opening_assessment_policy (
  policy_id               TEXT PRIMARY KEY DEFAULT ('hoap-' || gen_random_uuid()::text),
  opening_id              TEXT NOT NULL
                            REFERENCES greenhouse_hiring.hiring_opening (opening_id) ON DELETE RESTRICT,
  template_id             TEXT NOT NULL
                            REFERENCES greenhouse_hiring.hiring_assessment_template (template_id) ON DELETE RESTRICT,
  policy_version          INTEGER NOT NULL DEFAULT 1 CHECK (policy_version >= 1),
  mode                    TEXT NOT NULL DEFAULT 'manual' CHECK (mode IN ('manual', 'on_stage_entry')),
  state                   TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'enabled', 'disabled')),
  -- V1 limita el trigger a etapas candidate-facing NO terminales (ADR D7: el trigger es la
  -- ETAPA, nunca un score/match/atributo inferido).
  trigger_stage           TEXT CHECK (trigger_stage IN ('shortlisted', 'interview')),
  time_limit_minutes      INTEGER CHECK (time_limit_minutes IS NULL OR time_limit_minutes BETWEEN 5 AND 240),
  template_content_digest TEXT,
  volume_cap_per_window   INTEGER NOT NULL DEFAULT 3 CHECK (volume_cap_per_window BETWEEN 1 AND 100),
  volume_window_minutes   INTEGER NOT NULL DEFAULT 60 CHECK (volume_window_minutes BETWEEN 5 AND 1440),
  created_by              TEXT,
  enabled_by              TEXT,
  enabled_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- `on_stage_entry` sin etapa trigger es una policy que nunca dispara: se rechaza en DB.
  CONSTRAINT hiring_opening_assessment_policy_trigger_ck
    CHECK (mode <> 'on_stage_entry' OR trigger_stage IS NOT NULL),
  -- `enabled` exige el digest observado del contenido (D4): habilitar a ciegas queda prohibido.
  CONSTRAINT hiring_opening_assessment_policy_enabled_digest_ck
    CHECK (state <> 'enabled' OR (template_content_digest IS NOT NULL AND enabled_at IS NOT NULL))
);

-- Una sola policy ACTIVA (draft|enabled) por opening. Deshabilitar libera el slot; la fila
-- disabled se conserva como histórico junto a su event log.
CREATE UNIQUE INDEX IF NOT EXISTS hiring_opening_assessment_policy_active_unique_idx
  ON greenhouse_hiring.hiring_opening_assessment_policy (opening_id)
  WHERE state <> 'disabled';

-- Resolución del trigger en el hot path: O(1) por (opening, etapa) sobre policies habilitadas.
CREATE INDEX IF NOT EXISTS hiring_opening_assessment_policy_trigger_idx
  ON greenhouse_hiring.hiring_opening_assessment_policy (opening_id, trigger_stage)
  WHERE state = 'enabled';

CREATE INDEX IF NOT EXISTS hiring_opening_assessment_policy_template_idx
  ON greenhouse_hiring.hiring_opening_assessment_policy (template_id);

-- Historia append-only de configuración/estado (patrón trio state-machine + CHECK + audit).
CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_opening_assessment_policy_event (
  policy_event_id TEXT PRIMARY KEY DEFAULT ('hoape-' || gen_random_uuid()::text),
  policy_id       TEXT NOT NULL
                    REFERENCES greenhouse_hiring.hiring_opening_assessment_policy (policy_id) ON DELETE RESTRICT,
  policy_version  INTEGER NOT NULL CHECK (policy_version >= 1),
  event_type      TEXT NOT NULL CHECK (event_type IN ('configured', 'reconfigured', 'enabled', 'disabled')),
  from_state      TEXT,
  to_state        TEXT NOT NULL,
  reason_code     TEXT,
  actor_user_id   TEXT,
  detail_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hiring_opening_assessment_policy_event_policy_idx
  ON greenhouse_hiring.hiring_opening_assessment_policy_event (policy_id, created_at DESC);

CREATE OR REPLACE FUNCTION greenhouse_hiring.prevent_hiring_policy_event_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'hiring_opening_assessment_policy_event es append-only (TASK-1719): % no permitido', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hiring_opening_assessment_policy_event_append_only
  ON greenhouse_hiring.hiring_opening_assessment_policy_event;
CREATE TRIGGER trg_hiring_opening_assessment_policy_event_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_hiring.hiring_opening_assessment_policy_event
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.prevent_hiring_policy_event_mutation();

ALTER TABLE greenhouse_hiring.hiring_opening_assessment_policy OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_hiring.hiring_opening_assessment_policy_event OWNER TO greenhouse_ops;

-- Grants column-scoped: el runtime NUNCA puede reescribir la identidad de la policy
-- (policy_id / opening_id / created_by / created_at). Sólo muta lo que un command gobernado
-- cambia. DELETE nunca: deshabilitar es la reversa, no borrar.
GRANT SELECT, INSERT ON greenhouse_hiring.hiring_opening_assessment_policy TO greenhouse_runtime;
GRANT UPDATE (
  template_id, policy_version, mode, state, trigger_stage, time_limit_minutes,
  template_content_digest, volume_cap_per_window, volume_window_minutes,
  enabled_by, enabled_at, updated_at
) ON greenhouse_hiring.hiring_opening_assessment_policy TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_hiring.hiring_opening_assessment_policy_event TO greenhouse_runtime;

-- Capability nueva de gobernanza (ADR D3). Role-only: EFEONCE_ADMIN ∪ HR_MANAGER ∪
-- EFEONCE_OPERATIONS, deliberadamente SIN routeGroup `internal` (todo tenant interno lo porta
-- incondicionalmente, así que incluirlo abriría el tier a collaborator/designer/people_viewer).
-- Rechazado endurecer `hiring.assessment.author`: autorar contenido ≠ decidir que el sistema
-- escriba a una cohorte.
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('hiring.assessment.policy.govern', 'hiring', ARRAY['execute'], ARRAY['tenant'],
   'TASK-1719 — Configurar la policy de assessment de una vacante y habilitar la asignación automática por etapa (draft+manual → enabled+on_stage_entry exige opening published + digest observado + audit). Grant role-only: EFEONCE_ADMIN + HR_MANAGER + EFEONCE_OPERATIONS. El assign manual puntual se queda en hiring.assessment.author.',
   NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- Anti pre-up-marker bug guard (ISSUE-068): aborta si el DDL/seed no quedó aplicado de verdad.
DO $$
DECLARE
  policy_table_ok boolean;
  event_table_ok boolean;
  unique_idx_ok boolean;
  trigger_ok boolean;
  cap_ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_hiring' AND table_name = 'hiring_opening_assessment_policy'
  ) INTO policy_table_ok;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_hiring' AND table_name = 'hiring_opening_assessment_policy_event'
  ) INTO event_table_ok;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_hiring'
      AND indexname = 'hiring_opening_assessment_policy_active_unique_idx'
  ) INTO unique_idx_ok;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_hiring_opening_assessment_policy_event_append_only'
  ) INTO trigger_ok;

  SELECT EXISTS (
    SELECT 1 FROM greenhouse_core.capabilities_registry
    WHERE capability_key = 'hiring.assessment.policy.govern' AND deprecated_at IS NULL
  ) INTO cap_ok;

  IF NOT policy_table_ok OR NOT event_table_ok OR NOT unique_idx_ok OR NOT trigger_ok OR NOT cap_ok THEN
    RAISE EXCEPTION 'TASK-1719 anti pre-up-marker check failed: policy=% event=% unique_idx=% trigger=% capability=%',
      policy_table_ok, event_table_ok, unique_idx_ok, trigger_ok, cap_ok;
  END IF;
END
$$;

-- Down Migration

DROP TRIGGER IF EXISTS trg_hiring_opening_assessment_policy_event_append_only
  ON greenhouse_hiring.hiring_opening_assessment_policy_event;
DROP TABLE IF EXISTS greenhouse_hiring.hiring_opening_assessment_policy_event;
DROP FUNCTION IF EXISTS greenhouse_hiring.prevent_hiring_policy_event_mutation();
DROP TABLE IF EXISTS greenhouse_hiring.hiring_opening_assessment_policy;
UPDATE greenhouse_core.capabilities_registry SET deprecated_at = NOW()
  WHERE capability_key = 'hiring.assessment.policy.govern' AND deprecated_at IS NULL;
