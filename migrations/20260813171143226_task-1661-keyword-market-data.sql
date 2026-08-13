-- Up Migration

-- TASK-1661 — Datos de mercado por keyword (volumen + dificultad) desde DataForSEO Labs.
--
-- Cierra el gap que dejaba a `readKeywordOpportunities` devolviendo `searchVolume: null`,
-- `difficulty: null` y `market: 'unavailable'` cableados: la cañería del cliente DataForSEO ya
-- existía (TASK-1300 dejó la familia `labs` llamable), lo que faltaba eran las columnas.
--
-- ⚠️ POR QUÉ ESTA TABLA NO CUELGA DE UN TARGET NI DE UNA KEYWORD TRACKEADA.
--
-- El volumen de una keyword es un hecho de `(keyword, país, idioma, as-of)` — información
-- pública de mercado, con frescura MENSUAL (DataForSEO sigue el ciclo de Google Ads). No
-- depende de si Greenhouse sigue esa keyword ni de quién la descubrió: "pintura industrial"
-- tiene el mismo volumen en Chile para todos los clientes de la cartera.
--
-- Por eso NO hay FK a `seo_keyword_set_members` ni a `seo_targets`. La tabla nace
-- MULTI-PRODUCTOR y ese es su contrato (confirmado en el Discovery de TASK-1664, 2026-08-13):
--   1. TASK-1661 (esta task): las keywords vigentes del set monitoreado, vía `keyword_overview`.
--   2. TASK-1664 (discovery): el `keyword_info` que YA VIENE INLINE Y PAGADO en las respuestas
--      de `keyword_suggestions` / `related_keywords` / `keyword_ideas`. Tirarlo obligaría a
--      re-comprarlo.
--   3. TASK-1662 (keyword gap): lo mismo desde `domain_intersection`.
-- Una keyword candidata todavía no es de nadie: colgarla de un target la haría inexpresable.
--
-- ⚠️ POR QUÉ `organization_id` NO ESTÁ EN LA CLAVE ÚNICA.
--
-- Está como `captured_by_organization_id`, que es ATRIBUCIÓN (quién pagó la captura), no
-- aislamiento de tenant: este dato no es del cliente. Dejarlo fuera de la clave permite que la
-- captura que pagó una org sirva a otra sin volver a gastar — que es justo lo que vuelve barato
-- el top-up de TASK-1664/1662 a escala de cartera.
--
-- La dirección es la REVERSIBLE, y por eso se elige: `UNIQUE (keyword, país, idioma, fecha)` es
-- MÁS ESTRICTA que `UNIQUE (org, keyword, país, idioma, fecha)`. Si algún día hiciera falta
-- aislar por org, relajar la clave es seguro (toda fila existente satisface la más laxa). Al
-- revés habría que BORRAR duplicados, y esta tabla es append-only: no se puede.
-- 🔴 `captured_by_organization_id` NUNCA viaja en un DTO client-facing: expuesto, dejaría
-- inferir por frescura qué keywords sigue otra organización.
--
-- ⚠️ `location_code` es TEXT, no INTEGER — espeja `seo_targets.location_code` (verificado
-- contra PG real 2026-08-13: es `text`, con valores como '2152'). La conversión a número ocurre
-- SOLO en la frontera del proveedor, igual que en `rank-history-seed.ts`.
--
-- ⚠️ `NULL` ≠ `0`. "No lo consultamos" y "nadie busca eso" son hechos distintos. Si el
-- proveedor no entrega la métrica, la columna queda NULL y el reader responde `unavailable`;
-- jamás se persiste 0 como volumen.
CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_keyword_market_data (
  market_data_id              TEXT PRIMARY KEY DEFAULT ('seokmd-' || gen_random_uuid()::text),

  -- Identidad del hecho. `normalized_keyword` es la clave de join (NFKC + trim + lowercase +
  -- colapso de espacios, conservando tildes); `keyword` guarda el texto tal como lo devolvió el
  -- proveedor, para poder auditar la normalización sin re-comprar la fila.
  normalized_keyword          TEXT NOT NULL CHECK (length(normalized_keyword) BETWEEN 1 AND 255),
  keyword                     TEXT NOT NULL CHECK (length(keyword) BETWEEN 1 AND 255),
  location_code               TEXT NOT NULL,
  language_code               TEXT NOT NULL,
  capture_date                DATE NOT NULL,

  -- Métricas estimadas (lente ◑). Todas NULLABLE a propósito.
  search_volume               INTEGER CHECK (search_volume IS NULL OR search_volume >= 0),
  -- Dificultad ORGÁNICA 0–100 (escala logarítmica, métrica propia de DataForSEO).
  keyword_difficulty          INTEGER
    CHECK (keyword_difficulty IS NULL OR (keyword_difficulty BETWEEN 0 AND 100)),
  -- ⚠️ `competition` es competencia PAGA (Google Ads), NO dificultad orgánica. Se guardan
  -- separadas porque confundirlas es el error clásico de lectura de Labs.
  competition                 NUMERIC(5, 4)
    CHECK (competition IS NULL OR (competition BETWEEN 0 AND 1)),
  competition_level           TEXT
    CHECK (competition_level IS NULL OR competition_level IN ('low', 'medium', 'high')),
  cpc_usd                     NUMERIC(12, 4) CHECK (cpc_usd IS NULL OR cpc_usd >= 0),

  -- Intención: viene GRATIS en la misma respuesta de `keyword_overview`. Se PERSISTE (append-only
  -- significa que no guardarla la pierde para siempre y habría que re-comprar la captura) pero
  -- NO se expone en `KeywordOpportunity` — la intención como dimensión de producto es otra task.
  search_intent               TEXT
    CHECK (search_intent IS NULL OR search_intent IN
      ('informational', 'navigational', 'commercial', 'transactional')),
  search_intent_probability   NUMERIC(5, 4)
    CHECK (search_intent_probability IS NULL OR (search_intent_probability BETWEEN 0 AND 1)),
  -- Clúster de sinónimos que Google ya resolvió; evita construir clustering propio.
  core_keyword                TEXT,

  -- Procedencia. `source_endpoint` dice QUÉ productor escribió la fila (ver multi-productor).
  source_endpoint             TEXT NOT NULL
    CHECK (source_endpoint IN (
      'keyword_overview',
      'keyword_suggestions',
      'related_keywords',
      'keyword_ideas',
      'keywords_for_site',
      'domain_intersection'
    )),
  -- As-of DEL PROVEEDOR (cuándo actualizó ÉL la métrica), distinto de cuándo la capturamos
  -- nosotros. Es el campo que decide si un top-up es necesario o el ciclo mensual vigente basta.
  provider_last_updated_at    TIMESTAMPTZ,
  captured_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Atribución de gasto. El presupuesto se controla en `seo_provider_spend_daily` (lo escribe el
  -- transporte); esto es procedencia por fila, NUNCA fuente de presupuesto.
  captured_by_organization_id TEXT NOT NULL
    REFERENCES greenhouse_core.organizations (organization_id) ON DELETE RESTRICT,
  provider_cost               NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (provider_cost >= 0),

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Idempotencia: una captura por keyword+mercado+día. Un refetch el mismo día no duplica; un
  -- refetch en otro día AGREGA una captura y el histórico de volumen queda como señal (una
  -- keyword que triplicó su volumen es material comercial).
  CONSTRAINT seo_keyword_market_data_capture_unique
    UNIQUE (normalized_keyword, location_code, language_code, capture_date)
);

