-- Up Migration

-- TASK-773 Slice 1 — outbox_events state machine + concurrency-safe publisher columns.
--
-- Migra el contrato de greenhouse_sync.outbox_events para soportar el cutover
-- de Vercel cron outbox-publish hacia Cloud Scheduler + ops-worker. Hoy los
-- eventos transitan opacamente entre 'pending' y 'published'. Eso oculta:
--   - eventos en publishing in-flight (sin lock para concurrencia segura)
--   - eventos que fallaron BQ insert y deberian retry con backoff
--   - eventos dead-letter que requieren intervencion humana
--
-- Cambios:
--   1. 4 columnas nuevas (publishing_started_at, published_attempts,
--      last_publish_error, dead_letter_at).
--   2. CHECK constraint canonico sobre status: pending, publishing, published,
--      failed, dead_letter. NOT VALID + VALIDATE atomic protege contra filas
--      legacy con valores inesperados.
--   3. Index nuevo outbox_events_pending_publishing_idx para fetch eficiente
--      del worker (SELECT ... FOR UPDATE SKIP LOCKED ORDER BY occurred_at).
--
-- Backwards-compatible: el writer (publishOutboxEvent) sigue insertando con
-- status='pending' (default unchanged). Las nuevas columnas son nullable con
-- default 0/NULL. El reactive consumer sigue filtrando por status='published'
-- sin cambio.
--
-- Idempotencia: IF NOT EXISTS en columnas + index. CHECK constraint envuelta
-- en DO block que verifica su existencia antes de agregar.

-- 1. Columnas nuevas (idempotente)
ALTER TABLE greenhouse_sync.outbox_events
  ADD COLUMN IF NOT EXISTS publishing_started_at TIMESTAMPTZ;

ALTER TABLE greenhouse_sync.outbox_events
  ADD COLUMN IF NOT EXISTS published_attempts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE greenhouse_sync.outbox_events
  ADD COLUMN IF NOT EXISTS last_publish_error TEXT;

ALTER TABLE greenhouse_sync.outbox_events
  ADD COLUMN IF NOT EXISTS dead_letter_at TIMESTAMPTZ;

-- 2. CHECK constraint canonico (NOT VALID + VALIDATE atomic)
-- Patron TASK-708/728/766: agregamos NOT VALID primero (rapido, sin scan),
-- y luego VALIDATE en el mismo statement. Si filas legacy tienen valores
-- inesperados, VALIDATE falla y abortamos limpio sin dejar la constraint
-- en estado invalido.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'outbox_events_status_check'
      AND conrelid = 'greenhouse_sync.outbox_events'::regclass
  ) THEN
    ALTER TABLE greenhouse_sync.outbox_events
      ADD CONSTRAINT outbox_events_status_check
      CHECK (status IN ('pending', 'publishing', 'published', 'failed', 'dead_letter'))
      NOT VALID;

    ALTER TABLE greenhouse_sync.outbox_events
      VALIDATE CONSTRAINT outbox_events_status_check;
  END IF;
END $$;

-- 3. Index para worker fetch eficiente
-- Partial index sobre status IN ('pending', 'failed') ordered by occurred_at.
-- El worker usa SELECT ... FOR UPDATE SKIP LOCKED ORDER BY occurred_at ASC
-- y este index lo hace O(log n) en lugar de seq scan sobre toda la tabla.
CREATE INDEX IF NOT EXISTS outbox_events_pending_publishing_idx
  ON greenhouse_sync.outbox_events (occurred_at)
  WHERE status IN ('pending', 'failed');

-- 4. Comments documentales
COMMENT ON COLUMN greenhouse_sync.outbox_events.publishing_started_at IS
  'TASK-773 — timestamp del SELECT FOR UPDATE del worker. NULL excepto cuando status=publishing.';

COMMENT ON COLUMN greenhouse_sync.outbox_events.published_attempts IS
  'TASK-773 — contador de intentos de publish a BQ raw. Incrementa en cada failed; >= 5 dispara dead_letter.';

COMMENT ON COLUMN greenhouse_sync.outbox_events.last_publish_error IS
  'TASK-773 — ultimo error sanitizado del intento de publish (BQ insert error). Usar redactErrorForResponse antes de persistir.';

COMMENT ON COLUMN greenhouse_sync.outbox_events.dead_letter_at IS
  'TASK-773 — timestamp del dead-letter routing. NULL excepto cuando status=dead_letter.';

COMMENT ON CONSTRAINT outbox_events_status_check ON greenhouse_sync.outbox_events IS
  'TASK-773 state machine: pending -> publishing -> published/failed; failed (after maxRetries) -> dead_letter. Ver CLAUDE.md y EVENT_CATALOG_V1.';


-- Down Migration

-- Revert orden inverso: index -> constraint -> columns. Down NO revierte filas
-- con status=publishing/failed/dead_letter — quedarian invalidas en una v1
-- previa, pero ese caso solo aplica si se hace rollback luego del cutover Slice 5.
DROP INDEX IF EXISTS greenhouse_sync.outbox_events_pending_publishing_idx;

ALTER TABLE greenhouse_sync.outbox_events
  DROP CONSTRAINT IF EXISTS outbox_events_status_check;

ALTER TABLE greenhouse_sync.outbox_events
  DROP COLUMN IF EXISTS dead_letter_at,
  DROP COLUMN IF EXISTS last_publish_error,
  DROP COLUMN IF EXISTS published_attempts,
  DROP COLUMN IF EXISTS publishing_started_at;
