-- Up Migration

-- TASK-1699 — Growth SEO: persistir el top-N del SERP que YA se paga (EPIC-022, brecha S2).
--
-- Cada corrida diaria de rank capture compra el SERP completo hasta la posición 20
-- (multiplicador `depth 20` pagado, `rank-capture.ts`) y `parseSerpRankObservation` se queda
-- con NUESTRA fila y descarta ~19. Esta tabla las persiste: costo marginal CERO — se llena
-- EXCLUSIVAMENTE con la respuesta que el rank capture ya trajo; ninguna llamada nueva.
--
-- Es la única serie del plan cuyo costo de demora es irrecuperable: el SERP de ayer no se
-- recompra. Append-only estricta (mediciones fechadas): trigger anti UPDATE/DELETE y GRANTs
-- SIN UPDATE ni DELETE — MÁS estricta que sus hermanas de 1299, que necesitan UPDATE por
-- upserts de consolidación; acá no existe ninguno.
--
-- 🔴 La RANURA del SERP es `rank_absolute`, NUNCA `rank_group`: `rank_group` es la posición
-- dentro del bloque de su tipo y SE REPITE entre bloques (un orgánico #3 y un video #3
-- comparten rank_group=3). Con `ON CONFLICT DO NOTHING`, usar rank_group como clave no da
-- error: DESCARTA la segunda fila en silencio. Se guardan ambas posiciones; la clave es la
-- absoluta.
--
-- NOTA de alcance (recalibración 2026-08-28): la spec original pedía además columnas de
-- autoría en `seo_competitors` — YA EXISTEN (migración 20260828113457119, TASK-1662, con un
-- modelo más rico: declared_by/at/source + proposal_ref + retiro con autoría). Esta
-- migración NO toca `seo_competitors`.

CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_serp_top_results (
  serp_result_id  TEXT PRIMARY KEY DEFAULT ('seosr-' || gen_random_uuid()::text),
  seo_target_id   TEXT NOT NULL
    REFERENCES greenhouse_growth.seo_targets (seo_target_id) ON DELETE RESTRICT,
  keyword         TEXT NOT NULL,
  engine          TEXT NOT NULL,
  device          TEXT NOT NULL CHECK (device IN ('desktop', 'mobile', 'tablet')),
  capture_date    DATE NOT NULL,
  -- La ranura absoluta del SERP completo (única a lo largo de todos los bloques).
  rank_absolute   INTEGER NOT NULL CHECK (rank_absolute > 0),
  -- Posición dentro del bloque de su tipo (la que se reporta como "posición orgánica").
  rank_group      INTEGER CHECK (rank_group IS NULL OR rank_group > 0),
  -- organic | ai_overview | people_also_ask | video | local_pack | ... (vocabulario del
  -- proveedor, abierto a propósito: filtrar hoy es decidir por el consumidor de mañana).
  item_type       TEXT NOT NULL,
  result_domain   TEXT,
  result_url      TEXT,
  result_title    TEXT,
  is_own_domain   BOOLEAN NOT NULL DEFAULT FALSE,
  source_run_id   TEXT,
  captured_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT seo_serp_top_results_slot_unique
    UNIQUE (seo_target_id, keyword, engine, device, capture_date, rank_absolute)
);

-- Serie temporal del target (la lectura dominante) y recurrencia por dominio (el
-- descubrimiento de competidores agrupa por result_domain sobre la ventana).
CREATE INDEX IF NOT EXISTS seo_serp_top_results_target_date_idx
  ON greenhouse_growth.seo_serp_top_results (seo_target_id, capture_date DESC);
CREATE INDEX IF NOT EXISTS seo_serp_top_results_domain_idx
  ON greenhouse_growth.seo_serp_top_results (seo_target_id, result_domain, capture_date DESC);

-- Append-only estricto: una medición del SERP es un hecho fechado; reescribirla es
-- falsificar el histórico que esta tabla existe para tener.
DROP TRIGGER IF EXISTS trg_seo_serp_top_results_append_only
  ON greenhouse_growth.seo_serp_top_results;
CREATE TRIGGER trg_seo_serp_top_results_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_growth.seo_serp_top_results
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_seo_row_mutation();

-- ── Anti pre-up-marker guard (ISSUE-068) ───────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'greenhouse_growth' AND table_name = 'seo_serp_top_results'
  ) THEN
    RAISE EXCEPTION 'TASK-1699 anti pre-up-marker: seo_serp_top_results no fue creada. Markers posiblemente invertidos.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'seo_serp_top_results_slot_unique' AND contype = 'u'
  ) THEN
    RAISE EXCEPTION 'TASK-1699 anti pre-up-marker: falta la UNIQUE por ranura (rank_absolute).';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'greenhouse_growth'
       AND NOT t.tgisinternal
       AND t.tgname = 'trg_seo_serp_top_results_append_only'
  ) THEN
    RAISE EXCEPTION 'TASK-1699 anti pre-up-marker: falta el trigger append-only.';
  END IF;

  -- Bug class DATE vs TIMESTAMP (gate TASK-893): capture_date DEBE ser DATE.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'greenhouse_growth'
       AND table_name = 'seo_serp_top_results'
       AND column_name = 'capture_date'
       AND data_type <> 'date'
  ) THEN
    RAISE EXCEPTION 'TASK-1699 anti pre-up-marker: capture_date debe ser DATE.';
  END IF;
END
$$;

-- ── Ownership + GRANTs (append-only ESTRICTO: sin UPDATE ni DELETE) ────────

ALTER TABLE greenhouse_growth.seo_serp_top_results OWNER TO greenhouse_ops;

GRANT SELECT, INSERT ON greenhouse_growth.seo_serp_top_results TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_growth.seo_serp_top_results TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.seo_serp_top_results TO greenhouse_migrator_user;

-- Down Migration

-- ⚠️ Sólo mientras la tabla esté vacía: con datos, revertir borra una serie que NO se
-- recompra — el rollback correcto pasa a ser conservar la tabla y apagar el flag.
DROP TRIGGER IF EXISTS trg_seo_serp_top_results_append_only
  ON greenhouse_growth.seo_serp_top_results;
DROP TABLE IF EXISTS greenhouse_growth.seo_serp_top_results;
