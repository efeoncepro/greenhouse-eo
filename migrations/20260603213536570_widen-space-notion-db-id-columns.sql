-- Up Migration

-- TASK-998/992 — Las columnas notion_db_* de space_notion_sources eran VARCHAR(32)
-- (asumían IDs de Notion "dashless" = 32 hex). Pero la API de Notion (y el wizard de
-- alta de cliente) usan los IDs CON guiones = 36 chars (UUID). Al vincular Notion en
-- el alta, el INSERT fallaba con 22001 "value too long for type character varying(32)";
-- writeSpaceNotionSourcesFromIntent tragaba el error (return ok:false) pero la tx
-- quedaba envenenada → el siguiente statement reventaba con 25P02 → error genérico
-- "No se pudo procesar la solicitud de ciclo de vida". Ampliamos a TEXT (sin asumir
-- formato dashed/dashless). notion_token_secret_ref ya era TEXT; notion_workspace_id
-- ya es VARCHAR(36) (alcanza para UUID dashed).

ALTER TABLE greenhouse_core.space_notion_sources
  ALTER COLUMN notion_db_proyectos TYPE TEXT,
  ALTER COLUMN notion_db_tareas TYPE TEXT,
  ALTER COLUMN notion_db_sprints TYPE TEXT,
  ALTER COLUMN notion_db_revisiones TYPE TEXT;

-- Anti pre-up-marker bug guard (CLAUDE.md): aborta si alguna sigue acotada.
DO $$
DECLARE still_limited TEXT;
BEGIN
  SELECT string_agg(column_name, ', ') INTO still_limited
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_core'
    AND table_name = 'space_notion_sources'
    AND column_name IN ('notion_db_proyectos', 'notion_db_tareas', 'notion_db_sprints', 'notion_db_revisiones')
    AND character_maximum_length IS NOT NULL;

  IF still_limited IS NOT NULL THEN
    RAISE EXCEPTION 'TASK-998 widen check: columnas notion_db_* siguen acotadas: %', still_limited;
  END IF;
END
$$;

-- Down Migration

-- Revert a VARCHAR(36) (suficiente para UUID dashed — NO al 32 original, que era el bug
-- y truncaría datos reales). Down idempotente y sin pérdida.
ALTER TABLE greenhouse_core.space_notion_sources
  ALTER COLUMN notion_db_proyectos TYPE VARCHAR(36),
  ALTER COLUMN notion_db_tareas TYPE VARCHAR(36),
  ALTER COLUMN notion_db_sprints TYPE VARCHAR(36),
  ALTER COLUMN notion_db_revisiones TYPE VARCHAR(36);