-- Lectura canónica del reader: la captura más reciente de una keyword en un mercado. El índice
-- UNIQUE de arriba sirve el prefijo, pero Postgres escanea hacia atrás para el DESC; este lo hace
-- explícito porque es el acceso caliente (una fila por keyword del set, en cada render).
CREATE INDEX IF NOT EXISTS seo_keyword_market_data_lookup_idx
  ON greenhouse_growth.seo_keyword_market_data
     (normalized_keyword, location_code, language_code, capture_date DESC);

-- Atribución: cuánto capturó cada org y cuándo (auditoría de gasto, no presupuesto).
CREATE INDEX IF NOT EXISTS seo_keyword_market_data_org_date_idx
  ON greenhouse_growth.seo_keyword_market_data
     (captured_by_organization_id, capture_date DESC);

-- Append-only: reusa la función genérica de TASK-1299 (mensaje por TG_TABLE_NAME).
-- Un refetch AGREGA captura; jamás sobrescribe. Sin esto, "actualizar el volumen" destruiría el
-- histórico, que es la única señal de estacionalidad que tiene el módulo.
DROP TRIGGER IF EXISTS trg_seo_keyword_market_data_append_only
  ON greenhouse_growth.seo_keyword_market_data;
CREATE TRIGGER trg_seo_keyword_market_data_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_growth.seo_keyword_market_data
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_seo_row_mutation();

