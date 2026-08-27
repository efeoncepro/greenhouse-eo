-- Up Migration

-- TASK-1709 — Carril de diagnóstico de prospecto (tier `prospect` del módulo SEO).
--
-- El sujeto de este carril es el par (root_domain, mercado, idioma), NO una organización:
-- un prospecto no tiene org ni seo_target (precedente: grader_profiles.organization_id
-- nació nullable). Por eso la tabla NO tiene FK a greenhouse_core.organizations — §17.3
-- del SEO module prohíbe FKs nuevas desde seo_* salvo el ancla org, y este sujeto no la
-- necesita. El gasto se atribuye aparte, en seo_provider_spend_daily, a la org canónica
-- de Efeonce (costo de adquisición), resuelta server-side.
--
-- Invariantes de diseño deliberadas (no las "arregles"):
--   * NO existe columna next_run_at ni ningún campo de scheduling: la captura recurrente
--     sobre un prospecto está PROHIBIDA (regla dura de la task). Re-correr = fila nueva
--     con actor humano.
--   * NO existe campo de score/veredicto/salud: el diagnóstico enumera hechos, jamás
--     certifica que un sitio está sano.
--   * El CHECK de lens admite UN solo valor ('estimated'): no hay Search Console de un
--     prospecto, así que no existe dato medido en este carril (ISSUE-154).

CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_prospect_diagnostics (
  diagnostic_id      TEXT PRIMARY KEY DEFAULT ('seopd-' || gen_random_uuid()::text),
  root_domain        TEXT NOT NULL CHECK (root_domain = lower(root_domain) AND root_domain <> ''),
  market             TEXT NOT NULL CHECK (market = upper(market) AND length(market) = 2),
  location_code      INTEGER NOT NULL CHECK (location_code > 0),
  language_code      TEXT NOT NULL CHECK (language_code <> ''),
  status             TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed')),
  run_date           DATE NOT NULL DEFAULT CURRENT_DATE,
  cost_ceiling_usd   NUMERIC(10, 4) NOT NULL CHECK (cost_ceiling_usd >= 0),
  forecast_cost_usd  NUMERIC(10, 4) NOT NULL CHECK (forecast_cost_usd >= 0),
  provider_cost_usd  NUMERIC(10, 4) CHECK (provider_cost_usd >= 0),
  competitor_domains TEXT[] NOT NULL DEFAULT '{}',
  failure_reason     TEXT,
  created_by         TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at       TIMESTAMPTZ
);

-- Idempotencia por (dominio, mercado, idioma, día): la fila 'running'/'completed' ES el
-- claim — un segundo disparo el mismo día choca acá, lee la existente y gasta USD 0.
-- Un run 'failed' libera el slot (se puede reintentar el mismo día).
CREATE UNIQUE INDEX IF NOT EXISTS seo_prospect_diagnostics_daily_idem_idx
  ON greenhouse_growth.seo_prospect_diagnostics (root_domain, location_code, language_code, run_date)
  WHERE status IN ('running', 'completed');

CREATE INDEX IF NOT EXISTS seo_prospect_diagnostics_domain_idx
  ON greenhouse_growth.seo_prospect_diagnostics (root_domain, created_at DESC);

CREATE INDEX IF NOT EXISTS seo_prospect_diagnostics_actor_day_idx
  ON greenhouse_growth.seo_prospect_diagnostics (created_by, run_date);

CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_prospect_diagnostic_facts (
  fact_id       TEXT PRIMARY KEY DEFAULT ('seopf-' || gen_random_uuid()::text),
  diagnostic_id TEXT NOT NULL
    REFERENCES greenhouse_growth.seo_prospect_diagnostics (diagnostic_id) ON DELETE RESTRICT,
  kind          TEXT NOT NULL CHECK (kind IN (
    'ranked_keywords_total',
    'ranked_keywords_top10',
    'striking_distance_keywords',
    'ai_overview_citations',
    'estimated_monthly_traffic',
    'competitors_identified',
    'link_gap_referring_domains',
    'site_robots_txt',
    'site_jsonld_blocks',
    'site_sitemap',
    'site_home_observability',
    'site_crawl_blocked',
    'onpage_critical_findings'
  )),
  -- magnitude NULL = "no lo medimos", JAMÁS 0 (degradación honesta, invariante del grader).
  magnitude     NUMERIC,
  lens          TEXT NOT NULL DEFAULT 'estimated' CHECK (lens IN ('estimated')),
  captured_at   TIMESTAMPTZ NOT NULL,
  source        TEXT NOT NULL CHECK (source IN (
    'labs_ranked_keywords',
    'labs_competitors_domain',
    'backlinks_competitors',
    'backlinks_domain_intersection',
    'onpage_reads',
    'site_substrate'
  )),
  detail_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS seo_prospect_diagnostic_facts_diag_idx
  ON greenhouse_growth.seo_prospect_diagnostic_facts (diagnostic_id, kind);

-- Guardas de mutación (mismo helper append-only de TASK-1299):
--   * facts: append-only estricto (ni UPDATE ni DELETE — recomputar es diagnóstico nuevo);
--   * diagnostics: DELETE prohibido (la transición running→completed/failed sí es UPDATE
--     del run dueño; la historia no se borra).
DROP TRIGGER IF EXISTS trg_seo_prospect_diagnostic_facts_append_only
  ON greenhouse_growth.seo_prospect_diagnostic_facts;
CREATE TRIGGER trg_seo_prospect_diagnostic_facts_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_growth.seo_prospect_diagnostic_facts
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_seo_row_mutation();

DROP TRIGGER IF EXISTS trg_seo_prospect_diagnostics_no_delete
  ON greenhouse_growth.seo_prospect_diagnostics;
CREATE TRIGGER trg_seo_prospect_diagnostics_no_delete
  BEFORE DELETE ON greenhouse_growth.seo_prospect_diagnostics
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_seo_row_mutation();

-- Anti pre-up-marker bug guard (ISSUE-068): aborta si el DDL no quedó aplicado de verdad.
DO $$
DECLARE
  table_count integer;
  trigger_count integer;
  idem_index_count integer;
  lens_check_ok boolean;
  scheduling_column_count integer;
BEGIN
  SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
   WHERE table_schema = 'greenhouse_growth'
     AND table_name IN ('seo_prospect_diagnostics', 'seo_prospect_diagnostic_facts');

  IF table_count <> 2 THEN
    RAISE EXCEPTION 'TASK-1709 anti pre-up-marker: expected 2 prospect tables, got %. Markers may be inverted.', table_count;
  END IF;

  SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
   WHERE trigger_schema = 'greenhouse_growth'
     AND trigger_name IN ('trg_seo_prospect_diagnostic_facts_append_only', 'trg_seo_prospect_diagnostics_no_delete');

  IF trigger_count < 2 THEN
    RAISE EXCEPTION 'TASK-1709 anti pre-up-marker: expected 2 mutation-guard triggers, got %.', trigger_count;
  END IF;

  SELECT COUNT(*) INTO idem_index_count
    FROM pg_indexes
   WHERE schemaname = 'greenhouse_growth'
     AND indexname = 'seo_prospect_diagnostics_daily_idem_idx';

  IF idem_index_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1709 anti pre-up-marker: daily idempotency index missing.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.check_constraints cc
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = cc.constraint_name AND ccu.constraint_schema = cc.constraint_schema
     WHERE ccu.table_schema = 'greenhouse_growth'
       AND ccu.table_name = 'seo_prospect_diagnostic_facts'
       AND ccu.column_name = 'lens'
       AND cc.check_clause LIKE '%estimated%'
  ) INTO lens_check_ok;

  IF NOT lens_check_ok THEN
    RAISE EXCEPTION 'TASK-1709 anti pre-up-marker: lens CHECK (single value estimated) missing.';
  END IF;

  -- La ausencia de scheduling es un invariante del carril, no un olvido: si alguien
  -- agrega next_run_at en un fork de esta migración, esto lo detiene acá.
  SELECT COUNT(*) INTO scheduling_column_count
    FROM information_schema.columns
   WHERE table_schema = 'greenhouse_growth'
     AND table_name = 'seo_prospect_diagnostics'
     AND column_name IN ('next_run_at', 'schedule', 'cron');

  IF scheduling_column_count <> 0 THEN
    RAISE EXCEPTION 'TASK-1709 invariant: seo_prospect_diagnostics must NOT have scheduling columns (found %).', scheduling_column_count;
  END IF;
END
$$;

-- GRANTs (espejo del resto de greenhouse_growth): runtime lee y escribe, sin DELETE.
GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.seo_prospect_diagnostics TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_growth.seo_prospect_diagnostic_facts TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.seo_prospect_diagnostics TO greenhouse_app;
GRANT SELECT, INSERT ON greenhouse_growth.seo_prospect_diagnostic_facts TO greenhouse_app;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_growth.seo_prospect_diagnostic_facts;
DROP TABLE IF EXISTS greenhouse_growth.seo_prospect_diagnostics;
