-- Up Migration

-- TASK-1848 Slice 3 — recurrencia gobernada de Efeonce Insights (arquitectura §9).
--
-- Un schedule define QUÉ generar (plantilla de encargo con período RELATIVO), CUÁNDO (cadencia,
-- zona, días de consolidación, catch-up acotado) y BAJO QUÉ AUTORIDAD (la persona interna que lo
-- activó, revalidada en cada ocurrencia). V1 (decisión del operador 2026-09-18): cada ocurrencia
-- genera la edición y pide su render, y queda en revisión humana; autoemisión y autoenvío NO
-- existen (el CHECK de review_policy lo fija).
--
--   · insight_schedules             = definición versionada (cambiar plantilla ⇒ nueva versión)
--   · insight_schedule_occurrences  = UNA fila por (schedule, versión, período): dos ticks no duplican

CREATE TABLE IF NOT EXISTS greenhouse_insights.insight_schedules (
  schedule_id text PRIMARY KEY DEFAULT ('isch-' || gen_random_uuid()::text),
  organization_id text NOT NULL,
  schedule_version integer NOT NULL DEFAULT 1 CHECK (schedule_version >= 1),
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'active', 'paused', 'retired')),
  label text NOT NULL CHECK (char_length(label) BETWEEN 3 AND 120),
  cadence text NOT NULL CHECK (cadence IN ('weekly', 'monthly')),
  time_zone text NOT NULL CHECK (char_length(time_zone) BETWEEN 3 AND 64),
  -- Días a esperar tras el cierre del período para que las fuentes consoliden (0–15).
  consolidation_days integer NOT NULL DEFAULT 3 CHECK (consolidation_days BETWEEN 0 AND 15),
  -- Cuántos períodos cerrados pendientes se recuperan tras una caída (1 por defecto, máximo 3).
  catch_up_limit integer NOT NULL DEFAULT 1 CHECK (catch_up_limit BETWEEN 1 AND 3),
  -- Plantilla del encargo SIN período ni idempotency key: la ocurrencia los resuelve.
  request_template jsonb NOT NULL CHECK (jsonb_typeof(request_template) = 'object'),
  review_policy text NOT NULL DEFAULT 'draft_for_review' CHECK (review_policy = 'draft_for_review'),
  authorized_by_actor_kind text NOT NULL CHECK (authorized_by_actor_kind IN ('member', 'client_user', 'system', 'cli')),
  authorized_by_user_id text NOT NULL,
  activated_at timestamptz,
  paused_at timestamptz,
  pause_reason text CHECK (pause_reason IS NULL OR pause_reason IN ('manual', 'authority_revoked', 'module_unavailable', 'repeated_failures')),
  retired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT insight_schedules_active_has_activation CHECK (state <> 'active' OR activated_at IS NOT NULL),
  CONSTRAINT insight_schedules_paused_has_reason CHECK (state <> 'paused' OR pause_reason IS NOT NULL),
  CONSTRAINT insight_schedules_retired_has_timestamp CHECK (state <> 'retired' OR retired_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS insight_schedules_org_idx
  ON greenhouse_insights.insight_schedules (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS insight_schedules_active_idx
  ON greenhouse_insights.insight_schedules (state)
  WHERE state = 'active';

CREATE TABLE IF NOT EXISTS greenhouse_insights.insight_schedule_occurrences (
  occurrence_id text PRIMARY KEY DEFAULT ('isco-' || gen_random_uuid()::text),
  schedule_id text NOT NULL,
  schedule_version integer NOT NULL,
  organization_id text NOT NULL,
  period_start date NOT NULL,
  period_end_exclusive date NOT NULL,
  state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'generating', 'generated', 'render_requested', 'failed', 'skipped')),
  edition_id text,
  render_run_id text,
  failure_code text,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT insight_schedule_occurrences_schedule_fk
    FOREIGN KEY (schedule_id) REFERENCES greenhouse_insights.insight_schedules (schedule_id),
  CONSTRAINT insight_schedule_occurrences_edition_fk
    FOREIGN KEY (edition_id) REFERENCES greenhouse_insights.insight_editions (edition_id),
  CONSTRAINT insight_schedule_occurrences_period_order CHECK (period_end_exclusive > period_start),
  CONSTRAINT insight_schedule_occurrences_failed_has_code CHECK (state <> 'failed' OR failure_code IS NOT NULL)
);

