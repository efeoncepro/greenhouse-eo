-- Up Migration

-- TASK-1740 — Public vacancy structured content + remote country eligibility.
-- Additive-only sobre greenhouse_hiring.hiring_opening:
--   * public_content_json: bloque versionado candidate-facing (PublicOpeningContent v1,
--     validado por src/lib/hiring/public-careers/public-content.ts en el command canónico).
--   * public_remote_eligible_countries: países elegibles ISO 3166-1 alpha-2 para una vacante
--     100% remota. Es el ÚNICO dato que habilita jobLocationType TELECOMMUTE en JSON-LD;
--     nunca se deriva de public_hiring_region (texto libre regional, no hecho legal).
-- Openings existentes quedan read-only: content NULL (fallback legacy de prosa) y countries '{}'.

ALTER TABLE greenhouse_hiring.hiring_opening
  ADD COLUMN IF NOT EXISTS public_content_json JSONB,
  ADD COLUMN IF NOT EXISTS public_remote_eligible_countries TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Defensa de forma en DB (la lista ISO real se valida en el command con isValidCountryCode):
-- cada elemento debe ser exactamente 2 letras mayúsculas.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'hiring_opening_remote_countries_shape_check'
      AND conrelid = 'greenhouse_hiring.hiring_opening'::regclass
  ) THEN
    ALTER TABLE greenhouse_hiring.hiring_opening
      ADD CONSTRAINT hiring_opening_remote_countries_shape_check
      CHECK (
        public_remote_eligible_countries = ARRAY[]::TEXT[]
        OR array_to_string(public_remote_eligible_countries, ',') ~ '^([A-Z]{2})(,[A-Z]{2})*$'
      );
  END IF;
END $$;

COMMENT ON COLUMN greenhouse_hiring.hiring_opening.public_content_json IS
  'TASK-1740: structured candidate-facing content block (PublicOpeningContent v1). Versioned JSON validated by the canonical command; unknown versions degrade to legacy prose fallback on read.';
COMMENT ON COLUMN greenhouse_hiring.hiring_opening.public_remote_eligible_countries IS
  'TASK-1740: ISO 3166-1 alpha-2 eligible countries for 100% remote openings. Sole enabler of JobPosting TELECOMMUTE + applicantLocationRequirements; never derived from free-text public_hiring_region.';

-- Anti pre-up-marker bug guard (ISSUE-068): aborta si las columnas o el constraint no quedaron creados.
DO $$
DECLARE
  col_count INTEGER;
  constraint_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_hiring'
    AND table_name = 'hiring_opening'
    AND column_name IN ('public_content_json', 'public_remote_eligible_countries');

  IF col_count <> 2 THEN
    RAISE EXCEPTION 'TASK-1740 anti pre-up-marker: expected 2 new public content columns, got %. Migration markers may be inverted.', col_count;
  END IF;

  SELECT COUNT(*) INTO constraint_count
  FROM pg_constraint
  WHERE conname = 'hiring_opening_remote_countries_shape_check'
    AND conrelid = 'greenhouse_hiring.hiring_opening'::regclass;

  IF constraint_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1740 anti pre-up-marker: remote countries shape check constraint missing.';
  END IF;
END $$;

-- Grants: default privileges de greenhouse_ops ya cubren la tabla existente; explícito por claridad.
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_opening TO greenhouse_runtime;

-- Down Migration

ALTER TABLE greenhouse_hiring.hiring_opening
  DROP CONSTRAINT IF EXISTS hiring_opening_remote_countries_shape_check;

ALTER TABLE greenhouse_hiring.hiring_opening
  DROP COLUMN IF EXISTS public_content_json,
  DROP COLUMN IF EXISTS public_remote_eligible_countries;
