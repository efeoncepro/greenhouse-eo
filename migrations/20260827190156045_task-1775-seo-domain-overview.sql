-- Up Migration

-- TASK-1775 — Foto de dominio + trayectoria competitiva (DataForSEO Labs).
--
-- Abre el sujeto DOMINIO, que el módulo no sabía describir: authority-por-posiciones, tráfico
-- orgánico estimado, conteo de keywords ranqueadas y su trayectoria en el tiempo — del cliente
-- Y de sus competidores. Tres productores escriben acá (mismo patrón multi-productor de
-- `seo_keyword_market_data`, TASK-1661):
--   1. `domain_rank_overview` — la foto mensual completa (distribución de posiciones + ETV +
--      count + costo estimado del tráfico, orgánico y pago).
--   2. `historical_rank_overview` — el backfill de UNA sola vez por sujeto (cuesta 10× el resto
--      de Labs): una fila por mes histórico, capture_date = primer día del mes.
--   3. `bulk_traffic_estimation` — screening barato de cartera: sólo ETV + count, el resto NULL.
--
-- ⚠️ POR QUÉ `organization_id` NO ESTÁ EN LA CLAVE ÚNICA.
--
-- El authority y el tráfico estimado de `competidor.cl` en un mercado son el mismo hecho para
-- toda la cartera: un competidor puede ser cliente de otra org, o competidor compartido de dos.
-- Con la clave sin org, la segunda captura del mes NO gasta. `captured_by_organization_id` es
-- ATRIBUCIÓN (quién pagó), no aislamiento de tenant.
--
-- La dirección es la REVERSIBLE: `UNIQUE (dominio, país, idioma, fecha)` es MÁS ESTRICTA que la
-- que incluye la org. Si algún día hay que aislar por org, relajar la clave es seguro (toda fila
-- existente la satisface); al revés habría que borrar duplicados de una tabla append-only.
-- 🔴 `captured_by_organization_id` NUNCA viaja en un DTO client-facing: por frescura se podría
-- inferir qué dominios sigue otra organización.
--
-- ⚠️ `location_code` es TEXT — espeja `seo_targets.location_code` (text en PG real); la
-- conversión a número ocurre SOLO en la frontera del proveedor.
--
-- ⚠️ `NULL` ≠ `0`. Un sujeto que el proveedor NO conoce se escribe con métricas NULL: "se
-- preguntó y no había dato" es un hecho con fecha, y sin esa fila el pre-check de frescura
-- re-compraría el sujeto en cada corrida, para siempre (bug de costo del smoke de TASK-1661).
--
-- ⚠️ `etv` es *estimated traffic volume* (tráfico mensual estimado, lente ◑), NO dólares. El
-- USD es `estimated_paid_traffic_cost` (lo que costaría comprar ese tráfico en Ads).
CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_domain_overview_snapshots (
  domain_overview_id          TEXT PRIMARY KEY DEFAULT ('seodov-' || gen_random_uuid()::text),

  -- Identidad del hecho. `normalized_domain` (lowercase, sin esquema/`www.`/path) es la clave
  -- de join; `domain` guarda el texto tal como se consultó, para auditar la normalización.
  normalized_domain           TEXT NOT NULL CHECK (length(normalized_domain) BETWEEN 1 AND 255),
  domain                      TEXT NOT NULL CHECK (length(domain) BETWEEN 1 AND 255),
  location_code               TEXT NOT NULL,
  language_code               TEXT NOT NULL,
  capture_date                DATE NOT NULL,

  -- Procedencia: qué productor escribió la fila (screening puebla menos columnas que la foto).
  source_endpoint             TEXT NOT NULL
    CHECK (source_endpoint IN (
      'domain_rank_overview',
      'historical_rank_overview',
      'bulk_traffic_estimation'
    )),

  -- ── Métricas orgánicas (lente ◑, todas NULLABLE a propósito) ──────────────────────────────
  -- Distribución de posiciones: cuántas keywords ranquea el dominio en cada banda del top-100.
  organic_pos_1               INTEGER CHECK (organic_pos_1 IS NULL OR organic_pos_1 >= 0),
  organic_pos_2_3             INTEGER CHECK (organic_pos_2_3 IS NULL OR organic_pos_2_3 >= 0),
  organic_pos_4_10            INTEGER CHECK (organic_pos_4_10 IS NULL OR organic_pos_4_10 >= 0),
  organic_pos_11_20           INTEGER CHECK (organic_pos_11_20 IS NULL OR organic_pos_11_20 >= 0),
  organic_pos_21_30           INTEGER CHECK (organic_pos_21_30 IS NULL OR organic_pos_21_30 >= 0),
  organic_pos_31_40           INTEGER CHECK (organic_pos_31_40 IS NULL OR organic_pos_31_40 >= 0),
  organic_pos_41_50           INTEGER CHECK (organic_pos_41_50 IS NULL OR organic_pos_41_50 >= 0),
  organic_pos_51_60           INTEGER CHECK (organic_pos_51_60 IS NULL OR organic_pos_51_60 >= 0),
  organic_pos_61_70           INTEGER CHECK (organic_pos_61_70 IS NULL OR organic_pos_61_70 >= 0),
  organic_pos_71_80           INTEGER CHECK (organic_pos_71_80 IS NULL OR organic_pos_71_80 >= 0),
  organic_pos_81_90           INTEGER CHECK (organic_pos_81_90 IS NULL OR organic_pos_81_90 >= 0),
  organic_pos_91_100          INTEGER CHECK (organic_pos_91_100 IS NULL OR organic_pos_91_100 >= 0),
  -- Total de SERPs del top-100 donde aparece el dominio = "keywords ranqueadas".
  organic_count               INTEGER CHECK (organic_count IS NULL OR organic_count >= 0),
  -- Estimated traffic volume: CTR × volumen de cada keyword ranqueada. Tráfico, NO dólares.
  organic_etv                 NUMERIC(14, 2) CHECK (organic_etv IS NULL OR organic_etv >= 0),
  -- Lo que costaría comprar ese tráfico orgánico en Ads (USD/mes). Este SÍ es dólares.
  organic_estimated_paid_traffic_cost NUMERIC(14, 2)
    CHECK (organic_estimated_paid_traffic_cost IS NULL OR organic_estimated_paid_traffic_cost >= 0),
  -- Momentum vs snapshot anterior de la base del proveedor.
  organic_is_new              INTEGER CHECK (organic_is_new IS NULL OR organic_is_new >= 0),
  organic_is_up               INTEGER CHECK (organic_is_up IS NULL OR organic_is_up >= 0),
  organic_is_down             INTEGER CHECK (organic_is_down IS NULL OR organic_is_down >= 0),
  organic_is_lost             INTEGER CHECK (organic_is_lost IS NULL OR organic_is_lost >= 0),

  -- ── Métricas pagas (mismas unidades) ──────────────────────────────────────────────────────
  paid_count                  INTEGER CHECK (paid_count IS NULL OR paid_count >= 0),
  paid_etv                    NUMERIC(14, 2) CHECK (paid_etv IS NULL OR paid_etv >= 0),
  paid_estimated_paid_traffic_cost NUMERIC(14, 2)
    CHECK (paid_estimated_paid_traffic_cost IS NULL OR paid_estimated_paid_traffic_cost >= 0),

  captured_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Atribución de gasto (procedencia, NUNCA presupuesto — eso vive en seo_provider_spend_daily).
  captured_by_organization_id TEXT NOT NULL
    REFERENCES greenhouse_core.organizations (organization_id) ON DELETE RESTRICT,
  provider_cost               NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (provider_cost >= 0),

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Idempotencia: una captura por dominio+mercado+día, SIN organización (ver arriba). Las filas
  -- del backfill histórico usan capture_date = primer día del mes histórico y conviven en la
  -- misma clave; `ON CONFLICT DO NOTHING` es la guardia de carrera entre productores.
  CONSTRAINT seo_domain_overview_capture_unique
    UNIQUE (normalized_domain, location_code, language_code, capture_date)
);