-- Ocurrencia ÚNICA por versión y período: dos ticks concurrentes o repetidos producen una sola.
CREATE UNIQUE INDEX IF NOT EXISTS insight_schedule_occurrences_period_uq
  ON greenhouse_insights.insight_schedule_occurrences (schedule_id, schedule_version, period_start);

CREATE INDEX IF NOT EXISTS insight_schedule_occurrences_open_idx
  ON greenhouse_insights.insight_schedule_occurrences (state, updated_at)
  WHERE state IN ('pending', 'generating');

DROP TRIGGER IF EXISTS insight_schedules_no_delete_trg ON greenhouse_insights.insight_schedules;
CREATE TRIGGER insight_schedules_no_delete_trg
  BEFORE DELETE ON greenhouse_insights.insight_schedules
  FOR EACH ROW EXECUTE FUNCTION greenhouse_insights.assert_insights_no_delete();

DROP TRIGGER IF EXISTS insight_schedule_occurrences_no_delete_trg ON greenhouse_insights.insight_schedule_occurrences;
CREATE TRIGGER insight_schedule_occurrences_no_delete_trg
  BEFORE DELETE ON greenhouse_insights.insight_schedule_occurrences
  FOR EACH ROW EXECUTE FUNCTION greenhouse_insights.assert_insights_no_delete();

-- Un schedule retirado es terminal: no se reactiva (se crea otro).
CREATE OR REPLACE FUNCTION greenhouse_insights.assert_insight_schedule_not_resurrected()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.state = 'retired' AND NEW.state <> 'retired' THEN
    RAISE EXCEPTION 'insight_schedules: un schedule retirado no se reactiva (%)', OLD.schedule_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'insight_schedules: organización y creación son inmutables (%)', OLD.schedule_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS insight_schedules_lifecycle_trg ON greenhouse_insights.insight_schedules;
CREATE TRIGGER insight_schedules_lifecycle_trg
  BEFORE UPDATE ON greenhouse_insights.insight_schedules
  FOR EACH ROW EXECUTE FUNCTION greenhouse_insights.assert_insight_schedule_not_resurrected();

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('insights.schedule.manage', 'insights', ARRAY['create', 'read', 'update'], ARRAY['organization', 'tenant'],
   'Crear, activar, pausar y retirar la recurrencia de Insights de una organización; cada ocurrencia genera un borrador para revisión humana. Sólo internos', NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

DO $$
DECLARE missing text := '';
BEGIN
  IF to_regclass('greenhouse_insights.insight_schedules') IS NULL THEN missing := missing || ' schedules'; END IF;
  IF to_regclass('greenhouse_insights.insight_schedule_occurrences') IS NULL THEN missing := missing || ' occurrences'; END IF;
  IF to_regclass('greenhouse_insights.insight_schedule_occurrences_period_uq') IS NULL THEN missing := missing || ' period_uq'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'insight_schedules_lifecycle_trg') THEN missing := missing || ' lifecycle_trg'; END IF;
  IF NOT EXISTS (SELECT 1 FROM greenhouse_core.capabilities_registry
    WHERE capability_key = 'insights.schedule.manage' AND deprecated_at IS NULL) THEN missing := missing || ' capability'; END IF;

  IF missing <> '' THEN
    RAISE EXCEPTION 'TASK-1848 anti pre-up-marker check: faltan objetos:%', missing;
  END IF;
END
$$;

ALTER TABLE greenhouse_insights.insight_schedules OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_insights.insight_schedule_occurrences OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE ON greenhouse_insights.insight_schedules TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_insights.insight_schedule_occurrences TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_insights.insight_schedules,
  greenhouse_insights.insight_schedule_occurrences TO greenhouse_migrator_user;

-- Down Migration

DROP TRIGGER IF EXISTS insight_schedules_lifecycle_trg ON greenhouse_insights.insight_schedules;
DROP TRIGGER IF EXISTS insight_schedule_occurrences_no_delete_trg ON greenhouse_insights.insight_schedule_occurrences;
DROP TRIGGER IF EXISTS insight_schedules_no_delete_trg ON greenhouse_insights.insight_schedules;
DROP TABLE IF EXISTS greenhouse_insights.insight_schedule_occurrences;
DROP TABLE IF EXISTS greenhouse_insights.insight_schedules;
DROP FUNCTION IF EXISTS greenhouse_insights.assert_insight_schedule_not_resurrected();
UPDATE greenhouse_core.capabilities_registry SET deprecated_at = NOW() WHERE capability_key = 'insights.schedule.manage';
