-- Up Migration

-- TASK-1302 — Materialización diaria de Google Search Console.
--
-- Convierte GSC de read-through (Google retiene 16 meses y muestrea) en una serie
-- temporal propia. Cada fila es la medición de un día para (query, page).
--
-- ⚠️ ANCLAJE A LA ORGANIZACIÓN, NO AL `seo_target` — decisión de TASK-1302, no accidente:
--   1. GRANO DE LA FUENTE. GSC entrega datos por *propiedad verificada*, y esa propiedad
--      vive en `search_console_connections` con `organization_id` UNIQUE. `seo_targets`
--      tiene grano MÁS FINO (incluye `location_code` + `language_code`, dimensiones que
--      GSC no particiona): FKear al target obligaría a asignar cada fila arbitrariamente
--      a uno de varios targets posibles. Eso es un error de modelado.
--   2. MEDICIÓN ≠ CONFIGURACIÓN. `seo_targets` es config mutable; esta serie es medición
--      permanente e irreemplazable (pasada la ventana de 16 meses de Google, el dato NO
--      se puede reconstruir). Atar su lifetime al de una config archivable la pondría en
--      riesgo de quedar huérfana — o de no poder escribirse mientras no exista un target.
--   3. ANCLA CANÓNICA DEL 360. `Cliente` ancla en `greenhouse_core.organizations`.
-- `site_url` se conserva como procedencia (`sc-domain:x.com` o `https://x.com/`) para que
-- un cambio de propiedad GSC quede visible en el dato y no se confunda con una caída.
CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_gsc_daily (
  gsc_daily_id    TEXT PRIMARY KEY DEFAULT ('seogd-' || gen_random_uuid()::text),
  organization_id TEXT NOT NULL
    REFERENCES greenhouse_core.organizations (organization_id) ON DELETE RESTRICT,
  site_url        TEXT NOT NULL,
  capture_date    DATE NOT NULL,
  query           TEXT NOT NULL,
  page            TEXT NOT NULL,
  clicks          INTEGER NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  impressions     INTEGER NOT NULL DEFAULT 0 CHECK (impressions >= 0),
  ctr             NUMERIC(9, 6) NOT NULL DEFAULT 0 CHECK (ctr >= 0),
  position        NUMERIC(9, 4) NOT NULL CHECK (position > 0),
  materialized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT seo_gsc_daily_capture_unique
    UNIQUE (organization_id, capture_date, query, page)
);

-- Lectura canónica del reader de oportunidades: ventana reciente por org.
CREATE INDEX IF NOT EXISTS seo_gsc_daily_org_date_idx
  ON greenhouse_growth.seo_gsc_daily (organization_id, capture_date DESC);

-- Agregación por query dentro de la ventana (striking-distance + canibalización).
CREATE INDEX IF NOT EXISTS seo_gsc_daily_org_query_date_idx
  ON greenhouse_growth.seo_gsc_daily (organization_id, query, capture_date DESC);

-- No-delete: reusa la función genérica de TASK-1299 (TG_TABLE_NAME/TG_OP), no crea otra.
-- ⚠️ Bloquea DELETE pero NO UPDATE, a diferencia de las otras tablas de medición: GSC
-- consolida sus métricas con hasta ~48h de retraso, así que re-materializar un día ya
-- capturado DEBE poder corregir el valor (UPSERT idempotente). Bloquear UPDATE dejaría la
-- serie congelada en la primera lectura, que es justamente la menos exacta.
DROP TRIGGER IF EXISTS trg_seo_gsc_daily_no_delete ON greenhouse_growth.seo_gsc_daily;
CREATE TRIGGER trg_seo_gsc_daily_no_delete
  BEFORE DELETE ON greenhouse_growth.seo_gsc_daily
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_seo_row_mutation();

-- Anti pre-up-marker guard (CLAUDE.md §Database — Migration markers).
DO $$
DECLARE
  table_exists      boolean;
  unique_exists     boolean;
  trigger_exists    boolean;
  capture_date_type text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_growth' AND table_name = 'seo_gsc_daily'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-1302 anti pre-up-marker check: greenhouse_growth.seo_gsc_daily NO fue creada. Los markers pueden estar invertidos.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seo_gsc_daily_capture_unique'
  ) INTO unique_exists;

  IF NOT unique_exists THEN
    RAISE EXCEPTION 'TASK-1302: falta seo_gsc_daily_capture_unique — sin esa UNIQUE el cron duplicaria filas en cada re-run.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_seo_gsc_daily_no_delete'
  ) INTO trigger_exists;

  IF NOT trigger_exists THEN
    RAISE EXCEPTION 'TASK-1302: falta trg_seo_gsc_daily_no_delete — la serie dejaria de ser append-only.';
  END IF;

  -- Guard de la bug class DATE-vs-TIMESTAMP (CLAUDE.md §SQL embebido / date-math):
  -- con capture_date TIMESTAMP, `EXTRACT(EPOCH FROM (a - b))` compila y revienta en runtime.
  SELECT data_type INTO capture_date_type
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_growth'
    AND table_name = 'seo_gsc_daily'
    AND column_name = 'capture_date';

  IF capture_date_type IS DISTINCT FROM 'date' THEN
    RAISE EXCEPTION 'TASK-1302: seo_gsc_daily.capture_date debe ser DATE, es %.', capture_date_type;
  END IF;
END
$$;

-- GRANTs least-privilege. Clase "medición": el runtime nunca borra historia.
-- UPDATE sí se otorga porque el UPSERT idempotente corrige el consolidado tardío de GSC.
ALTER TABLE greenhouse_growth.seo_gsc_daily OWNER TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.seo_gsc_daily TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.seo_gsc_daily TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.seo_gsc_daily TO greenhouse_migrator_user;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_growth.seo_gsc_daily;
