-- Up Migration

-- TASK-1846 Slice 1 — render durable de Efeonce Insights.
--
-- Dos tablas, no una. El worker ejecuta UN artefacto por ejecución de Cloud Run Job, y la
-- acceptance exige que "fallar report_pdf conserva deck_pdf exitoso" y que el retry de un output
-- no repita los exitosos. Por eso la unidad RECLAMABLE es el output, no el run:
--   · insight_render_runs  = la solicitud por edición (qué targets se pidieron, para qué audiencia)
--   · insight_outputs      = un target ejecutable e independientemente reintentable
--
-- Lease y fencing NO entran acá: llegan juntos en el Slice 2 (separarlos abre una ventana de doble
-- finalización que hoy no existe, porque nada re-reclama). Ver Design Decision de la task.

CREATE TABLE IF NOT EXISTS greenhouse_insights.insight_render_runs (
  render_run_id text PRIMARY KEY DEFAULT ('irun-' || gen_random_uuid()::text),
  organization_id text NOT NULL,
  edition_id text NOT NULL,
  -- Vocabulario de Insights: client|internal (NO el client_facing de Proposal).
  audience text NOT NULL CHECK (audience IN ('client', 'internal')),
  requested_outputs jsonb NOT NULL DEFAULT '[]'::jsonb,
  state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'running', 'completed', 'partial_failed', 'failed', 'cancelled')),
  requested_by_kind text NOT NULL CHECK (requested_by_kind IN ('member', 'system', 'cli')),
  requested_by_user_id text,
  requested_by_member_id text,
  started_at timestamptz,
  finished_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT insight_render_runs_edition_fk
    FOREIGN KEY (edition_id) REFERENCES greenhouse_insights.insight_editions (edition_id),
  CONSTRAINT insight_render_runs_requested_outputs_not_empty
    CHECK (jsonb_typeof(requested_outputs) = 'array' AND jsonb_array_length(requested_outputs) > 0),
  CONSTRAINT insight_render_runs_cancelled_has_timestamp
    CHECK (state <> 'cancelled' OR cancelled_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS insight_render_runs_edition_idx
  ON greenhouse_insights.insight_render_runs (organization_id, edition_id);

CREATE TABLE IF NOT EXISTS greenhouse_insights.insight_outputs (
  insight_output_id text PRIMARY KEY DEFAULT ('iout-' || gen_random_uuid()::text),
  render_run_id text NOT NULL,
  organization_id text NOT NULL,
  edition_id text NOT NULL,
  -- Vocabulario canónico del dominio (contracts/request.ts INSIGHT_OUTPUTS).
  output text NOT NULL CHECK (output IN ('deck_pdf', 'report_pdf', 'web')),
  audience text NOT NULL CHECK (audience IN ('client', 'internal')),
  catalog_name text NOT NULL,
  -- ResolvedCompositionManifest verbatim + su hash sellado: el worker re-resuelve y compara
  -- byte a byte contra este hash; cualquier drift es manifest_drift y NO se renderiza.
  manifest jsonb NOT NULL,
  manifest_hash text NOT NULL CHECK (manifest_hash ~ '^[0-9a-f]{64}$'),
  constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
  deadline timestamptz,
  state text NOT NULL DEFAULT 'queued'
    CHECK (state IN ('queued', 'running', 'completed', 'failed', 'dead_letter', 'cancelled')),
  failure_code text
    CHECK (failure_code IS NULL OR failure_code IN (
      'audience_violation', 'semantic_rejected', 'size_rejected', 'geometry_rejected',
      'font_fallback_detected', 'missing_asset', 'blank_slide', 'manifest_drift',
      'render_error', 'timeout', 'dispatch_error', 'cancelled'
    )),
  failure_detail text,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 10),
  started_at timestamptz,
  finished_at timestamptz,
  execution_name text,
  output_asset_id text,
  output_report jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT insight_outputs_run_fk
    FOREIGN KEY (render_run_id) REFERENCES greenhouse_insights.insight_render_runs (render_run_id),
  CONSTRAINT insight_outputs_edition_fk
    FOREIGN KEY (edition_id) REFERENCES greenhouse_insights.insight_editions (edition_id),
  -- Completed exige el asset; failed/dead_letter exigen código. Un output "completo" sin bytes
  -- es justamente lo que el puerto de outputs no puede aceptar para emitir.
  CONSTRAINT insight_outputs_completed_has_asset
    CHECK (state <> 'completed' OR output_asset_id IS NOT NULL),
  CONSTRAINT insight_outputs_failed_has_code
    CHECK (state NOT IN ('failed', 'dead_letter') OR failure_code IS NOT NULL)
);

-- Idempotencia: UN output por (edición, target, audiencia). El retry reusa la fila (attempts+1),
-- nunca crea una segunda. La audiencia entra en la clave porque un job de cliente JAMÁS puede
-- reutilizar los bytes de un draft interno aunque coincidan organización y período.
CREATE UNIQUE INDEX IF NOT EXISTS insight_outputs_identity_uq
  ON greenhouse_insights.insight_outputs (organization_id, edition_id, output, audience);

