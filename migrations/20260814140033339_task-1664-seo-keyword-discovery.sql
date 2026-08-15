-- Up Migration

-- TASK-1664 — Keyword discovery: corridas, candidatos y acciones (append-only).
--
-- Tres tablas que separan una SOLICITUD de discovery de sus RESULTADOS y de las DECISIONES
-- posteriores. Diseño gobernante:
--
-- ⚠️ LOS CANDIDATOS NO TIENEN COLUMNAS DE MÉTRICA DE MERCADO.
-- `search_volume`/`keyword_difficulty`/`competition`/`intent`/`core_keyword` son un hecho de
-- `(keyword, país, idioma, as-of)` cuyo SSOT es `greenhouse_growth.seo_keyword_market_data`
-- (TASK-1661, tabla multi-productor). El runner de discovery persiste ahí el `keyword_info`
-- que ya viene inline y pagado; el candidato guarda SOLO procedencia (run, seed, endpoint,
-- rank) y el reader compone en memoria por `(normalized_keyword, location_code, language_code)`.
-- Duplicar la métrica acá garantizaría divergencia dentro del mismo ciclo mensual.
--
-- ⚠️ DESCUBRIR NO ES SEGUIR. Ninguna de estas tablas tiene FK a `seo_keyword_set_members`
-- ni a `grader_*` (boundary §1.1). La promoción a tracking es un command posterior explícito
-- (`trackKeywords`) y la acción `promoted_to_tracking` es un registro del resultado, no el
-- mecanismo.
--
-- ⚠️ `location_code`/`language_code` viven en el RUN (identidad de mercado de la corrida
-- completa); los candidatos heredan el mercado por su run. La clave única de candidato es
-- `(run_id, source_endpoint, normalized_keyword)`: una misma keyword desde dos endpoints
-- conserva ambas procedencias, y el retry de una subllamada no duplica evidencia.

CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_keyword_discovery_runs (
  run_id              TEXT PRIMARY KEY DEFAULT ('seokdr-' || gen_random_uuid()::text),
  organization_id     TEXT NOT NULL
    REFERENCES greenhouse_core.organizations (organization_id) ON DELETE RESTRICT,
  seo_target_id       TEXT NOT NULL
    REFERENCES greenhouse_growth.seo_targets (seo_target_id) ON DELETE RESTRICT,

  -- Fuente de seeds y métodos elegidos: snapshot INMUTABLE de la solicitud. La corrida
  -- nunca reescribe estos campos; una nueva pregunta es una nueva corrida.
  source_kind         TEXT NOT NULL CHECK (
    source_kind IN ('manual', 'gsc_queries', 'tracked_keywords', 'target_domain', 'mixed')
  ),
  seed_inputs_json    JSONB NOT NULL,
  methods_json        JSONB NOT NULL,

  -- Identidad de mercado de la corrida (espeja seo_targets.location_code TEXT).
  location_code       TEXT NOT NULL,
  language_code       TEXT NOT NULL,

  -- Máquina de estados operativa: pending → running → terminal. `cancelled` sólo desde
  -- pending. Los campos operativos (status, tiempos, costos, conteos, error_code) son lo
  -- ÚNICO actualizable.
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'running', 'succeeded', 'partial', 'no_results', 'failed', 'budget_blocked', 'cancelled')
  ),

  estimated_cost_usd  NUMERIC(14, 6) NOT NULL DEFAULT 0 CHECK (estimated_cost_usd >= 0),
  -- Suma del `cost` real devuelto por el transporte; NUNCA se estima al cerrar.
  actual_cost_usd     NUMERIC(14, 6) CHECK (actual_cost_usd IS NULL OR actual_cost_usd >= 0),
  provider_calls      INTEGER NOT NULL DEFAULT 0 CHECK (provider_calls >= 0),
  -- Filas de candidato realmente insertadas, no cantidad solicitada.
  candidate_count     INTEGER NOT NULL DEFAULT 0 CHECK (candidate_count >= 0),
  error_code          TEXT,

  created_by          TEXT NOT NULL,
  idempotency_key     TEXT NOT NULL,

  requested_at        TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,

  -- El mismo intent (org + target + inputs + mercado + methods + actor) devuelve la corrida
  -- existente sin otra llamada al proveedor.
  CONSTRAINT seo_keyword_discovery_runs_idempotency_unique
    UNIQUE (organization_id, idempotency_key)
);

-- Drain del worker: claim de pendientes por orden de llegada.
CREATE INDEX IF NOT EXISTS seo_keyword_discovery_runs_pending_idx
  ON greenhouse_growth.seo_keyword_discovery_runs (requested_at)
  WHERE status = 'pending';

