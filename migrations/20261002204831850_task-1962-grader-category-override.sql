-- Up Migration

-- TASK-1962 — Corrección humana de la categoría de un perfil AEO (Grader), espejo del override de modelo de negocio
-- (TASK-1289). Caso fuente: Berel quedó clasificado como «Manufactura» y el análisis preguntaba por empresas de
-- manufactura (los motores respondían sobre empleo). Expand-only: un valor nuevo en el CHECK de la fuente, un historial
-- append-only y la capability dedicada.

-- 1. La fuente de la categoría admite el override del operador.
ALTER TABLE greenhouse_growth.grader_profiles
  DROP CONSTRAINT IF EXISTS grader_profiles_category_source_check;

ALTER TABLE greenhouse_growth.grader_profiles
  ADD CONSTRAINT grader_profiles_category_source_check
  CHECK (
    category_source IS NULL
    OR category_source IN ('brand_intelligence', 'hubspot_map', 'taxonomy_alias', 'unknown', 'operator_override')
  );

-- 2. Historial append-only de cambios de categoría (de → a, fuente, motivo, actor).
CREATE TABLE IF NOT EXISTS greenhouse_growth.grader_category_history (
  history_id         TEXT PRIMARY KEY DEFAULT ('gcth-' || gen_random_uuid()::text),
  profile_id         TEXT NOT NULL,
  organization_id    TEXT,
  from_node_id       TEXT,
  from_label         TEXT,
  to_node_id         TEXT NOT NULL,
  to_label           TEXT NOT NULL,
  to_source          TEXT NOT NULL CHECK (to_source IN ('brand_intelligence', 'hubspot_map', 'taxonomy_alias', 'operator_override', 'unknown')),
  taxonomy_version   TEXT NOT NULL,
  reason             TEXT,
  changed_by         TEXT NOT NULL,
  changed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT grader_category_history_profile_fkey
    FOREIGN KEY (profile_id) REFERENCES greenhouse_growth.grader_profiles (profile_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS grader_category_history_profile_idx
  ON greenhouse_growth.grader_category_history (profile_id, changed_at DESC);

CREATE OR REPLACE FUNCTION greenhouse_growth.block_category_history_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'greenhouse_growth.grader_category_history es append-only (TASK-1962): % bloqueado.', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_grader_category_history_append_only ON greenhouse_growth.grader_category_history;
CREATE TRIGGER trg_grader_category_history_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_growth.grader_category_history
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_category_history_mutation();

GRANT SELECT, INSERT ON greenhouse_growth.grader_category_history TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_growth.grader_category_history TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.grader_category_history TO greenhouse_migrator_user;

-- 3. Capability dedicada (parity con entitlements-catalog.ts; grant en runtime.ts = set operador del Grader).
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'growth.ai_visibility.profile.set_category',
    'growth',
    ARRAY['execute'],
    ARRAY['tenant'],
    'TASK-1962 — Corrección de la categoría (nodo de la taxonomía canónica) de un perfil AEO cuando la clasificación automática se equivocó, con historial append-only. Write gobernado del operador (Growth/AM). Grant: set operador del Grader.',
    NOW(),
    NULL
  )
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- Anti pre-up-marker guard (ISSUE-068).
DO $$
DECLARE
  tbl int;
  cap int;
  chk text;
BEGIN
  SELECT COUNT(*) INTO tbl FROM information_schema.tables
   WHERE table_schema = 'greenhouse_growth' AND table_name = 'grader_category_history';

  SELECT COUNT(*) INTO cap FROM greenhouse_core.capabilities_registry
   WHERE capability_key = 'growth.ai_visibility.profile.set_category' AND deprecated_at IS NULL;

  SELECT pg_get_constraintdef(oid) INTO chk FROM pg_constraint
   WHERE conrelid = 'greenhouse_growth.grader_profiles'::regclass AND conname = 'grader_profiles_category_source_check';

  IF tbl <> 1 OR cap <> 1 OR chk NOT LIKE '%operator_override%' THEN
    RAISE EXCEPTION 'TASK-1962 anti pre-up-marker check: category override NOT created (tbl=%, cap=%, check=%).', tbl, cap, chk;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'growth.ai_visibility.profile.set_category'
  AND deprecated_at IS NULL;

DROP TRIGGER IF EXISTS trg_grader_category_history_append_only ON greenhouse_growth.grader_category_history;
DROP FUNCTION IF EXISTS greenhouse_growth.block_category_history_mutation();
DROP TABLE IF EXISTS greenhouse_growth.grader_category_history;
