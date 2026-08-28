-- Up Migration

-- TASK-1700 — Growth SEO: la cola priorizada de trabajo como aggregate append-only
-- (EPIC-022, brecha S1 de la auditoría 2026-08-15).
--
-- El módulo tenía CUATRO listas con cuatro criterios de orden no comparables entre sí (mapa
-- de oportunidades, gap SEO↔AEO por cuadrante, discovery con su sort compuesto de 8 llaves,
-- y el gap competitivo sin orden propio). Cada una ordena bien según su lógica y nadie puede
-- decir cuál de los cuatro #1 va primero. Estas tres tablas son la ÚNICA autoridad de orden.
--
-- ═══ Por qué aggregate PERSISTIDO y no reader en vivo ═══
--
-- 1. Un origen no se puede unir por SQL: `readSeoAeoGap` son dos queries unidas en memoria
--    POR DISEÑO (motores aislados, providers/cadencias/breakers distintos). Una VIEW queda
--    descartada de entrada — el gap entra como filas con `origin='aeo_gap'` y una
--    `evidence_ref` OPACA.
-- 2. Reproducibilidad: un reader que reordena en cada llamada hace que "la recomendación #1
--    de la mañana" sea inauditable a las 3 pm.
-- 3. El score existía sin versionar (constantes de módulo en keyword-opportunities-reader.ts):
--    cambiar un umbral movía el ranking histórico completo sin dejar rastro.
--
-- ═══ Invariantes que este DDL hace cumplir (no son convención de TS) ═══
--
-- 🔴 SIN DEMANDA MEDIDA NO HAY SCORE. Es el invariante ● medido / ◑ estimado aplicado al
--    ORDENAMIENTO. El CHECK `basis_band_score` ata las tres cosas: un item sin impresiones
--    de GSC NO puede recibir un score fabricado desde el volumen estimado del proveedor —
--    recibe NULL y cae a la banda 3, cuyo verbo honesto es `measure`. En es-LATAM el volumen
--    del proveedor es justo donde mide peor (ISSUE-152), así que ordenar por él sería
--    ordenar por la peor señal disponible teniendo la mejor al lado.
--
-- 🔴 APPEND-ONLY ESTRICTO. Recomputar es un snapshot NUEVO. El snapshot anterior es la
--    evidencia de qué se recomendó y cuándo; un UPDATE la falsifica. Trigger + GRANTs sin
--    UPDATE/DELETE (dos capas independientes). Incluye "marcar el item como hecho": esa es
--    una fila en `..._decisions`, jamás una mutación del item.
--
-- 🔴 `priority_score_version` + `score_breakdown_json` EXISTEN DESDE ESTA MIGRACIÓN. Es lo
--    único irreversible del plan: desde que hay un snapshot productivo sin versión ni
--    breakdown, la evidencia de con qué reglas se recomendó está perdida para siempre.
--
-- 🔴 `evidence_ref` es OPACA (`<motor>:<entidad>:<id>`): TEXT, sin FK, sin JOIN. Es lo que
--    mantiene el boundary §1.1 — cero acople entre `seo_*` y `grader_*`.
--
-- Nota date-math (gate TASK-893): acá no hay resta de fechas. `expires_at`/`computed_at` son
-- TIMESTAMPTZ y se comparan entre sí; ningún consumidor debe hacer
-- `EXTRACT(EPOCH FROM (date_a - date_b))` sobre estas columnas.

