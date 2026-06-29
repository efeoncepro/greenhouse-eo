-- Up Migration

-- TASK-1270 — AI Visibility recurring re-grade.
--
-- Cadence vive en `grader_profiles` porque el perfil es el subject monitoreado.
-- Default OFF + NULL next_at: no cambia leads one-shot ni perfiles existentes hasta
-- que un operador/command gobernado haga opt-in explícito.

SET search_path TO public, greenhouse_growth;

ALTER TABLE greenhouse_growth.grader_profiles
  ADD COLUMN IF NOT EXISTS recurring_regrade_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recurring_regrade_cadence TEXT NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS recurring_regrade_next_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recurring_regrade_last_run_id TEXT,
  ADD COLUMN IF NOT EXISTS recurring_regrade_last_at TIMESTAMPTZ;

ALTER TABLE greenhouse_growth.grader_profiles
  DROP CONSTRAINT IF EXISTS grader_profiles_recurring_regrade_cadence_check;
ALTER TABLE greenhouse_growth.grader_profiles
  ADD CONSTRAINT grader_profiles_recurring_regrade_cadence_check
  CHECK (recurring_regrade_cadence IN ('weekly', 'monthly')) NOT VALID;

ALTER TABLE greenhouse_growth.grader_profiles
  DROP CONSTRAINT IF EXISTS grader_profiles_recurring_regrade_last_run_fk;
ALTER TABLE greenhouse_growth.grader_profiles
  ADD CONSTRAINT grader_profiles_recurring_regrade_last_run_fk
  FOREIGN KEY (recurring_regrade_last_run_id)
  REFERENCES greenhouse_growth.grader_runs(run_id)
  ON DELETE SET NULL NOT VALID;

ALTER TABLE greenhouse_growth.grader_profiles
  VALIDATE CONSTRAINT grader_profiles_recurring_regrade_cadence_check;

CREATE INDEX IF NOT EXISTS grader_profiles_recurring_regrade_due_idx
  ON greenhouse_growth.grader_profiles (recurring_regrade_next_at, organization_id)
  WHERE recurring_regrade_enabled IS TRUE AND status = 'active';

GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.grader_profiles TO greenhouse_runtime;

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'growth.ai_visibility.regrade.manage',
    'growth',
    ARRAY['execute'],
    ARRAY['tenant'],
    'TASK-1270 — Gestionar opt-in/cadencia del re-grade recurrente AI Visibility para perfiles de cliente entitled. El job automático corre como sistema; esta capability gobierna superficies humanas/agentes futuras.',
    NOW(),
    NULL
  )
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

DO $$
DECLARE
  col_count INTEGER;
  cap_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_growth'
    AND table_name = 'grader_profiles'
    AND column_name IN (
      'recurring_regrade_enabled',
      'recurring_regrade_cadence',
      'recurring_regrade_next_at',
      'recurring_regrade_last_run_id',
      'recurring_regrade_last_at'
    );

  SELECT COUNT(*) INTO cap_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key = 'growth.ai_visibility.regrade.manage'
    AND deprecated_at IS NULL;

  IF col_count <> 5 OR cap_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1270 anti pre-up-marker check failed: columns=% capability=%', col_count, cap_count;
  END IF;
END
$$;

-- Down Migration

SET search_path TO public, greenhouse_growth;

DROP INDEX IF EXISTS greenhouse_growth.grader_profiles_recurring_regrade_due_idx;

ALTER TABLE greenhouse_growth.grader_profiles
  DROP CONSTRAINT IF EXISTS grader_profiles_recurring_regrade_last_run_fk,
  DROP CONSTRAINT IF EXISTS grader_profiles_recurring_regrade_cadence_check;

ALTER TABLE greenhouse_growth.grader_profiles
  DROP COLUMN IF EXISTS recurring_regrade_last_at,
  DROP COLUMN IF EXISTS recurring_regrade_last_run_id,
  DROP COLUMN IF EXISTS recurring_regrade_next_at,
  DROP COLUMN IF EXISTS recurring_regrade_cadence,
  DROP COLUMN IF EXISTS recurring_regrade_enabled;

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'growth.ai_visibility.regrade.manage'
  AND deprecated_at IS NULL;
