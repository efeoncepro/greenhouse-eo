-- Up Migration

-- TASK-1662 — Growth SEO: keyword gap competitivo — fundación de datos (EPIC-022).
--
-- Tres piezas, todas aditivas:
--
-- 1. `seo_competitors` (creada VACÍA por TASK-1299, verificado 0 filas 2026-08-28) gana
--    AUTORÍA: un competidor es un hecho DECLARADO con autor, fecha y procedencia — nunca
--    inferido en silencio. La *propuesta* puede venir de una máquina (top-N de TASK-1699,
--    colector prospect de TASK-1709); la *declaración* es humana y `proposal_ref` guarda,
--    opaca, la evidencia de la propuesta cuando la hubo. Es un ALTER, NUNCA un CREATE:
--    un `CREATE TABLE IF NOT EXISTS` acá haría no-op en silencio (la tabla ya existe) y
--    `declared_by` jamás existiría (bug class declarado en la spec de la task).
--
-- 2. `seo_competitor_coverage_runs`: el VEREDICTO de cada intento de captura de cobertura
--    (ancla de frescura + idempotencia). Sin este ledger, un competidor cuya captura
--    devuelve 0 filas de gap se re-compraría en CADA corrida para siempre — la fuga de
--    costo que TASK-1661 encontró con el smoke real (regla growth-seo: tres estados).
--
-- 3. `seo_competitor_keyword_coverage`: los INSUMOS fechados del gap — qué keyword ranquea
--    el competidor y en qué posición estaba el cliente según el proveedor ese día. El GAP
--    NO SE PERSISTE: se deriva al leer (cobertura × set del cliente × GSC medido);
--    persistirlo lo congela y envejece sin señal. El `keyword_info` inline (volumen, cpc,
--    avg_backlinks) NO vive acá: va al hecho de mercado compartido
--    `seo_keyword_market_data` vía `persistKeywordMarketData` (multi-productor, costo 0).
--
-- Boundary: cero FK/JOIN/VIEW hacia `grader_*` y hacia la futura cola priorizada
-- (TASK-1700 consume el reader con `evidence_ref` OPACA, nunca FK).

-- ── 1. Autoría de la declaración de competidor ─────────────────────────────

ALTER TABLE greenhouse_growth.seo_competitors
  ADD COLUMN IF NOT EXISTS declared_by     TEXT,
  ADD COLUMN IF NOT EXISTS declared_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS declared_source TEXT,
  ADD COLUMN IF NOT EXISTS proposal_ref    TEXT,
  ADD COLUMN IF NOT EXISTS retired_by      TEXT,
  ADD COLUMN IF NOT EXISTS retired_reason  TEXT;

-- Vocabulario de procedencia ENUMERADO — el mismo de `seo_keyword_set_members.source`
-- (TASK-1308): quién EJECUTÓ el write. Ortogonal a `declared_by` (quién asumió la
-- clasificación) y a `proposal_ref` (de dónde salió la propuesta).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seo_competitors_declared_source_check'
  ) THEN
    ALTER TABLE greenhouse_growth.seo_competitors
      ADD CONSTRAINT seo_competitors_declared_source_check
      CHECK (declared_source IS NULL OR declared_source IN ('operator_ui', 'nexa', 'mcp', 'seed', 'backfill'));
  END IF;
END
$$;

-- La autoría de la declaración es OBLIGATORIA para toda fila nueva: autor + fecha +
-- procedencia existen juntos o la fila no entra. La tabla está vacía (0 filas verificadas
-- contra PG real), así que no hay legacy sin autoría — pero el CHECK se escribe tolerante a
-- NULL-triple por disciplina expand/contract (ISSUE-161: una base compartida entre envs);
-- el command es quien exige el triple NOT NULL en el INSERT.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seo_competitors_declaration_authorship_check'
  ) THEN
    ALTER TABLE greenhouse_growth.seo_competitors
      ADD CONSTRAINT seo_competitors_declaration_authorship_check
      CHECK (
        (declared_by IS NULL     AND declared_at IS NULL     AND declared_source IS NULL)
        OR
        (declared_by IS NOT NULL AND declared_at IS NOT NULL AND declared_source IS NOT NULL)
      );
  END IF;
END
$$;

-- El retiro también tiene autor: cerrar la vigencia (`effective_to`, con
-- `clock_timestamp()`, NUNCA `NOW()` — regla del dominio) exige `retired_by`.
-- `retired_reason` es opcional. Una fila vigente no puede llevar autoría de retiro.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seo_competitors_retirement_authorship_check'
  ) THEN
    ALTER TABLE greenhouse_growth.seo_competitors
      ADD CONSTRAINT seo_competitors_retirement_authorship_check
      CHECK (
        (effective_to IS NULL AND retired_by IS NULL AND retired_reason IS NULL)
        OR
        (effective_to IS NOT NULL AND retired_by IS NOT NULL)
      );
  END IF;
END
$$;