-- Anti pre-up-marker guard (CLAUDE.md §Database — Migration markers / ISSUE-068).
DO $$
DECLARE
  table_exists       boolean;
  unique_exists      boolean;
  trigger_exists     boolean;
  capture_date_type  text;
  location_code_type text;
  volume_nullable    text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_growth' AND table_name = 'seo_keyword_market_data'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-1661 anti pre-up-marker check: greenhouse_growth.seo_keyword_market_data NO fue creada. Los markers pueden estar invertidos.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seo_keyword_market_data_capture_unique'
  ) INTO unique_exists;

  IF NOT unique_exists THEN
    RAISE EXCEPTION 'TASK-1661: falta seo_keyword_market_data_capture_unique — sin esa UNIQUE un re-run del mismo dia insertaria capturas duplicadas y el pre-check de idempotencia gastaria de nuevo.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_seo_keyword_market_data_append_only' AND NOT tgisinternal
  ) INTO trigger_exists;

  IF NOT trigger_exists THEN
    RAISE EXCEPTION 'TASK-1661: falta el trigger append-only — sin el, un UPDATE sobrescribiria la captura anterior y se perderia el historico de volumen.';
  END IF;

  -- Guard de la bug class DATE-vs-TIMESTAMP (CLAUDE.md §SQL embebido / date-math): `date - date`
  -- devuelve integer y `EXTRACT(EPOCH FROM ...)` sobre esa resta revienta en runtime.
  SELECT data_type INTO capture_date_type
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_growth'
    AND table_name = 'seo_keyword_market_data'
    AND column_name = 'capture_date';

  IF capture_date_type IS DISTINCT FROM 'date' THEN
    RAISE EXCEPTION 'TASK-1661: capture_date debe ser DATE, es %.', capture_date_type;
  END IF;

  -- `location_code` DEBE espejar seo_targets.location_code (text). Si nace integer, todo JOIN
  -- con el target falla o castea en silencio.
  SELECT data_type INTO location_code_type
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_growth'
    AND table_name = 'seo_keyword_market_data'
    AND column_name = 'location_code';

  IF location_code_type IS DISTINCT FROM 'text' THEN
    RAISE EXCEPTION 'TASK-1661: location_code debe ser TEXT para espejar seo_targets.location_code, es %.', location_code_type;
  END IF;

  -- `NULL` != `0`: si search_volume naciera NOT NULL, "no consultado" se volveria indistinguible
  -- de "nadie lo busca" y el contrato `market` perderia su razon de existir.
  SELECT is_nullable INTO volume_nullable
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_growth'
    AND table_name = 'seo_keyword_market_data'
    AND column_name = 'search_volume';

  IF volume_nullable IS DISTINCT FROM 'YES' THEN
    RAISE EXCEPTION 'TASK-1661: search_volume debe ser NULLABLE — NULL significa "no consultado" y 0 significa "nadie lo busca".';
  END IF;
END
$$;

-- GRANTs least-privilege. El runtime SOLO lee e inserta: la tabla es append-only, así que no
-- necesita UPDATE (el trigger lo bloquearía igual) ni DELETE (borrar una captura destruiría la
-- evidencia de un gasto ya incurrido).
ALTER TABLE greenhouse_growth.seo_keyword_market_data OWNER TO greenhouse_ops;
GRANT SELECT, INSERT ON greenhouse_growth.seo_keyword_market_data TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_growth.seo_keyword_market_data TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.seo_keyword_market_data TO greenhouse_migrator_user;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_growth.seo_keyword_market_data;
