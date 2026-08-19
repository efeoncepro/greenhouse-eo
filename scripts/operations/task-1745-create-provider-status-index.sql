-- TASK-1745 — índice de lifecycle de proveedor sobre `email_deliveries`, fuera del runner
-- transaccional de node-pg-migrate.
--
-- Por qué no vive en la migración: `email_deliveries` es la tabla del correo global del portal.
-- Un `CREATE INDEX` no concurrente toma SHARE lock y bloquea todo INSERT/UPDATE de correo
-- mientras construye — incluidos los envíos a candidatos. CONCURRENTLY no puede correr dentro
-- de una transacción, y el runner de migraciones abre una.
--
-- Uso:  pnpm pg:connect:shell < scripts/operations/task-1745-create-provider-status-index.sql
-- Es idempotente y seguro de re-ejecutar.

SET lock_timeout = '2s';

-- 1) Validar los CHECK que la migración dejó NOT VALID. Acá sí compra algo: fuera de la
-- transacción del runner, VALIDATE toma SHARE UPDATE EXCLUSIVE y no bloquea lecturas ni
-- escrituras concurrentes. Dentro de la migración habría corrido bajo el ACCESS EXCLUSIVE
-- que el ADD CONSTRAINT retiene hasta el COMMIT.
ALTER TABLE greenhouse_notifications.email_deliveries
  VALIDATE CONSTRAINT email_deliveries_provider_status_check;

ALTER TABLE greenhouse_notifications.email_deliveries
  VALIDATE CONSTRAINT email_deliveries_provider_status_source_check;

-- 2) Un CREATE INDEX CONCURRENTLY interrumpido deja el índice EXISTENTE pero INVÁLIDO, y
-- PostgreSQL no lo usa. `IF NOT EXISTS` lo saltaría en silencio en el reintento, dejando el seq
-- scan permanente sobre la tabla de correo global. Se detecta antes de intentar crearlo.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_index i
    JOIN pg_class c ON c.oid = i.indexrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'greenhouse_notifications'
      AND c.relname = 'idx_email_deliveries_provider_status'
      AND NOT i.indisvalid
  ) THEN
    RAISE EXCEPTION 'El índice existe pero está INVÁLIDO (CONCURRENTLY interrumpido). Ejecuta primero: DROP INDEX CONCURRENTLY greenhouse_notifications.idx_email_deliveries_provider_status;';
  END IF;
END
$$;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_deliveries_provider_status
  ON greenhouse_notifications.email_deliveries (provider_status, provider_event_created_at DESC)
  WHERE provider_status IS NOT NULL;

-- 3) Readback obligatorio: un CREATE INDEX CONCURRENTLY interrumpido deja el índice INVÁLIDO y
-- PostgreSQL NO lo usa, en silencio. `valid` y `ready` deben ser ambos true.
SELECT
  i.indexrelid::regclass AS index_name,
  i.indisvalid           AS valid,
  i.indisready           AS ready
FROM pg_index i
WHERE i.indexrelid = 'greenhouse_notifications.idx_email_deliveries_provider_status'::regclass;

-- Y que los dos CHECK quedaran validados (`convalidated = true`), que es lo que la migración
-- deliberadamente NO pudo exigir.
SELECT conname, convalidated
FROM pg_constraint
WHERE conrelid = 'greenhouse_notifications.email_deliveries'::regclass
  AND conname IN ('email_deliveries_provider_status_check',
                  'email_deliveries_provider_status_source_check');
