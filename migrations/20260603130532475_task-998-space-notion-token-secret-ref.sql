-- Up Migration

-- TASK-998 — token Notion POR teamspace (scoped). Cada Space puede referenciar su
-- propio token de integración (guardado en GCP Secret Manager), aislando el acceso
-- a un solo teamspace. NULL = usar el token compartido legacy `notion-token`
-- (Efeonce/Sky no se migran — back-compat). El valor es un *_SECRET_REF canónico
-- (nombre del secret), NUNCA el token crudo.

ALTER TABLE greenhouse_core.space_notion_sources
  ADD COLUMN IF NOT EXISTS notion_token_secret_ref TEXT NULL;

COMMENT ON COLUMN greenhouse_core.space_notion_sources.notion_token_secret_ref IS
  'TASK-998: referencia (*_SECRET_REF) al secret de GCP Secret Manager con el token de integración Notion scoped al teamspace de este Space. NULL = token compartido legacy notion-token. NUNCA el token crudo.';

-- Anti pre-up-marker guard: aborta si la columna no quedó creada.
DO $$
DECLARE col_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_core'
      AND table_name = 'space_notion_sources'
      AND column_name = 'notion_token_secret_ref'
  ) INTO col_exists;

  IF NOT col_exists THEN
    RAISE EXCEPTION 'TASK-998 anti pre-up-marker: notion_token_secret_ref was NOT created on greenhouse_core.space_notion_sources';
  END IF;
END
$$;

-- Down Migration

ALTER TABLE greenhouse_core.space_notion_sources
  DROP COLUMN IF EXISTS notion_token_secret_ref;
