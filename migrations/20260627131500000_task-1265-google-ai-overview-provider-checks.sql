-- Up Migration

-- TASK-1265 — permitir Google AI Overviews / AI Mode como provider del grader.
-- Aditivo: no crea tablas ni mueve datos; solo amplía CHECK constraints para
-- observations y findings derivados.

ALTER TABLE greenhouse_growth.provider_observations
  DROP CONSTRAINT IF EXISTS provider_observations_provider_check;

ALTER TABLE greenhouse_growth.provider_observations
  ADD CONSTRAINT provider_observations_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'perplexity', 'gemini', 'google_ai_overview'));

ALTER TABLE greenhouse_growth.normalized_findings
  DROP CONSTRAINT IF EXISTS normalized_findings_provider_check;

ALTER TABLE greenhouse_growth.normalized_findings
  ADD CONSTRAINT normalized_findings_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'perplexity', 'gemini', 'google_ai_overview', 'manual_import'));

DO $$
DECLARE
  provider_observation_constraint_ok BOOLEAN;
  normalized_finding_constraint_ok BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'greenhouse_growth'
      AND rel.relname = 'provider_observations'
      AND c.conname = 'provider_observations_provider_check'
      AND pg_get_constraintdef(c.oid) LIKE '%google_ai_overview%'
  ) INTO provider_observation_constraint_ok;

  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'greenhouse_growth'
      AND rel.relname = 'normalized_findings'
      AND c.conname = 'normalized_findings_provider_check'
      AND pg_get_constraintdef(c.oid) LIKE '%google_ai_overview%'
  ) INTO normalized_finding_constraint_ok;

  IF NOT provider_observation_constraint_ok OR NOT normalized_finding_constraint_ok THEN
    RAISE EXCEPTION 'TASK-1265 anti pre-up-marker: google_ai_overview provider CHECK not installed.';
  END IF;
END
$$;

-- Down Migration

ALTER TABLE greenhouse_growth.normalized_findings
  DROP CONSTRAINT IF EXISTS normalized_findings_provider_check;

ALTER TABLE greenhouse_growth.normalized_findings
  ADD CONSTRAINT normalized_findings_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'perplexity', 'gemini', 'manual_import'));

ALTER TABLE greenhouse_growth.provider_observations
  DROP CONSTRAINT IF EXISTS provider_observations_provider_check;

ALTER TABLE greenhouse_growth.provider_observations
  ADD CONSTRAINT provider_observations_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'perplexity', 'gemini'));
