-- Up Migration

-- TASK-1297 — Identidad estable, opaca e inmutable del form (tipo handle público).
-- `form_key` es ortogonal a `form_id` (PK surrogate semántico `fdef-*`), `slug`
-- (alias humano/API legacy), `form_version_id` (versión) y `surface_id` (host).
-- NUNCA es el HubSpot destination form GUID (server-only, en form_destination.mapping_json).
SET search_path TO public, greenhouse_growth;

-- 1. Columna additive. Default volátil gen_random_uuid() rellena filas existentes con
--    un UUID distinto cada una (tabla chica → table rewrite barato). NOT NULL satisfecho
--    por el default. gen_random_uuid() es core desde PG13 (form_id ya lo usa).
ALTER TABLE greenhouse_growth.form_definition
  ADD COLUMN IF NOT EXISTS form_key UUID NOT NULL DEFAULT gen_random_uuid();

-- 2. Unicidad de la identidad pública.
CREATE UNIQUE INDEX IF NOT EXISTS form_definition_form_key_uidx
  ON greenhouse_growth.form_definition (form_key);

-- 3. Anti pre-up-marker bug guard (ISSUE-068): aborta si la columna no quedó creada.
DO $$
DECLARE col_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_growth'
      AND table_name = 'form_definition'
      AND column_name = 'form_key'
  ) INTO col_exists;

  IF NOT col_exists THEN
    RAISE EXCEPTION 'TASK-1297 anti pre-up-marker check: greenhouse_growth.form_definition.form_key was NOT created. Migration markers may be inverted.';
  END IF;
END
$$;

-- 4. Grants (la tabla ya es de greenhouse_ops; reafirmamos runtime DML).
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.form_definition TO greenhouse_runtime;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_growth.form_definition_form_key_uidx;
ALTER TABLE greenhouse_growth.form_definition DROP COLUMN IF EXISTS form_key;
