-- Up Migration

-- TASK-2033 — Alcance de contenido por organización (Search Visibility 360).
--
-- Declara qué parte del sitio de una organización trabaja Efeonce, como reglas de ruta
-- (`prefix` / `exact`). Los readers dueños del módulo SEO lo aplican sobre `seo_gsc_daily.page`
-- y Efeonce Insights mide sus ediciones sobre ese alcance en vez de la propiedad completa.
--
-- ⚠️ ANCLAJE A LA ORGANIZACIÓN, igual que `seo_gsc_daily` (TASK-1302): Search Console entrega
-- por propiedad verificada y esa propiedad vive por organización, no por `seo_target`.
--
-- ⚠️ APPEND-ONLY POR VERSIÓN. El alcance vigente es la versión de mayor número. Una versión
-- nunca se edita ni se borra: cada edición de Insights sella la versión que usó, así que
-- reescribir una fila dejaría informes emitidos apuntando a reglas que ya no existen.
-- Volver al sitio completo es una versión nueva con cero reglas, no un DELETE.
CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_content_scope_versions (
  organization_id       TEXT NOT NULL
    REFERENCES greenhouse_core.organizations (organization_id) ON DELETE RESTRICT,
  version               INTEGER NOT NULL CHECK (version >= 1),
  label                 TEXT NOT NULL CHECK (char_length(label) BETWEEN 1 AND 120),
  rules_json            JSONB NOT NULL CHECK (jsonb_typeof(rules_json) = 'array'),
  reason                TEXT NOT NULL CHECK (char_length(reason) >= 10),
  created_by_actor_kind TEXT NOT NULL CHECK (char_length(created_by_actor_kind) >= 1),
  created_by_user_id    TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT seo_content_scope_versions_pk PRIMARY KEY (organization_id, version)
);

-- Reusa la función genérica de TASK-1299 (mensaje por TG_TABLE_NAME / TG_OP).
DROP TRIGGER IF EXISTS trg_seo_content_scope_versions_append_only
  ON greenhouse_growth.seo_content_scope_versions;
CREATE TRIGGER trg_seo_content_scope_versions_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_growth.seo_content_scope_versions
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_seo_row_mutation();

-- Anti pre-up-marker guard (CLAUDE.md §Database — Migration markers).
DO $$
DECLARE
  table_exists   boolean;
  trigger_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_growth' AND table_name = 'seo_content_scope_versions'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-2033 anti pre-up-marker check: greenhouse_growth.seo_content_scope_versions NO fue creada. Los markers pueden estar invertidos.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_seo_content_scope_versions_append_only' AND NOT tgisinternal
  ) INTO trigger_exists;

  IF NOT trigger_exists THEN
    RAISE EXCEPTION 'TASK-2033: falta trg_seo_content_scope_versions_append_only — sin ese trigger una version sellada en una edicion podria reescribirse.';
  END IF;
END
$$;

-- GRANTs least-privilege. Configuración versionada: el runtime inserta versiones y lee; nunca edita ni borra.
ALTER TABLE greenhouse_growth.seo_content_scope_versions OWNER TO greenhouse_ops;
GRANT SELECT, INSERT ON greenhouse_growth.seo_content_scope_versions TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_growth.seo_content_scope_versions TO greenhouse_app;
GRANT SELECT, INSERT ON greenhouse_growth.seo_content_scope_versions TO greenhouse_migrator_user;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_growth.seo_content_scope_versions;