CREATE INDEX IF NOT EXISTS insight_outputs_claim_idx
  ON greenhouse_insights.insight_outputs (state, deadline NULLS LAST, created_at)
  WHERE state = 'queued';

CREATE INDEX IF NOT EXISTS insight_outputs_run_idx
  ON greenhouse_insights.insight_outputs (render_run_id);

-- Historial append-only de transiciones (pilar de resiliencia: reconstruir qué pasó ayer).
CREATE TABLE IF NOT EXISTS greenhouse_insights.insight_render_events (
  render_event_id bigserial PRIMARY KEY,
  insight_output_id text,
  render_run_id text NOT NULL,
  organization_id text NOT NULL,
  from_state text,
  to_state text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_kind text NOT NULL CHECK (actor_kind IN ('member', 'system', 'cli', 'worker', 'dispatcher')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS insight_render_events_run_idx
  ON greenhouse_insights.insight_render_events (render_run_id, created_at);

-- Append-only: se reutilizan los helpers que TASK-1845 ya dejó en el schema (no se duplican).
DROP TRIGGER IF EXISTS insight_render_runs_no_delete_trg ON greenhouse_insights.insight_render_runs;
CREATE TRIGGER insight_render_runs_no_delete_trg
  BEFORE DELETE ON greenhouse_insights.insight_render_runs
  FOR EACH ROW EXECUTE FUNCTION greenhouse_insights.assert_insights_no_delete();

DROP TRIGGER IF EXISTS insight_outputs_no_delete_trg ON greenhouse_insights.insight_outputs;
CREATE TRIGGER insight_outputs_no_delete_trg
  BEFORE DELETE ON greenhouse_insights.insight_outputs
  FOR EACH ROW EXECUTE FUNCTION greenhouse_insights.assert_insights_no_delete();

DROP TRIGGER IF EXISTS insight_render_events_no_delete_trg ON greenhouse_insights.insight_render_events;
CREATE TRIGGER insight_render_events_no_delete_trg
  BEFORE DELETE ON greenhouse_insights.insight_render_events
  FOR EACH ROW EXECUTE FUNCTION greenhouse_insights.assert_insights_no_delete();

DROP TRIGGER IF EXISTS insight_render_events_append_only_trg ON greenhouse_insights.insight_render_events;
CREATE TRIGGER insight_render_events_append_only_trg
  BEFORE UPDATE ON greenhouse_insights.insight_render_events
  FOR EACH ROW EXECUTE FUNCTION greenhouse_insights.assert_insights_append_only();

-- Anti pre-up-marker: si el Up no corrió de verdad, esto aborta en vez de registrar la migración
-- como aplicada en silencio (bug class de TASK-768 / ISSUE-068).
DO $$
DECLARE missing text := '';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_insights' AND table_name = 'insight_render_runs')
    THEN missing := missing || ' insight_render_runs'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_insights' AND table_name = 'insight_outputs')
    THEN missing := missing || ' insight_outputs'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_insights' AND table_name = 'insight_render_events')
    THEN missing := missing || ' insight_render_events'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_insights' AND indexname = 'insight_outputs_identity_uq')
    THEN missing := missing || ' insight_outputs_identity_uq'; END IF;

  IF missing <> '' THEN
    RAISE EXCEPTION 'TASK-1846 anti pre-up-marker check: faltan objetos:%', missing;
  END IF;
END
$$;

GRANT SELECT, INSERT, UPDATE ON greenhouse_insights.insight_render_runs TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_insights.insight_outputs TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_insights.insight_render_events TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_insights.insight_render_events_render_event_id_seq TO greenhouse_runtime;

-- Down Migration

-- SOLO undo. Igual que la migración de TASK-1845: el Down no toca catálogo, asignaciones ni
-- auditoría del módulo. greenhouse-pg-dev SIRVE PRODUCCIÓN pese al nombre (ISSUE-161), así que
-- correr este down es destructivo sobre producción y exige autorización explícita del operador.
DROP TRIGGER IF EXISTS insight_render_events_append_only_trg ON greenhouse_insights.insight_render_events;
DROP TRIGGER IF EXISTS insight_render_events_no_delete_trg ON greenhouse_insights.insight_render_events;
DROP TRIGGER IF EXISTS insight_outputs_no_delete_trg ON greenhouse_insights.insight_outputs;
DROP TRIGGER IF EXISTS insight_render_runs_no_delete_trg ON greenhouse_insights.insight_render_runs;
DROP TABLE IF EXISTS greenhouse_insights.insight_render_events;
DROP TABLE IF EXISTS greenhouse_insights.insight_outputs;
DROP TABLE IF EXISTS greenhouse_insights.insight_render_runs;
