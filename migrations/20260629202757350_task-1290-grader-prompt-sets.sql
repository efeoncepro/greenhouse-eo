-- Up Migration

-- TASK-1290 Slice 2 — Artefacto del prompt set por marca (versionado + inmutable).
--
-- El generador de prompts AEO sigue el patrón LLM-autora-luego-congela: un set se autora (LLM o
-- baseline), se revisa y se APRUEBA → queda `active` (congelado); los runs usan el set `active`
-- (deterministas, reproducibles, sin costo LLM por run). Un perfil tiene a lo sumo UN set `active`
-- (partial unique index); aprobar uno nuevo supersede el anterior (append-only, no edit-in-place).
-- `prompts_json` guarda queries ESTRUCTURADAS (mismo shape que el pack: id/family/fanOutType/
-- intentStage/namesBrand/text TEMPLATE + rationale/groundingRef opcionales para el review TASK-1291);
-- el scorer lee esos tags (que viajan con el run, Slice 0). El scoring NO cambia.

SET search_path TO public, greenhouse_growth;

CREATE TABLE IF NOT EXISTS greenhouse_growth.grader_prompt_sets (
  set_id                TEXT PRIMARY KEY DEFAULT ('gps-' || gen_random_uuid()::text),
  profile_id            TEXT NOT NULL,
  version               INTEGER NOT NULL,
  business_model        TEXT,
  category_node_id      TEXT,
  -- Queries estructuradas (TEMPLATE con {{brand}}/{{category}}/{{market}}/{{competitor}}/{{year}}).
  prompts_json          JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- 'llm' = autorado por LLM (Slice 3); 'template_baseline' = derivado del baseline del arquetipo.
  generation_strategy   TEXT NOT NULL
    CHECK (generation_strategy IN ('llm', 'template_baseline')),
  model                 TEXT,
  -- Versión del "cerebro" AEO autor (eval-gated): cambiarla re-dispara la eval (TASK-1292).
  system_prompt_version TEXT,
  -- Qué señales reales se usaron al autorar (provenance): site_probe/competitors/entity/etc.
  grounding_sources_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status                TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'active', 'superseded')),
  created_by            TEXT NOT NULL,
  approved_by           TEXT,
  approved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT grader_prompt_sets_profile_fkey
    FOREIGN KEY (profile_id) REFERENCES greenhouse_growth.grader_profiles (profile_id) ON DELETE CASCADE,
  CONSTRAINT grader_prompt_sets_profile_version_unique UNIQUE (profile_id, version)
);

-- A lo sumo UN set `active` por perfil (el que usan los runs).
CREATE UNIQUE INDEX IF NOT EXISTS grader_prompt_sets_one_active_per_profile_idx
  ON greenhouse_growth.grader_prompt_sets (profile_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS grader_prompt_sets_profile_status_idx
  ON greenhouse_growth.grader_prompt_sets (profile_id, status, created_at DESC);

-- touch updated_at (reusa la función compartida del schema growth).
DROP TRIGGER IF EXISTS trg_grader_prompt_sets_touch_updated_at ON greenhouse_growth.grader_prompt_sets;
CREATE TRIGGER trg_grader_prompt_sets_touch_updated_at
  BEFORE UPDATE ON greenhouse_growth.grader_prompt_sets
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.touch_updated_at();

-- Provenance del prompt set en el run (qué set/versión se usó; NULL = baseline/pack agencia).
ALTER TABLE greenhouse_growth.grader_runs
  ADD COLUMN IF NOT EXISTS prompt_set_id      TEXT,
  ADD COLUMN IF NOT EXISTS prompt_set_version INTEGER;

GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.grader_prompt_sets TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.grader_prompt_sets TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.grader_prompt_sets TO greenhouse_migrator_user;

-- Anti pre-up-marker guard (ISSUE-068): aborta si la tabla o las columnas no quedaron creadas.
DO $$
DECLARE
  tbl int;
  cols int;
BEGIN
  SELECT COUNT(*) INTO tbl
  FROM information_schema.tables
  WHERE table_schema = 'greenhouse_growth' AND table_name = 'grader_prompt_sets';

  SELECT COUNT(*) INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_growth'
    AND table_name = 'grader_runs'
    AND column_name IN ('prompt_set_id', 'prompt_set_version');

  IF tbl <> 1 OR cols <> 2 THEN
    RAISE EXCEPTION 'TASK-1290 anti pre-up-marker check: grader_prompt_sets/run provenance NOT created (tbl=%, cols=%). Migration markers may be inverted.', tbl, cols;
  END IF;
END
$$;

-- Down Migration

SET search_path TO public, greenhouse_growth;

ALTER TABLE greenhouse_growth.grader_runs
  DROP COLUMN IF EXISTS prompt_set_id,
  DROP COLUMN IF EXISTS prompt_set_version;

DROP TRIGGER IF EXISTS trg_grader_prompt_sets_touch_updated_at ON greenhouse_growth.grader_prompt_sets;
DROP TABLE IF EXISTS greenhouse_growth.grader_prompt_sets;