-- Lectura canónica del reader: la serie de un dominio en un mercado, más reciente primero.
CREATE INDEX IF NOT EXISTS seo_domain_overview_lookup_idx
  ON greenhouse_growth.seo_domain_overview_snapshots
     (normalized_domain, location_code, language_code, capture_date DESC);

-- Atribución: qué capturó cada org y cuándo (auditoría de gasto).
CREATE INDEX IF NOT EXISTS seo_domain_overview_org_date_idx
  ON greenhouse_growth.seo_domain_overview_snapshots
     (captured_by_organization_id, capture_date DESC);

-- Append-only: reusa la función genérica de TASK-1299. Un refetch AGREGA captura; jamás
-- sobrescribe — la serie histórica es la trayectoria que esta task existe para mostrar.
DROP TRIGGER IF EXISTS trg_seo_domain_overview_append_only
  ON greenhouse_growth.seo_domain_overview_snapshots;
CREATE TRIGGER trg_seo_domain_overview_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_growth.seo_domain_overview_snapshots
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_seo_row_mutation();

-- Anti pre-up-marker guard (CLAUDE.md §Database — Migration markers / ISSUE-068).
DO $$
DECLARE
  table_exists        boolean;
  unique_exists       boolean;
  trigger_exists      boolean;
  capture_date_type   text;
  location_code_type  text;
  etv_nullable        text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_growth' AND table_name = 'seo_domain_overview_snapshots'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-1775 anti pre-up-marker check: greenhouse_growth.seo_domain_overview_snapshots NO fue creada. Los markers pueden estar invertidos.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seo_domain_overview_capture_unique'
  ) INTO unique_exists;

  IF NOT unique_exists THEN
    RAISE EXCEPTION 'TASK-1775: falta seo_domain_overview_capture_unique — sin esa UNIQUE un re-run del mismo dia insertaria capturas duplicadas y el pre-check de frescura gastaria de nuevo.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_seo_domain_overview_append_only' AND NOT tgisinternal
  ) INTO trigger_exists;

  IF NOT trigger_exists THEN
    RAISE EXCEPTION 'TASK-1775: falta el trigger append-only — sin el, un UPDATE sobrescribiria la captura anterior y se perderia la trayectoria.';
  END IF;

  -- Guard de la bug class DATE-vs-TIMESTAMP (CLAUDE.md §SQL embebido / date-math).
  SELECT data_type INTO capture_date_type
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_growth'
    AND table_name = 'seo_domain_overview_snapshots'
    AND column_name = 'capture_date';

  IF capture_date_type IS DISTINCT FROM 'date' THEN
    RAISE EXCEPTION 'TASK-1775: capture_date debe ser DATE, es %.', capture_date_type;
  END IF;

  -- `location_code` DEBE espejar seo_targets.location_code (text): si nace integer, todo JOIN
  -- con el target falla o castea en silencio.
  SELECT data_type INTO location_code_type
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_growth'
    AND table_name = 'seo_domain_overview_snapshots'
    AND column_name = 'location_code';

  IF location_code_type IS DISTINCT FROM 'text' THEN
    RAISE EXCEPTION 'TASK-1775: location_code debe ser TEXT para espejar seo_targets.location_code, es %.', location_code_type;
  END IF;

  -- `NULL` != `0`: si organic_etv naciera NOT NULL, "el proveedor no conoce el dominio" se
  -- volveria indistinguible de "dominio sin trafico" y el sujeto se re-compraria para siempre.
  SELECT is_nullable INTO etv_nullable
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_growth'
    AND table_name = 'seo_domain_overview_snapshots'
    AND column_name = 'organic_etv';

  IF etv_nullable IS DISTINCT FROM 'YES' THEN
    RAISE EXCEPTION 'TASK-1775: organic_etv debe ser NULLABLE — NULL significa "el proveedor no tiene el sujeto", 0 significa "sin trafico estimado".';
  END IF;
END
$$;

-- GRANTs least-privilege. El runtime SOLO lee e inserta: la tabla es append-only, asi que no
-- necesita UPDATE (el trigger lo bloquearia igual) ni DELETE (borrar una captura destruiria la
-- evidencia de un gasto ya incurrido).
ALTER TABLE greenhouse_growth.seo_domain_overview_snapshots OWNER TO greenhouse_ops;
GRANT SELECT, INSERT ON greenhouse_growth.seo_domain_overview_snapshots TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_growth.seo_domain_overview_snapshots TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.seo_domain_overview_snapshots TO greenhouse_migrator_user;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_growth.seo_domain_overview_snapshots;