-- Señal de confiabilidad: corridas running atascadas.
CREATE INDEX IF NOT EXISTS seo_keyword_discovery_runs_running_idx
  ON greenhouse_growth.seo_keyword_discovery_runs (started_at)
  WHERE status = 'running';

-- Lectura del workbench: historial por org/target.
CREATE INDEX IF NOT EXISTS seo_keyword_discovery_runs_org_target_idx
  ON greenhouse_growth.seo_keyword_discovery_runs (organization_id, seo_target_id, requested_at DESC);

CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_keyword_discovery_candidates (
  candidate_id        TEXT PRIMARY KEY DEFAULT ('seokdc-' || gen_random_uuid()::text),
  run_id              TEXT NOT NULL
    REFERENCES greenhouse_growth.seo_keyword_discovery_runs (run_id) ON DELETE RESTRICT,
  -- Denormalizados para índices tenant-safe; el runner los valida contra el run al insertar.
  organization_id     TEXT NOT NULL
    REFERENCES greenhouse_core.organizations (organization_id) ON DELETE RESTRICT,
  seo_target_id       TEXT NOT NULL
    REFERENCES greenhouse_growth.seo_targets (seo_target_id) ON DELETE RESTRICT,

  -- Texto tal como lo devolvió el proveedor (límite Labs: 80 chars / 10 palabras se valida
  -- en seeds; el resultado puede ser más largo y se conserva con techo defensivo).
  keyword             TEXT NOT NULL CHECK (length(keyword) BETWEEN 1 AND 255),
  -- NFKC + trim + lowercase + colapso de espacios, conservando tildes (normalizeMarketKeyword).
  normalized_keyword  TEXT NOT NULL CHECK (length(normalized_keyword) BETWEEN 1 AND 255),

  -- Seeds que originaron el resultado (procedencia, no autoridad).
  seed_keywords_json  JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Enum cerrado V1: SOLO endpoints de expansión (keyword_overview es enrichment, no produce
  -- candidatos; domain_intersection pertenece a TASK-1662).
  source_endpoint     TEXT NOT NULL CHECK (
    source_endpoint IN ('keyword_suggestions', 'related_keywords', 'keyword_ideas', 'keywords_for_site')
  ),
  -- Posición del resultado dentro de ESA respuesta del proveedor.
  source_rank         INTEGER CHECK (source_rank IS NULL OR source_rank >= 1),

  captured_at         TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

  -- Disclosure fijo: los candidatos vienen del estimador de mercado (lente ◑), jamás de GSC.
  market_source       TEXT NOT NULL DEFAULT 'dataforseo_labs' CHECK (market_source = 'dataforseo_labs'),

  -- Hash de diagnóstico para correlación; NUNCA el payload completo del proveedor.
  raw_payload_hash    TEXT,

  -- Una keyword desde dos endpoints conserva ambas procedencias; el retry de una subllamada
  -- (mismo run + endpoint) no duplica evidencia.
  CONSTRAINT seo_keyword_discovery_candidates_provenance_unique
    UNIQUE (run_id, source_endpoint, normalized_keyword)
);

