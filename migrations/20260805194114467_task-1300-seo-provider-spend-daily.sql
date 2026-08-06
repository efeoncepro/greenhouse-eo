-- Up Migration

-- TASK-1300 — Ledger de gasto DataForSEO por organización, familia y día.
--
-- Es el dato que `enforceSeoRunEntitlement` (TASK-1301) consume como gate de presupuesto:
-- el costo del proveedor es el riesgo #1 de escalabilidad del módulo SEO, así que tiene que
-- ser observable y presupuestable ANTES de que exista el primer cron de captura.
--
-- ⚠️ Por qué existe además del `provider_cost` de las tablas snapshot de TASK-1299:
--   1. COBERTURA. El snapshot sólo registra costo si el caller persiste una fila. Este
--      contador lo escribe el TRANSPORTE en cada llamada cobrada, así que una captura nueva
--      no puede gastar sin quedar contabilizada por haber olvidado el registro.
--   2. GRANO POR FAMILIA. Permite ver y aislar el gasto de `labs`/`onpage`/`backlinks`/
--      `domain` por separado — las snapshot tables no distinguen qué familia lo generó.
--   3. LLAMADAS SIN FILA. Un `on_page` que crea una tarea async, o una consulta que devuelve
--      cero resultados, igual se cobran; sin este ledger ese gasto sería invisible.
--
-- ⚠️ FUENTE ÚNICA DE PRESUPUESTO. Al existir este ledger, `enforceSeoRunEntitlement` pasa a
-- leer SÓLO de acá (cambio incluido en esta task). Sumar también el `provider_cost` de los
-- snapshots contaría el mismo gasto DOS VECES y agotaría los presupuestos a la mitad, en
-- silencio. El `provider_cost` de los snapshots queda como procedencia por fila, no como
-- fuente de presupuesto.
CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_provider_spend_daily (
  spend_id          TEXT PRIMARY KEY DEFAULT ('seosp-' || gen_random_uuid()::text),
  organization_id   TEXT NOT NULL
    REFERENCES greenhouse_core.organizations (organization_id) ON DELETE RESTRICT,
  family            TEXT NOT NULL
    CHECK (family IN ('serp', 'labs', 'backlinks', 'onpage', 'domain')),
  spend_date        DATE NOT NULL,
  call_count        INTEGER NOT NULL DEFAULT 0 CHECK (call_count >= 0),
  provider_cost_usd NUMERIC(14, 6) NOT NULL DEFAULT 0 CHECK (provider_cost_usd >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT seo_provider_spend_daily_unique
    UNIQUE (organization_id, family, spend_date)
);

-- Lectura canónica del gate de presupuesto: gasto del mes por organización.
CREATE INDEX IF NOT EXISTS seo_provider_spend_daily_org_date_idx
  ON greenhouse_growth.seo_provider_spend_daily (organization_id, spend_date DESC);

-- El CHECK de `family` duplica a propósito el allowlist del registry TS.
--
-- ⚠️ NO basta como defensa por sí solo: si el TS agrega una familia sin migrar el CHECK, el
-- INSERT del contador falla pero el transporte NO invalida un resultado que el proveedor ya
-- cobró (lo observa y sigue) — así que el gasto sería real y el contador quedaría en cero
-- para esa familia, indefinidamente. Por eso el drift lo cierra un test que rompe el build:
-- `src/lib/ai/__tests__/dataforseo-family-check-parity.test.ts` compara este CHECK contra
-- `DATAFORSEO_FAMILY_NAMES`. El CHECK es la segunda capa, no la primera.

-- Anti pre-up-marker guard (CLAUDE.md §Database — Migration markers).
DO $$
DECLARE
  table_exists    boolean;
  unique_exists   boolean;
  family_check    boolean;
  spend_date_type text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_growth' AND table_name = 'seo_provider_spend_daily'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-1300 anti pre-up-marker check: greenhouse_growth.seo_provider_spend_daily NO fue creada. Los markers pueden estar invertidos.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seo_provider_spend_daily_unique'
  ) INTO unique_exists;

  IF NOT unique_exists THEN
    RAISE EXCEPTION 'TASK-1300: falta seo_provider_spend_daily_unique — sin esa UNIQUE el UPSERT del contador insertaria filas duplicadas en vez de acumular.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'greenhouse_growth.seo_provider_spend_daily'::regclass AND contype = 'c' AND conname LIKE '%family%'
  ) INTO family_check;

  IF NOT family_check THEN
    RAISE EXCEPTION 'TASK-1300: falta el CHECK de family — el allowlist de familias quedaria sin defensa en la base.';
  END IF;

  -- Guard de la bug class DATE-vs-TIMESTAMP (CLAUDE.md §SQL embebido / date-math).
  SELECT data_type INTO spend_date_type
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_growth'
    AND table_name = 'seo_provider_spend_daily'
    AND column_name = 'spend_date';

  IF spend_date_type IS DISTINCT FROM 'date' THEN
    RAISE EXCEPTION 'TASK-1300: seo_provider_spend_daily.spend_date debe ser DATE, es %.', spend_date_type;
  END IF;
END
$$;

-- GRANTs least-privilege. El runtime necesita UPDATE porque el contador acumula por UPSERT;
-- nunca DELETE: borrar gasto ya incurrido falsearía el presupuesto.
ALTER TABLE greenhouse_growth.seo_provider_spend_daily OWNER TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.seo_provider_spend_daily TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.seo_provider_spend_daily TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.seo_provider_spend_daily TO greenhouse_migrator_user;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_growth.seo_provider_spend_daily;
