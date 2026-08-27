-- Up Migration

-- TASK-1776 — Visibilidad de mercado por URL / subdominio / subcarpeta (DataForSEO Labs).
--
-- Abre el sujeto PÁGINA, que el módulo no sabía describir: qué keywords ranquea una URL (propia
-- o de un competidor), qué páginas concentran el tráfico de un dominio y cuál de sus subdominios
-- pesa. Lo que Semrush vende como tres áreas (`url_research` / `subdomain_research` /
-- `subfolder_research`) es en DataForSEO UN endpoint (`ranked_keywords`) con el `target`
-- cambiado: por eso hay UNA tabla con `subject_kind` bajo CHECK cerrado, no tres.
--
-- Productores (todos comparten el writer `persistUrlVisibilitySnapshots`):
--   1. `ranked_keywords` — la foto del sujeto declarado (cualquier clase), con el agregado
--      `metrics` del proveedor (que cubre el SET COMPLETO independiente del `limit`) + el
--      detalle top-N en `top_keywords` JSONB.
--   2. `relevant_pages` — las páginas que concentran el tráfico de un dominio: cada página
--      devuelta se persiste como fila `subject_kind='url'`.
--   3. `subdomains` — ídem con filas `subject_kind='subdomain'`.
--
-- ⚠️ CLAVE ÚNICA SOBRE EL SUJETO NORMALIZADO, no el texto crudo. `https://ejemplo.cl/guia`,
-- `ejemplo.cl/guia/` y `www.ejemplo.cl/guia?utm=x` son la misma página para el negocio; como
-- TEXT crudo serían tres filas, tres pre-checks fallando y tres compras del mismo dato. La
-- normalización vive en `resolveVisibilitySubject` (url-visibility/resolve-subject.ts) y va
-- PRIMERO en el orden de slices justamente porque esta clave depende de ella.
--
-- ⚠️ `organization_id` NO está en la clave (mismo contrato multi-productor de
-- `seo_keyword_market_data` y `seo_domain_overview_snapshots`): lo que dice el SERP sobre una
-- página es el mismo hecho para toda la cartera. `captured_by_organization_id` es atribución
-- de quién pagó y 🔴 NUNCA viaja en un DTO client-facing.
--
-- ⚠️ `NULL` ≠ `0`. Un sujeto que el proveedor no conoce se escribe con métricas NULL — sin esa
-- fila el pre-check de frescura lo re-compraría en cada corrida, para siempre (TASK-1661).
CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_url_visibility_snapshots (
  url_visibility_id           TEXT PRIMARY KEY DEFAULT ('seouvs-' || gen_random_uuid()::text),

  -- Identidad del hecho. `normalized_subject` es la clave (sin esquema, sin www salvo
  -- subdominio literal, sin trailing slash, sin query salvo declaración explícita);
  -- `raw_subject` conserva lo pedido para auditar la normalización.
  subject_kind                TEXT NOT NULL
    CHECK (subject_kind IN ('domain', 'subdomain', 'subfolder', 'url')),
  normalized_subject          TEXT NOT NULL CHECK (length(normalized_subject) BETWEEN 1 AND 512),
  raw_subject                 TEXT NOT NULL CHECK (length(raw_subject) BETWEEN 1 AND 1024),
  location_code               TEXT NOT NULL,
  language_code               TEXT NOT NULL,
  capture_date                DATE NOT NULL,

  -- Procedencia: qué productor escribió la fila.
  source_endpoint             TEXT NOT NULL
    CHECK (source_endpoint IN ('ranked_keywords', 'relevant_pages', 'subdomains')),

  -- ── Métricas orgánicas (lente ◑, todas NULLABLE) — mismo shape que la foto de dominio ────
  -- Del agregado `metrics` del proveedor: cubre el set COMPLETO del sujeto, no sólo las filas
  -- devueltas (el `limit` acota el detalle, no la foto).
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
  organic_count               INTEGER CHECK (organic_count IS NULL OR organic_count >= 0),
  -- Estimated traffic VOLUME (tráfico mensual estimado). NO son dólares ni visitas medidas.
  organic_etv                 NUMERIC(14, 2) CHECK (organic_etv IS NULL OR organic_etv >= 0),
  organic_estimated_paid_traffic_cost NUMERIC(14, 2)
    CHECK (organic_estimated_paid_traffic_cost IS NULL OR organic_estimated_paid_traffic_cost >= 0),
  organic_is_new              INTEGER CHECK (organic_is_new IS NULL OR organic_is_new >= 0),
  organic_is_up               INTEGER CHECK (organic_is_up IS NULL OR organic_is_up >= 0),
  organic_is_down             INTEGER CHECK (organic_is_down IS NULL OR organic_is_down >= 0),
  organic_is_lost             INTEGER CHECK (organic_is_lost IS NULL OR organic_is_lost >= 0),

  paid_count                  INTEGER CHECK (paid_count IS NULL OR paid_count >= 0),
  paid_etv                    NUMERIC(14, 2) CHECK (paid_etv IS NULL OR paid_etv >= 0),

  -- Total de keywords ranqueadas del sujeto según el proveedor (`total_count`): el universo,
  -- del que `top_keywords` es sólo el detalle comprado.
  total_ranked_keywords       INTEGER CHECK (total_ranked_keywords IS NULL OR total_ranked_keywords >= 0),

  -- Detalle top-N comprado (sólo `ranked_keywords`): [{ keyword, position, url, searchVolume,
  -- etv }] acotado por el knob de limit. Es EVIDENCIA de la corrida, no un almacén de mercado:
  -- el `keyword_info` completo va a `seo_keyword_market_data` vía el writer compartido.
  top_keywords                JSONB,

  captured_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  captured_by_organization_id TEXT NOT NULL
    REFERENCES greenhouse_core.organizations (organization_id) ON DELETE RESTRICT,
  provider_cost               NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (provider_cost >= 0),

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Idempotencia: una captura por sujeto+mercado+día. `ON CONFLICT DO NOTHING` es la guardia
  -- de carrera entre productores (una fila de relevant_pages y una captura directa del mismo
  -- día colisionan sin romper; la frescura por source_endpoint se encarga del resto).
  CONSTRAINT seo_url_visibility_capture_unique
    UNIQUE (subject_kind, normalized_subject, location_code, language_code, capture_date)
);