-- ── Snapshots: una corrida del materializador ──────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_work_queue_snapshots (
  snapshot_id            TEXT PRIMARY KEY DEFAULT ('seowqs-' || gen_random_uuid()::text),
  organization_id        TEXT NOT NULL
    REFERENCES greenhouse_core.organizations (organization_id),
  seo_target_id          TEXT NOT NULL
    REFERENCES greenhouse_growth.seo_targets (seo_target_id),

  priority_score_version TEXT        NOT NULL,
  -- Hash de los insumos: misma entrada => mismo snapshot (idempotencia sin lock aplicativo).
  input_snapshot_hash    TEXT        NOT NULL,
  window_days            INTEGER     NOT NULL CHECK (window_days > 0),

  -- [{ origin, state: 'ok'|'degraded'|'down', reason, asOf }] — SIEMPRE los seis orígenes.
  -- Un origen caído NO baja el score de los demás: sus filas simplemente no existen en este
  -- snapshot. Cero ceros fantasma, cero relleno.
  origin_health_json     JSONB       NOT NULL,
  item_count             INTEGER     NOT NULL CHECK (item_count >= 0),

  materialized_by        TEXT        NOT NULL,
  computed_at            TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  expires_at             TIMESTAMPTZ NOT NULL,

  CONSTRAINT seo_work_queue_snapshots_idempotency_unique
    UNIQUE (organization_id, seo_target_id, priority_score_version, input_snapshot_hash),
  CONSTRAINT seo_work_queue_snapshots_expiry_after_computed
    CHECK (expires_at > computed_at)
);

-- ── Items: una fila puntuable del snapshot ─────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_work_queue_items (
  item_id                TEXT PRIMARY KEY DEFAULT ('seowqi-' || gen_random_uuid()::text),
  snapshot_id            TEXT NOT NULL
    REFERENCES greenhouse_growth.seo_work_queue_snapshots (snapshot_id) ON DELETE RESTRICT,

  -- Vocabulario CERRADO: agregar un origen es una migración, no un string nuevo en TS.
  origin                 TEXT NOT NULL CHECK (origin IN (
                           'gsc_striking_distance', 'discovery_candidate', 'declared_target',
                           'aeo_gap', 'competitor_gap', 'consolidation')),
  normalized_keyword     TEXT NOT NULL,
  target_url             TEXT,

  -- La canibalización NO es una keyword que empujar: son dos URLs que fusionar. Ordenarla
  -- junto a un "optimizar" haría que el operador tome la acción equivocada.
  recommended_verb       TEXT NOT NULL CHECK (recommended_verb IN
                           ('optimize', 'create', 'consolidate', 'measure')),

  score_basis            TEXT NOT NULL CHECK (score_basis IN
                           ('measured_incremental_clicks', 'measured_without_curve',
                            'no_measured_demand')),
  score_band             SMALLINT NOT NULL CHECK (score_band IN (1, 2, 3)),
  -- Clics incrementales estimados. NULL cuando no se puede afirmar honestamente.
  priority_score         NUMERIC(14, 4),
  priority_score_version TEXT NOT NULL,
  score_breakdown_json   JSONB NOT NULL,

  -- Procedencia OPACA: nunca FK, nunca target de JOIN. `<motor>:<entidad>:<id>`.
  evidence_ref           TEXT NOT NULL,
  -- Versión del score del motor de origen. Obligatoria para el lado AEO: sin ella una
  -- recalibración del grader movería filas de la cola sin que nadie pueda decir por qué.
  source_score_version   TEXT,

  rank_in_snapshot       INTEGER NOT NULL CHECK (rank_in_snapshot > 0),

  -- 🔴 El invariante ●/◑ aplicado al ORDENAMIENTO, en el esquema y no en el código.
  CONSTRAINT seo_work_queue_items_basis_band_score CHECK (
    (score_basis = 'measured_incremental_clicks' AND score_band = 1 AND priority_score IS NOT NULL)
    OR (score_basis = 'measured_without_curve'   AND score_band = 2 AND priority_score IS NULL)
    OR (score_basis = 'no_measured_demand'       AND score_band = 3 AND priority_score IS NULL)
  ),
  CONSTRAINT seo_work_queue_items_aeo_requires_source_version CHECK (
    origin <> 'aeo_gap' OR source_score_version IS NOT NULL
  ),
  -- La unidad puntuable es la keyword normalizada por origen, no la fila de procedencia
  -- (TASK-1694): un score por procedencia habría persistido la misma decisión hasta cuatro
  -- veces sobre una sola intención, en una tabla append-only.
  CONSTRAINT seo_work_queue_items_unique_subject
    UNIQUE (snapshot_id, origin, normalized_keyword)
);

-- ── Decisiones: ancladas al SUJETO, no a la fila ───────────────────────────
--
-- Los items se regeneran en cada snapshot: una decisión atada al `item_id` moriría mañana.
-- Se ancla a (seo_target_id, origin, normalized_keyword) y guarda item/snapshot como
-- evidencia de QUÉ estaba mirando el operador cuando decidió.

CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_work_queue_decisions (
  decision_id        TEXT PRIMARY KEY DEFAULT ('seowqd-' || gen_random_uuid()::text),
  organization_id    TEXT NOT NULL
    REFERENCES greenhouse_core.organizations (organization_id),
  seo_target_id      TEXT NOT NULL
    REFERENCES greenhouse_growth.seo_targets (seo_target_id),

  origin             TEXT NOT NULL CHECK (origin IN (
                       'gsc_striking_distance', 'discovery_candidate', 'declared_target',
                       'aeo_gap', 'competitor_gap', 'consolidation')),
  normalized_keyword TEXT NOT NULL,

  decision           TEXT NOT NULL CHECK (decision IN
                       ('accepted', 'deferred', 'dismissed', 'done')),
  note               TEXT,

  item_id            TEXT REFERENCES greenhouse_growth.seo_work_queue_items (item_id),
  snapshot_id        TEXT REFERENCES greenhouse_growth.seo_work_queue_snapshots (snapshot_id),

  decided_by         TEXT        NOT NULL,
  decided_at         TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ── Índices de lectura ─────────────────────────────────────────────────────

-- Snapshot vigente del target (la lectura dominante del reader).
CREATE INDEX IF NOT EXISTS seo_work_queue_snapshots_target_computed_idx
  ON greenhouse_growth.seo_work_queue_snapshots (seo_target_id, computed_at DESC);

-- Orden canónico + paginación por keyset. `normalized_keyword` como desempate final es lo
-- que hace la paginación determinista: el universo no crece bajo el cursor porque el
-- snapshot es inmutable.
CREATE INDEX IF NOT EXISTS seo_work_queue_items_order_idx
  ON greenhouse_growth.seo_work_queue_items
     (snapshot_id, score_band, priority_score DESC NULLS LAST, normalized_keyword);

-- Última decisión por sujeto (los colectores la consultan para no reproponer lo descartado).
CREATE INDEX IF NOT EXISTS seo_work_queue_decisions_subject_idx
  ON greenhouse_growth.seo_work_queue_decisions
     (seo_target_id, origin, normalized_keyword, decided_at DESC);

-- ── Append-only: trigger en las TRES tablas ────────────────────────────────
--
-- Reusa `block_seo_row_mutation()` (TASK-1299), que nombra la tabla por TG_TABLE_NAME.

DROP TRIGGER IF EXISTS trg_seo_work_queue_snapshots_append_only
  ON greenhouse_growth.seo_work_queue_snapshots;
CREATE TRIGGER trg_seo_work_queue_snapshots_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_growth.seo_work_queue_snapshots
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_seo_row_mutation();

DROP TRIGGER IF EXISTS trg_seo_work_queue_items_append_only
  ON greenhouse_growth.seo_work_queue_items;
CREATE TRIGGER trg_seo_work_queue_items_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_growth.seo_work_queue_items
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_seo_row_mutation();

DROP TRIGGER IF EXISTS trg_seo_work_queue_decisions_append_only
  ON greenhouse_growth.seo_work_queue_decisions;
CREATE TRIGGER trg_seo_work_queue_decisions_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_growth.seo_work_queue_decisions
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_seo_row_mutation();

-- ── Anti pre-up-marker guard (ISSUE-068) ───────────────────────────────────
--
-- `pnpm migrate:up` responde "Migrations complete!" aunque la sección Up haya quedado vacía
-- por markers invertidos: la migración se registra en `pgmigrations` sin ejecutar una línea.
-- Este bloque aborta si el DDL load-bearing no quedó aplicado.

DO $$
DECLARE
  missing_tables  integer;
  missing_checks  integer;
  missing_trigger integer;
BEGIN
  SELECT 3 - COUNT(*) INTO missing_tables
    FROM information_schema.tables
   WHERE table_schema = 'greenhouse_growth'
     AND table_name IN ('seo_work_queue_snapshots', 'seo_work_queue_items',
                        'seo_work_queue_decisions');

  IF missing_tables <> 0 THEN
    RAISE EXCEPTION 'TASK-1700 anti pre-up-marker: faltan % de las 3 tablas de la cola. Markers posiblemente invertidos.', missing_tables;
  END IF;

  -- Los tres constraints que sostienen invariantes, no comodidad: la idempotencia del
  -- materializador, el invariante ●/◑ sobre el orden, y la trazabilidad del lado AEO.
  SELECT 3 - COUNT(*) INTO missing_checks
    FROM pg_constraint
   WHERE conname IN ('seo_work_queue_snapshots_idempotency_unique',
                     'seo_work_queue_items_basis_band_score',
                     'seo_work_queue_items_aeo_requires_source_version');

  IF missing_checks <> 0 THEN
    RAISE EXCEPTION 'TASK-1700 anti pre-up-marker: faltan % constraints load-bearing (idempotencia / basis-band-score / aeo-source-version).', missing_checks;
  END IF;

  SELECT 3 - COUNT(*) INTO missing_trigger
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'greenhouse_growth'
     AND NOT t.tgisinternal
     AND t.tgname IN ('trg_seo_work_queue_snapshots_append_only',
                      'trg_seo_work_queue_items_append_only',
                      'trg_seo_work_queue_decisions_append_only');

  IF missing_trigger <> 0 THEN
    RAISE EXCEPTION 'TASK-1700 anti pre-up-marker: faltan % triggers append-only.', missing_trigger;
  END IF;

  -- El vocabulario cerrado tiene que ser CERRADO: si el CHECK de `origin` no existe, un
  -- string nuevo entraría sin migración y el aggregate perdería su contrato.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'greenhouse_growth.seo_work_queue_items'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) LIKE '%gsc_striking_distance%'
  ) THEN
    RAISE EXCEPTION 'TASK-1700 anti pre-up-marker: falta el CHECK de vocabulario cerrado de origin.';
  END IF;