COMMENT ON COLUMN greenhouse_growth.seo_competitors.declared_by IS
  'TASK-1662 — actor que DECLARÓ al dominio como competidor. Un competidor es una clasificación con autor, nunca una inferencia: un competidor mal elegido invalida todo el análisis río abajo.';
COMMENT ON COLUMN greenhouse_growth.seo_competitors.declared_source IS
  'TASK-1662 — procedencia del write (operator_ui|nexa|mcp|seed|backfill), mismo vocabulario que seo_keyword_set_members.source. Ortogonal a declared_by.';
COMMENT ON COLUMN greenhouse_growth.seo_competitors.proposal_ref IS
  'TASK-1662 — referencia OPACA a la propuesta de máquina que originó la declaración (p.ej. top-N de TASK-1699). NULL = declaración directa sin propuesta. Nunca FK, nunca JOIN.';
COMMENT ON COLUMN greenhouse_growth.seo_competitors.retired_by IS
  'TASK-1662 — actor que retiró al competidor (cierra effective_to). Acoplado por CHECK: vigencia cerrada exige autor del retiro.';

-- ── 2. Run ledger de cobertura (veredicto + ancla de frescura) ─────────────

CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_competitor_coverage_runs (
  coverage_run_id   TEXT PRIMARY KEY DEFAULT ('seocr-' || gen_random_uuid()::text),
  seo_competitor_id TEXT NOT NULL
    REFERENCES greenhouse_growth.seo_competitors (seo_competitor_id) ON DELETE RESTRICT,
  seo_target_id     TEXT NOT NULL
    REFERENCES greenhouse_growth.seo_targets (seo_target_id) ON DELETE RESTRICT,
  location_code     TEXT NOT NULL,
  language_code     TEXT NOT NULL,
  capture_date      DATE NOT NULL,
  status            TEXT NOT NULL
    CHECK (status IN ('captured', 'failed')),
  error_code        TEXT,
  rows_written      INTEGER NOT NULL DEFAULT 0 CHECK (rows_written >= 0),
  provider_cost     NUMERIC(12, 4),
  source_run_id     TEXT,
  captured_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Un run `captured` con error o un `failed` sin error serían veredictos incoherentes.
  CONSTRAINT seo_competitor_coverage_runs_error_coherence_check
    CHECK (
      (status = 'captured' AND error_code IS NULL)
      OR
      (status = 'failed' AND error_code IS NOT NULL)
    )
);

-- Idempotencia/frescura: a lo sumo UNA captura exitosa por competidor por día. Un run
-- `failed` NO consume la ranura (se puede reintentar el mismo día) y NO cuenta como fresco.
CREATE UNIQUE INDEX IF NOT EXISTS seo_competitor_coverage_runs_captured_unique
  ON greenhouse_growth.seo_competitor_coverage_runs (seo_competitor_id, capture_date)
  WHERE status = 'captured';

CREATE INDEX IF NOT EXISTS seo_competitor_coverage_runs_target_idx
  ON greenhouse_growth.seo_competitor_coverage_runs (seo_target_id, capture_date DESC);

-- ── 3. Cobertura de keywords del competidor (insumos fechados del gap) ─────

CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_competitor_keyword_coverage (
  coverage_row_id   TEXT PRIMARY KEY DEFAULT ('seocg-' || gen_random_uuid()::text),
  coverage_run_id   TEXT NOT NULL
    REFERENCES greenhouse_growth.seo_competitor_coverage_runs (coverage_run_id) ON DELETE RESTRICT,
  seo_competitor_id TEXT NOT NULL
    REFERENCES greenhouse_growth.seo_competitors (seo_competitor_id) ON DELETE RESTRICT,
  seo_target_id     TEXT NOT NULL
    REFERENCES greenhouse_growth.seo_targets (seo_target_id) ON DELETE RESTRICT,
  keyword           TEXT NOT NULL,
  location_code     TEXT NOT NULL,
  language_code     TEXT NOT NULL,
  capture_date      DATE NOT NULL,
  -- rank_group del proveedor. El competidor SIEMPRE ranquea en una fila de cobertura;
  -- el cliente puede no aparecer (NULL = ausente según el proveedor, lente ◑ estimada).
  competitor_rank   INTEGER NOT NULL CHECK (competitor_rank > 0),
  competitor_url    TEXT,
  client_rank       INTEGER CHECK (client_rank IS NULL OR client_rank > 0),
  client_url        TEXT,
  -- serp_item_types del serp_info del proveedor. NULL = el proveedor no lo trajo
  -- (`sin_dato`, JAMÁS "ninguna feature"); '[]' = trajo el campo y estaba vacío.
  serp_item_types   JSONB,
  captured_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT seo_competitor_keyword_coverage_run_keyword_unique
    UNIQUE (coverage_run_id, keyword)
);

CREATE INDEX IF NOT EXISTS seo_competitor_keyword_coverage_competitor_idx
  ON greenhouse_growth.seo_competitor_keyword_coverage (seo_competitor_id, capture_date DESC);