CREATE INDEX IF NOT EXISTS seo_keyword_discovery_candidates_org_target_idx
  ON greenhouse_growth.seo_keyword_discovery_candidates (organization_id, seo_target_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS seo_keyword_discovery_candidates_run_keyword_idx
  ON greenhouse_growth.seo_keyword_discovery_candidates (run_id, normalized_keyword);

CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_keyword_discovery_actions (
  action_id           TEXT PRIMARY KEY DEFAULT ('seokda-' || gen_random_uuid()::text),
  candidate_id        TEXT NOT NULL
    REFERENCES greenhouse_growth.seo_keyword_discovery_candidates (candidate_id) ON DELETE RESTRICT,
  organization_id     TEXT NOT NULL
    REFERENCES greenhouse_core.organizations (organization_id) ON DELETE RESTRICT,

  action_kind         TEXT NOT NULL CHECK (
    action_kind IN ('dismissed', 'selected_for_target', 'selected_for_grounded_query', 'promoted_to_tracking', 'rejected')
  ),

  actor               TEXT NOT NULL,
  idempotency_key     TEXT NOT NULL,
  -- Metadata mínima (outcome real de un command posterior, referencia opaca AEO). Sin copia
  -- de la keyword como autoridad y sin PII.
  metadata_json       JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

  CONSTRAINT seo_keyword_discovery_actions_idempotency_unique
    UNIQUE (organization_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS seo_keyword_discovery_actions_candidate_idx
  ON greenhouse_growth.seo_keyword_discovery_actions (candidate_id, created_at DESC);

-- Append-only enforcement (reusa la función de TASK-1299):
--   runs        = mutable SOLO por UPDATE (máquina de estados); DELETE prohibido.
--   candidates  = hechos de una respuesta del proveedor; UPDATE y DELETE prohibidos.
--   actions     = log de decisiones; UPDATE y DELETE prohibidos.
DROP TRIGGER IF EXISTS trg_seo_keyword_discovery_runs_no_delete
  ON greenhouse_growth.seo_keyword_discovery_runs;
CREATE TRIGGER trg_seo_keyword_discovery_runs_no_delete
  BEFORE DELETE ON greenhouse_growth.seo_keyword_discovery_runs
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_seo_row_mutation();

DROP TRIGGER IF EXISTS trg_seo_keyword_discovery_candidates_append_only
  ON greenhouse_growth.seo_keyword_discovery_candidates;
CREATE TRIGGER trg_seo_keyword_discovery_candidates_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_growth.seo_keyword_discovery_candidates
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_seo_row_mutation();

DROP TRIGGER IF EXISTS trg_seo_keyword_discovery_actions_append_only
  ON greenhouse_growth.seo_keyword_discovery_actions;
CREATE TRIGGER trg_seo_keyword_discovery_actions_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_growth.seo_keyword_discovery_actions
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_seo_row_mutation();

-- Anti pre-up-marker guard: aborta si el DDL de arriba no quedó realmente aplicado.
DO $$
DECLARE
  tables_found integer;
  uniques_found integer;
  triggers_found integer;
  status_check_found boolean;
BEGIN
  SELECT COUNT(*) INTO tables_found
    FROM information_schema.tables
   WHERE table_schema = 'greenhouse_growth'
     AND table_name IN (
       'seo_keyword_discovery_runs',
       'seo_keyword_discovery_candidates',
       'seo_keyword_discovery_actions'
     );

  IF tables_found <> 3 THEN
    RAISE EXCEPTION 'TASK-1664 anti pre-up-marker check: se esperaban 3 tablas de discovery, hay %. Markers invertidos?', tables_found;
  END IF;

  SELECT COUNT(*) INTO uniques_found
    FROM pg_constraint
   WHERE conname IN (
     'seo_keyword_discovery_runs_idempotency_unique',
     'seo_keyword_discovery_candidates_provenance_unique',
     'seo_keyword_discovery_actions_idempotency_unique'
   );

  IF uniques_found <> 3 THEN
    RAISE EXCEPTION 'TASK-1664 anti pre-up-marker check: faltan constraints únicos (% de 3).', uniques_found;
  END IF;

  SELECT COUNT(*) INTO triggers_found
    FROM pg_trigger
   WHERE tgname IN (
     'trg_seo_keyword_discovery_runs_no_delete',
     'trg_seo_keyword_discovery_candidates_append_only',
     'trg_seo_keyword_discovery_actions_append_only'
   );

  IF triggers_found <> 3 THEN
    RAISE EXCEPTION 'TASK-1664 anti pre-up-marker check: faltan triggers append-only (% de 3).', triggers_found;
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'greenhouse_growth.seo_keyword_discovery_runs'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) LIKE '%budget_blocked%'
  ) INTO status_check_found;

  IF NOT status_check_found THEN
    RAISE EXCEPTION 'TASK-1664 anti pre-up-marker check: el CHECK de status de runs no existe.';
  END IF;
END
$$;

-- GRANTs least-privilege:
--   runs       = el runtime encola (INSERT) y transiciona estados (UPDATE); sin DELETE.
--   candidates = append-only: SELECT + INSERT.
--   actions    = append-only: SELECT + INSERT.
ALTER TABLE greenhouse_growth.seo_keyword_discovery_runs OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.seo_keyword_discovery_candidates OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.seo_keyword_discovery_actions OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.seo_keyword_discovery_runs TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.seo_keyword_discovery_runs TO greenhouse_app;
GRANT SELECT, INSERT ON greenhouse_growth.seo_keyword_discovery_candidates TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_growth.seo_keyword_discovery_candidates TO greenhouse_app;
GRANT SELECT, INSERT ON greenhouse_growth.seo_keyword_discovery_actions TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_growth.seo_keyword_discovery_actions TO greenhouse_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.seo_keyword_discovery_runs TO greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.seo_keyword_discovery_candidates TO greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.seo_keyword_discovery_actions TO greenhouse_migrator_user;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_growth.seo_keyword_discovery_actions;
DROP TABLE IF EXISTS greenhouse_growth.seo_keyword_discovery_candidates;
DROP TABLE IF EXISTS greenhouse_growth.seo_keyword_discovery_runs;
