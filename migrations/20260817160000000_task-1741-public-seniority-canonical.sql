-- Up Migration

-- TASK-1741 — El seniority público es lenguaje para candidatos, no la taxonomía
-- interna de assessment. Normaliza los dos valores legacy conocidos antes de
-- cerrar el dominio con un CHECK. El nivel interno `seniority` permanece libre
-- y puede seguir usando L2 donde corresponda al instrumento de evaluación.
UPDATE greenhouse_hiring.hiring_opening
SET public_seniority = CASE lower(btrim(public_seniority))
  WHEN 'l2' THEN 'Semi-senior'
  WHEN 'intermedio' THEN 'Semi-senior'
  WHEN 'semi senior' THEN 'Semi-senior'
  WHEN 'semi-senior' THEN 'Semi-senior'
  WHEN 'junior' THEN 'Junior'
  WHEN 'senior' THEN 'Senior'
  WHEN 'lead' THEN 'Lead'
  ELSE public_seniority
END
WHERE public_seniority IS NOT NULL;

-- No se inventa una equivalencia para valores desconocidos. Si existen, la
-- migración se detiene y exige una decisión humana sobre cada opening.
DO $$
DECLARE
  invalid_values text;
BEGIN
  SELECT string_agg(DISTINCT public_seniority, ', ' ORDER BY public_seniority)
  INTO invalid_values
  FROM greenhouse_hiring.hiring_opening
  WHERE public_seniority IS NOT NULL
    AND public_seniority NOT IN ('Junior', 'Semi-senior', 'Senior', 'Lead');

  IF invalid_values IS NOT NULL THEN
    RAISE EXCEPTION 'TASK-1741: public_seniority values need human calibration before migration: %', invalid_values;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'hiring_opening_public_seniority_check'
      AND conrelid = 'greenhouse_hiring.hiring_opening'::regclass
  ) THEN
    ALTER TABLE greenhouse_hiring.hiring_opening
      ADD CONSTRAINT hiring_opening_public_seniority_check
      CHECK (public_seniority IS NULL OR public_seniority IN ('Junior', 'Semi-senior', 'Senior', 'Lead'));
  END IF;
END $$;

COMMENT ON COLUMN greenhouse_hiring.hiring_opening.public_seniority IS
  'Candidate-facing role level. Canonical values: Junior, Semi-senior, Senior, Lead. Internal levels such as L2 belong only in hiring_opening.seniority/assessment taxonomy.';

-- Anti pre-up-marker guard.
DO $$
DECLARE
  constraint_count integer;
BEGIN
  SELECT COUNT(*) INTO constraint_count
  FROM pg_constraint
  WHERE conname = 'hiring_opening_public_seniority_check'
    AND conrelid = 'greenhouse_hiring.hiring_opening'::regclass;

  IF constraint_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1741 anti pre-up-marker: public seniority constraint missing.';
  END IF;
END $$;

-- Down Migration

ALTER TABLE greenhouse_hiring.hiring_opening
  DROP CONSTRAINT IF EXISTS hiring_opening_public_seniority_check;

COMMENT ON COLUMN greenhouse_hiring.hiring_opening.public_seniority IS NULL;
