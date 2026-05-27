-- Up Migration
-- TASK-937 Slice 2b — Índice parcial para el heartbeat del AI Observer.
--
-- El reader del signal `reliability.ai_observer.unhealthy` consulta
-- `source_sync_runs WHERE source_system='reliability_ai_observer' ORDER BY
-- started_at DESC LIMIT N`. Sin índice = seq scan sobre toda la tabla de sync
-- runs (todos los source_system: notion, nubox, reactive_worker, etc.).
--
-- Mirror exacto del patrón `idx_source_sync_runs_reactive_worker`
-- (migration 20260405192804520). Reusa el primitivo canónico source_sync_runs;
-- NO crea tabla nueva (SSOT, extend-don't-parallel).

CREATE INDEX IF NOT EXISTS idx_source_sync_runs_reliability_ai_observer
  ON greenhouse_sync.source_sync_runs (source_system, started_at DESC)
  WHERE source_system = 'reliability_ai_observer';

-- Anti pre-up-marker guard: aborta si el índice no quedó creado.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_sync'
      AND indexname = 'idx_source_sync_runs_reliability_ai_observer'
  ) THEN
    RAISE EXCEPTION 'TASK-937 anti pre-up-marker: idx_source_sync_runs_reliability_ai_observer was NOT created.';
  END IF;
END
$$;

-- Down Migration
DROP INDEX IF EXISTS greenhouse_sync.idx_source_sync_runs_reliability_ai_observer;