-- Lectura canónica: la serie de un sujeto en un mercado, más reciente primero.
CREATE INDEX IF NOT EXISTS seo_url_visibility_lookup_idx
  ON greenhouse_growth.seo_url_visibility_snapshots
     (subject_kind, normalized_subject, location_code, language_code, capture_date DESC);

-- "Las páginas de este host": el drill-down natural de la foto de dominio.
CREATE INDEX IF NOT EXISTS seo_url_visibility_org_date_idx
  ON greenhouse_growth.seo_url_visibility_snapshots
     (captured_by_organization_id, capture_date DESC);

-- Append-only: reusa la función genérica de TASK-1299.
DROP TRIGGER IF EXISTS trg_seo_url_visibility_append_only
  ON greenhouse_growth.seo_url_visibility_snapshots;
CREATE TRIGGER trg_seo_url_visibility_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_growth.seo_url_visibility_snapshots
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_seo_row_mutation();

-- ── Expand del CHECK de `seo_keyword_market_data.source_endpoint` ─────────────────────────────
--
-- Esta task es el TERCER productor real del hecho de mercado por keyword: el `keyword_info`
-- viene inline y YA PAGADO en cada fila de `ranked_keywords`, y tirarlo sería pagar dos veces
-- por el mismo número. La tabla nació multi-productor pero su CHECK enumera los endpoints
-- autorizados — expand seguro (la lista nueva es superset de la vigente; nombre verificado
-- contra pg_constraint en PG real 2026-08-27).
ALTER TABLE greenhouse_growth.seo_keyword_market_data
  DROP CONSTRAINT IF EXISTS seo_keyword_market_data_source_endpoint_check;
ALTER TABLE greenhouse_growth.seo_keyword_market_data
  ADD CONSTRAINT seo_keyword_market_data_source_endpoint_check
  CHECK (source_endpoint IN (
    'keyword_overview',
    'keyword_suggestions',
    'related_keywords',
    'keyword_ideas',
    'keywords_for_site',
    'domain_intersection',
    'ranked_keywords'
  ));

