-- Up Migration

-- TASK-1846 — un usuario cliente que encarga, reintenta o cancela un render quedaba auditado como
-- `system`: el CHECK de render no conocía `client_user`, aunque el resto de Insights (reportes,
-- ediciones, transiciones) sí lo usa desde TASK-1845. Hallazgo del benchmark de staging 2026-09-16.
-- EXPAND puro: sólo amplía el vocabulario permitido. Ninguna fila existente cambia.

ALTER TABLE greenhouse_insights.insight_render_runs
  DROP CONSTRAINT IF EXISTS insight_render_runs_requested_by_kind_check;

ALTER TABLE greenhouse_insights.insight_render_runs
  ADD CONSTRAINT insight_render_runs_requested_by_kind_check
  CHECK (requested_by_kind IN ('member', 'client_user', 'system', 'cli'));

ALTER TABLE greenhouse_insights.insight_render_events
  DROP CONSTRAINT IF EXISTS insight_render_events_actor_kind_check;

ALTER TABLE greenhouse_insights.insight_render_events
  ADD CONSTRAINT insight_render_events_actor_kind_check
  CHECK (actor_kind IN ('member', 'client_user', 'system', 'cli', 'worker', 'dispatcher'));

-- Anti pre-up-marker bug guard: los dos CHECK deben aceptar `client_user` de verdad.
DO $$
DECLARE runs_def text;
DECLARE events_def text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO runs_def FROM pg_constraint
   WHERE conname = 'insight_render_runs_requested_by_kind_check'
     AND conrelid = 'greenhouse_insights.insight_render_runs'::regclass;

  SELECT pg_get_constraintdef(oid) INTO events_def FROM pg_constraint
   WHERE conname = 'insight_render_events_actor_kind_check'
     AND conrelid = 'greenhouse_insights.insight_render_events'::regclass;

  IF runs_def IS NULL OR position('client_user' IN runs_def) = 0 THEN
    RAISE EXCEPTION 'TASK-1846 anti pre-up-marker check: insight_render_runs.requested_by_kind no acepta client_user';
  END IF;

  IF events_def IS NULL OR position('client_user' IN events_def) = 0 THEN
    RAISE EXCEPTION 'TASK-1846 anti pre-up-marker check: insight_render_events.actor_kind no acepta client_user';
  END IF;
END
$$;

-- Down Migration

-- Contract: sólo es seguro si ninguna fila usa `client_user` (si alguna lo usa, el ADD falla y el
-- down aborta sin perder datos). Contract DESPUÉS del release, nunca antes (instancia única).
ALTER TABLE greenhouse_insights.insight_render_events
  DROP CONSTRAINT IF EXISTS insight_render_events_actor_kind_check;

ALTER TABLE greenhouse_insights.insight_render_events
  ADD CONSTRAINT insight_render_events_actor_kind_check
  CHECK (actor_kind IN ('member', 'system', 'cli', 'worker', 'dispatcher'));

ALTER TABLE greenhouse_insights.insight_render_runs
  DROP CONSTRAINT IF EXISTS insight_render_runs_requested_by_kind_check;

ALTER TABLE greenhouse_insights.insight_render_runs
  ADD CONSTRAINT insight_render_runs_requested_by_kind_check
  CHECK (requested_by_kind IN ('member', 'system', 'cli'));