END
$$;

-- ── Ownership + GRANTs (append-only ESTRICTO: sin UPDATE ni DELETE) ────────
--
-- Segunda capa independiente del trigger: aunque alguien lo dropee, el rol de runtime
-- sigue sin poder mutar una fila.

ALTER TABLE greenhouse_growth.seo_work_queue_snapshots OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.seo_work_queue_items     OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.seo_work_queue_decisions OWNER TO greenhouse_ops;

GRANT SELECT, INSERT ON greenhouse_growth.seo_work_queue_snapshots TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_growth.seo_work_queue_items     TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_growth.seo_work_queue_decisions TO greenhouse_runtime;

GRANT SELECT, INSERT ON greenhouse_growth.seo_work_queue_snapshots TO greenhouse_app;
GRANT SELECT, INSERT ON greenhouse_growth.seo_work_queue_items     TO greenhouse_app;
GRANT SELECT, INSERT ON greenhouse_growth.seo_work_queue_decisions TO greenhouse_app;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON greenhouse_growth.seo_work_queue_snapshots TO greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON greenhouse_growth.seo_work_queue_items     TO greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON greenhouse_growth.seo_work_queue_decisions TO greenhouse_migrator_user;

-- Down Migration

-- Aditiva y sin dependientes: con el flag OFF nadie lee estas tablas. Con snapshots
-- productivos escritos, el rollback correcto es apagar el flag y CONSERVARLAS — son la
-- evidencia de qué se recomendó y cuándo, y eso no se recompra.
DROP TRIGGER IF EXISTS trg_seo_work_queue_decisions_append_only
  ON greenhouse_growth.seo_work_queue_decisions;
DROP TRIGGER IF EXISTS trg_seo_work_queue_items_append_only
  ON greenhouse_growth.seo_work_queue_items;
DROP TRIGGER IF EXISTS trg_seo_work_queue_snapshots_append_only
  ON greenhouse_growth.seo_work_queue_snapshots;

DROP TABLE IF EXISTS greenhouse_growth.seo_work_queue_decisions;
DROP TABLE IF EXISTS greenhouse_growth.seo_work_queue_items;
DROP TABLE IF EXISTS greenhouse_growth.seo_work_queue_snapshots;