CREATE INDEX IF NOT EXISTS seo_competitor_keyword_coverage_target_idx
  ON greenhouse_growth.seo_competitor_keyword_coverage (seo_target_id, capture_date DESC);

-- ── Triggers append-only (mediciones: UPDATE y DELETE bloqueados) ──────────

DROP TRIGGER IF EXISTS trg_seo_competitor_coverage_runs_append_only
  ON greenhouse_growth.seo_competitor_coverage_runs;
CREATE TRIGGER trg_seo_competitor_coverage_runs_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_growth.seo_competitor_coverage_runs
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_seo_row_mutation();

DROP TRIGGER IF EXISTS trg_seo_competitor_keyword_coverage_append_only
  ON greenhouse_growth.seo_competitor_keyword_coverage;
CREATE TRIGGER trg_seo_competitor_keyword_coverage_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_growth.seo_competitor_keyword_coverage
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_seo_row_mutation();

-- ── Anti pre-up-marker guard (ISSUE-068) ───────────────────────────────────

DO $$
DECLARE
  missing_columns INTEGER;
  table_count INTEGER;
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_columns
    FROM (VALUES ('declared_by'), ('declared_at'), ('declared_source'),
                 ('proposal_ref'), ('retired_by'), ('retired_reason')) AS expected(column_name)
   WHERE NOT EXISTS (
     SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'greenhouse_growth'
        AND table_name = 'seo_competitors'
        AND columns.column_name = expected.column_name
   );
  IF missing_columns > 0 THEN
    RAISE EXCEPTION 'TASK-1662 anti pre-up-marker: faltan % columnas de autoría en seo_competitors. Markers posiblemente invertidos.', missing_columns;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'seo_competitors_declaration_authorship_check') THEN
    RAISE EXCEPTION 'TASK-1662 anti pre-up-marker: falta el CHECK de autoría de declaración.';
  END IF;

  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'greenhouse_growth'
    AND table_name IN ('seo_competitor_coverage_runs', 'seo_competitor_keyword_coverage');
  IF table_count <> 2 THEN
    RAISE EXCEPTION 'TASK-1662 anti pre-up-marker: expected 2 coverage tables, got %.', table_count;
  END IF;

  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'greenhouse_growth'
    AND NOT t.tgisinternal
    AND t.tgname IN (
      'trg_seo_competitor_coverage_runs_append_only',
      'trg_seo_competitor_keyword_coverage_append_only'
    );
  IF trigger_count <> 2 THEN
    RAISE EXCEPTION 'TASK-1662 anti pre-up-marker: expected 2 append-only triggers, got %.', trigger_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'greenhouse_growth'
       AND indexname = 'seo_competitor_coverage_runs_captured_unique'
  ) THEN
    RAISE EXCEPTION 'TASK-1662 anti pre-up-marker: falta el índice único parcial de frescura de runs.';
  END IF;

  -- Bug class DATE vs TIMESTAMP (gate TASK-893): capture_date DEBE ser DATE.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'greenhouse_growth'
       AND table_name IN ('seo_competitor_coverage_runs', 'seo_competitor_keyword_coverage')
       AND column_name = 'capture_date'
       AND data_type <> 'date'
  ) THEN
    RAISE EXCEPTION 'TASK-1662 anti pre-up-marker: capture_date debe ser DATE.';
  END IF;
END
$$;

-- ── Ownership + GRANTs (mediciones append-only: sin UPDATE ni DELETE) ──────

ALTER TABLE greenhouse_growth.seo_competitor_coverage_runs OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.seo_competitor_keyword_coverage OWNER TO greenhouse_ops;

GRANT SELECT, INSERT ON greenhouse_growth.seo_competitor_coverage_runs TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_growth.seo_competitor_coverage_runs TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.seo_competitor_coverage_runs TO greenhouse_migrator_user;
GRANT SELECT, INSERT ON greenhouse_growth.seo_competitor_keyword_coverage TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_growth.seo_competitor_keyword_coverage TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.seo_competitor_keyword_coverage TO greenhouse_migrator_user;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_growth.seo_competitor_keyword_coverage;
DROP TABLE IF EXISTS greenhouse_growth.seo_competitor_coverage_runs;

ALTER TABLE greenhouse_growth.seo_competitors
  DROP CONSTRAINT IF EXISTS seo_competitors_retirement_authorship_check;
ALTER TABLE greenhouse_growth.seo_competitors
  DROP CONSTRAINT IF EXISTS seo_competitors_declaration_authorship_check;
ALTER TABLE greenhouse_growth.seo_competitors
  DROP CONSTRAINT IF EXISTS seo_competitors_declared_source_check;
ALTER TABLE greenhouse_growth.seo_competitors
  DROP COLUMN IF EXISTS retired_reason,
  DROP COLUMN IF EXISTS retired_by,
  DROP COLUMN IF EXISTS proposal_ref,
  DROP COLUMN IF EXISTS declared_source,
  DROP COLUMN IF EXISTS declared_at,
  DROP COLUMN IF EXISTS declared_by;
