-- Up Migration

-- TASK-1846 Slice 2 — lease + fencing del motor de render.
--
-- POR QUÉ VAN JUNTOS (no es preferencia de estilo):
--   Hoy el claim es atómico (`FOR UPDATE SKIP LOCKED`) pero NADA re-reclama un job que quedó en
--   `running`: un worker muerto lo deja colgado para siempre. Al agregar el reclamo por lease
--   vencido aparece un hazard que hoy NO existe: worker A vivo pero lento pierde su lease, worker B
--   retoma, y ambos finalizan ⇒ dos outputs finales para una edición. El fence token es el candado:
--   finalizar exige `fence_token = <el mío>`, y el de A quedó viejo. Separar lease de fencing
--   abriría esa ventana.
--
-- ADDITIVE Y COMPARTIDO: las columnas entran en los DOS consumers para que el mecanismo sea UNO,
-- pero el reclamo de Proposal queda APAGADO tras su flag. Lo intocado de Proposal es su
-- COMPORTAMIENTO, no el archivo (la task autoriza un adapter compatible sobre su store).
-- Nullable + DEFAULT: ninguna fila existente cambia de semántica.

ALTER TABLE greenhouse_insights.insight_outputs
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz,
  -- Monotónico por fila. Sube en CADA claim; finalizar con un token viejo no escribe nada.
  ADD COLUMN IF NOT EXISTS fence_token bigint NOT NULL DEFAULT 0;

ALTER TABLE greenhouse_commercial.proposal_render_jobs
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS fence_token bigint NOT NULL DEFAULT 0;

-- Un output/job en `running` SIN lease es el estado legado (el que queda colgado para siempre).
-- No se prohíbe por CHECK: las filas históricas lo tienen y reescribirlas sería mentir sobre su
-- historia. El detector de huérfanos del Slice 3 los encuentra por `lease_expires_at IS NULL`.
CREATE INDEX IF NOT EXISTS insight_outputs_reclaim_idx
  ON greenhouse_insights.insight_outputs (state, lease_expires_at)
  WHERE state = 'running';

CREATE INDEX IF NOT EXISTS proposal_render_jobs_reclaim_idx
  ON greenhouse_commercial.proposal_render_jobs (state, lease_expires_at)
  WHERE state = 'running';

DO $$
DECLARE missing text := '';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_insights' AND table_name = 'insight_outputs'
      AND column_name = 'fence_token') THEN missing := missing || ' insight_outputs.fence_token'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_insights' AND table_name = 'insight_outputs'
      AND column_name = 'lease_expires_at') THEN missing := missing || ' insight_outputs.lease_expires_at'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_commercial' AND table_name = 'proposal_render_jobs'
      AND column_name = 'fence_token') THEN missing := missing || ' proposal_render_jobs.fence_token'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_commercial' AND table_name = 'proposal_render_jobs'
      AND column_name = 'lease_expires_at') THEN missing := missing || ' proposal_render_jobs.lease_expires_at'; END IF;

  IF missing <> '' THEN
    RAISE EXCEPTION 'TASK-1846 Slice 2 anti pre-up-marker check: faltan columnas:%', missing;
  END IF;
END
$$;

-- Down Migration

-- SOLO undo. greenhouse-pg-dev SIRVE PRODUCCIÓN pese al nombre (ISSUE-161): correr esto es
-- destructivo sobre producción y exige autorización explícita del operador.
DROP INDEX IF EXISTS greenhouse_commercial.proposal_render_jobs_reclaim_idx;
DROP INDEX IF EXISTS greenhouse_insights.insight_outputs_reclaim_idx;
ALTER TABLE greenhouse_commercial.proposal_render_jobs
  DROP COLUMN IF EXISTS fence_token,
  DROP COLUMN IF EXISTS lease_expires_at;
ALTER TABLE greenhouse_insights.insight_outputs
  DROP COLUMN IF EXISTS fence_token,
  DROP COLUMN IF EXISTS lease_expires_at;
