-- TASK-1371 — Hiring vacancy publication operator structured public fields.
-- Additive-only: public opening projection gets structured data so Careers and
-- operators stop inferring area, modality, location and public tags from copy.

ALTER TABLE greenhouse_hiring.hiring_opening
  ADD COLUMN IF NOT EXISTS public_work_mode TEXT,
  ADD COLUMN IF NOT EXISTS public_hiring_region TEXT,
  ADD COLUMN IF NOT EXISTS public_city TEXT,
  ADD COLUMN IF NOT EXISTS public_country TEXT,
  ADD COLUMN IF NOT EXISTS public_office_location TEXT,
  ADD COLUMN IF NOT EXISTS public_area TEXT,
  ADD COLUMN IF NOT EXISTS public_skill_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS public_compensation_band TEXT,
  ADD COLUMN IF NOT EXISTS publication_source_ref TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'hiring_opening_public_work_mode_check'
      AND conrelid = 'greenhouse_hiring.hiring_opening'::regclass
  ) THEN
    ALTER TABLE greenhouse_hiring.hiring_opening
      ADD CONSTRAINT hiring_opening_public_work_mode_check
      CHECK (public_work_mode IS NULL OR public_work_mode IN ('remote', 'hybrid', 'onsite'));
  END IF;
END $$;

UPDATE greenhouse_hiring.hiring_opening
SET public_area = COALESCE(public_area, 'Marketing'),
    public_work_mode = COALESCE(public_work_mode, 'remote'),
    public_hiring_region = COALESCE(public_hiring_region, 'LATAM'),
    public_skill_tags = CASE
      WHEN cardinality(public_skill_tags) = 0 THEN ARRAY['SEO', 'Copywriting', 'Liderazgo operativo', 'Vendor management', 'Marketing']
      ELSE public_skill_tags
    END,
    public_location_mode = COALESCE(public_location_mode, 'LATAM')
WHERE public_id = 'EO-OPN-0009';

COMMENT ON COLUMN greenhouse_hiring.hiring_opening.public_work_mode IS
  'TASK-1371: public structured work mode for Careers. One of remote|hybrid|onsite; replaces ambiguous public_location_mode authoring.';
COMMENT ON COLUMN greenhouse_hiring.hiring_opening.public_hiring_region IS
  'TASK-1371: public hiring region shown as location for remote roles, e.g. LATAM, Global, Chile.';
COMMENT ON COLUMN greenhouse_hiring.hiring_opening.public_city IS
  'TASK-1371: public city for hybrid/onsite roles when applicable.';
COMMENT ON COLUMN greenhouse_hiring.hiring_opening.public_country IS
  'TASK-1371: public country for hybrid/onsite roles when applicable.';
COMMENT ON COLUMN greenhouse_hiring.hiring_opening.public_office_location IS
  'TASK-1371: public office/location label for hybrid/onsite roles when applicable.';
COMMENT ON COLUMN greenhouse_hiring.hiring_opening.public_area IS
  'TASK-1371: public department/area allowlisted by the vacancy publication operator.';
COMMENT ON COLUMN greenhouse_hiring.hiring_opening.public_skill_tags IS
  'TASK-1371: public skill/competency chips for Careers. Source of truth; no renderer inference from prose.';
COMMENT ON COLUMN greenhouse_hiring.hiring_opening.public_compensation_band IS
  'TASK-1371: optional public compensation band. Not publish-required until finance/payroll/legal approves band governance.';
COMMENT ON COLUMN greenhouse_hiring.hiring_opening.publication_source_ref IS
  'TASK-1371: internal operator/source reference used to reuse a draft/opening when the same approved brief is retried.';

CREATE UNIQUE INDEX IF NOT EXISTS hiring_opening_publication_source_ref_uniq
  ON greenhouse_hiring.hiring_opening (publication_source_ref)
  WHERE publication_source_ref IS NOT NULL;

-- Down is intentionally non-destructive. Reverting code leaves these nullable
-- columns unused, preserving already-published vacancy data.
