-- Up Migration
--
-- TASK-991 Slice 1 — organizations.origin (atributo de atribución del nacimiento)
-- ============================================================================
-- `origin` declara por qué puerta nació cada organización. Columna NULLABLE
-- (no bloquea ninguna escritura existente) con CHECK del enum cerrado. Backfill
-- best-effort heurístico para filas legacy (OQ2 TASK-991): hubspot_company_id
-- presente ⇒ 'hubspot_sync'; resto ⇒ 'migration'. Las escrituras nuevas setean
-- origin explícito vía upsertCanonicalOrganization / la puerta party.
--
-- NO agrega el CHECK de consistencia organization_type↔lifecycle_stage: ese va
-- en TASK-991 Slice 3 (NOT VALID + VALIDATE) DESPUÉS de remediar las filas a
-- medias, respetando "columnas nullable primero, constraints después del deploy".

SET search_path = greenhouse_core, public;

ALTER TABLE greenhouse_core.organizations
  ADD COLUMN IF NOT EXISTS origin TEXT;

ALTER TABLE greenhouse_core.organizations
  DROP CONSTRAINT IF EXISTS organizations_origin_valid;

ALTER TABLE greenhouse_core.organizations
  ADD CONSTRAINT organizations_origin_valid
  CHECK (
    origin IS NULL
    OR origin = ANY (ARRAY[
      'hubspot_sync',
      'nubox',
      'manual',
      'adopt',
      'quote_converted',
      'migration',
      'bootstrap'
    ])
  );

COMMENT ON COLUMN greenhouse_core.organizations.origin IS
  'TASK-991: puerta de nacimiento del registro (hubspot_sync|nubox|manual|adopt|quote_converted|migration|bootstrap). Nullable; backfill best-effort. Escrituras nuevas lo setean explícito.';

-- Backfill best-effort de filas legacy (idempotente — solo toca origin NULL).
UPDATE greenhouse_core.organizations
   SET origin = CASE
     WHEN hubspot_company_id IS NOT NULL THEN 'hubspot_sync'
     ELSE 'migration'
   END
 WHERE origin IS NULL;

-- Verificación post-DDL (anti pre-up-marker bug): la columna + CHECK deben existir.
DO $$
DECLARE
  has_column BOOLEAN;
  has_constraint BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_core'
      AND table_name = 'organizations'
      AND column_name = 'origin'
  ) INTO has_column;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organizations_origin_valid'
      AND conrelid = 'greenhouse_core.organizations'::regclass
  ) INTO has_constraint;

  IF NOT has_column THEN
    RAISE EXCEPTION 'TASK-991: organizations.origin column was NOT created. Migration markers may be inverted.';
  END IF;

  IF NOT has_constraint THEN
    RAISE EXCEPTION 'TASK-991: organizations_origin_valid constraint was NOT created.';
  END IF;
END
$$;

-- Down Migration

ALTER TABLE greenhouse_core.organizations
  DROP CONSTRAINT IF EXISTS organizations_origin_valid;

ALTER TABLE greenhouse_core.organizations
  DROP COLUMN IF EXISTS origin;