-- Anti pre-up-marker guard (CLAUDE.md §Database — Migration markers / ISSUE-068).
DO $$
DECLARE
  table_exists        boolean;
  unique_exists       boolean;
  trigger_exists      boolean;
  kind_check_def      text;
  market_check_def    text;
  capture_date_type   text;
  location_code_type  text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_growth' AND table_name = 'seo_url_visibility_snapshots'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-1776 anti pre-up-marker check: greenhouse_growth.seo_url_visibility_snapshots NO fue creada. Los markers pueden estar invertidos.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seo_url_visibility_capture_unique'
  ) INTO unique_exists;

  IF NOT unique_exists THEN
    RAISE EXCEPTION 'TASK-1776: falta seo_url_visibility_capture_unique — sin esa UNIQUE un re-run del mismo dia insertaria capturas duplicadas.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_seo_url_visibility_append_only' AND NOT tgisinternal
  ) INTO trigger_exists;

  IF NOT trigger_exists THEN
    RAISE EXCEPTION 'TASK-1776: falta el trigger append-only.';
  END IF;

  -- El CHECK de subject_kind debe existir y enumerar las CUATRO clases.
  SELECT pg_get_constraintdef(oid) INTO kind_check_def
  FROM pg_constraint
  WHERE conrelid = 'greenhouse_growth.seo_url_visibility_snapshots'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%subject_kind%';

  IF kind_check_def IS NULL
     OR kind_check_def NOT ILIKE '%subfolder%'
     OR kind_check_def NOT ILIKE '%subdomain%' THEN
    RAISE EXCEPTION 'TASK-1776: el CHECK de subject_kind no quedo con el vocabulario cerrado de cuatro clases (def: %).', COALESCE(kind_check_def, 'NULL');
  END IF;

  -- El expand del CHECK de mercado debe incluir al tercer productor.
  SELECT pg_get_constraintdef(oid) INTO market_check_def
  FROM pg_constraint
  WHERE conname = 'seo_keyword_market_data_source_endpoint_check';

  IF market_check_def IS NULL OR market_check_def NOT ILIKE '%ranked_keywords%' THEN
    RAISE EXCEPTION 'TASK-1776: el CHECK de source_endpoint de seo_keyword_market_data no incluye ranked_keywords (def: %).', COALESCE(market_check_def, 'NULL');
  END IF;

  SELECT data_type INTO capture_date_type
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_growth'
    AND table_name = 'seo_url_visibility_snapshots'
    AND column_name = 'capture_date';

  IF capture_date_type IS DISTINCT FROM 'date' THEN
    RAISE EXCEPTION 'TASK-1776: capture_date debe ser DATE, es %.', capture_date_type;
  END IF;

  SELECT data_type INTO location_code_type
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_growth'
    AND table_name = 'seo_url_visibility_snapshots'
    AND column_name = 'location_code';

  IF location_code_type IS DISTINCT FROM 'text' THEN
    RAISE EXCEPTION 'TASK-1776: location_code debe ser TEXT para espejar seo_targets.location_code, es %.', location_code_type;
  END IF;
END
$$;

-- GRANTs least-privilege (append-only: el runtime no necesita UPDATE/DELETE).
ALTER TABLE greenhouse_growth.seo_url_visibility_snapshots OWNER TO greenhouse_ops;
GRANT SELECT, INSERT ON greenhouse_growth.seo_url_visibility_snapshots TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_growth.seo_url_visibility_snapshots TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.seo_url_visibility_snapshots TO greenhouse_migrator_user;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_growth.seo_url_visibility_snapshots;

-- Contract del CHECK de mercado: volver a la lista previa. Seguro SOLO si no quedan filas
-- 'ranked_keywords'; si las hay, el ADD CONSTRAINT falla y el rollback se detiene (correcto:
-- borrarlas destruiria mediciones pagadas).
ALTER TABLE greenhouse_growth.seo_keyword_market_data
  DROP CONSTRAINT IF EXISTS seo_keyword_market_data_source_endpoint_check;
ALTER TABLE greenhouse_growth.seo_keyword_market_data
  ADD CONSTRAINT seo_keyword_market_data_source_endpoint_check
  CHECK (source_endpoint IN (
    'keyword_overview',
    'keyword_suggestions',
    'related_keywords',
    'keyword_ideas',
    'keywords_for_site',
    'domain_intersection'
  ));
