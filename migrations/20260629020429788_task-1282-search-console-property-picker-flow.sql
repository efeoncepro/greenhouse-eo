-- Up Migration
--
-- TASK-1282 redesign — flujo property-picker (estilo Semrush): conectas con tu cuenta
-- (un token de operador, NO per-org) → la app lista TODAS tus propiedades → eliges cuál
-- atar a cada org. Cambios:
--   1. `site_url` pasa a NULLABLE: una conexión vive en `pending` (token guardado, sin
--      propiedad elegida aún) hasta que el operador elige del desplegable.
--   2. Índice por `connected_by_user_id` para reusar el token de operador entre orgs.

SET search_path TO public, greenhouse_growth;

ALTER TABLE greenhouse_growth.search_console_connections
  ALTER COLUMN site_url DROP NOT NULL;

CREATE INDEX IF NOT EXISTS search_console_connections_connected_by_idx
  ON greenhouse_growth.search_console_connections (connected_by_user_id)
  WHERE connected_by_user_id IS NOT NULL;

-- Anti pre-up-marker: aborta si site_url quedó NOT NULL.
DO $$
DECLARE is_nullable text;
BEGIN
  SELECT c.is_nullable INTO is_nullable
    FROM information_schema.columns c
   WHERE c.table_schema = 'greenhouse_growth'
     AND c.table_name = 'search_console_connections'
     AND c.column_name = 'site_url';

  IF is_nullable IS DISTINCT FROM 'YES' THEN
    RAISE EXCEPTION 'TASK-1282 property-picker: site_url sigue NOT NULL (is_nullable=%).', is_nullable;
  END IF;
END
$$;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_growth.search_console_connections_connected_by_idx;
-- No re-imponer NOT NULL en down: filas pending tendrían site_url NULL y romperían el rollback.
