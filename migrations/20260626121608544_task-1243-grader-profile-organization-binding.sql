-- Up Migration
--
-- TASK-1243 — Growth AI Visibility: Client-Scoped Report Access (EPIC-020 E).
-- Binding `perfil de marca ↔ organización cliente` para el 3.er consumer de la parity:
-- un usuario `client_*` autenticado ve el reporte del grader de SU organización. El run
-- deriva su org vía `run.profile_id → grader_profiles.organization_id` (1 perfil ↔ 1 org en
-- V1). additive + nullable: los perfiles existentes son internos/públicos (org NULL) y los
-- writers actuales (findOrCreateGraderProfile/createGraderRun) NO cambian. La población del
-- binding (asociar un perfil a una org cliente) es del intake/onboarding cliente, fuera de
-- esta task (este task entrega el binding + reader + capability + tenant boundary).

SET search_path TO public, greenhouse_growth;

-- 1. Columna de binding (nullable, FK a la organización canónica 360).
ALTER TABLE greenhouse_growth.grader_profiles
  ADD COLUMN IF NOT EXISTS organization_id text;

-- FK additive a greenhouse_core.organizations (text PK). ON DELETE SET NULL: borrar una org
-- no borra el perfil/historial del grader, solo desliga el binding.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'grader_profiles_organization_id_fkey'
  ) THEN
    ALTER TABLE greenhouse_growth.grader_profiles
      ADD CONSTRAINT grader_profiles_organization_id_fkey
      FOREIGN KEY (organization_id)
      REFERENCES greenhouse_core.organizations (organization_id)
      ON DELETE SET NULL;
  END IF;
END
$$;

-- 2. Index parcial para el reader client-scoped (filtra perfiles con org asignada).
CREATE INDEX IF NOT EXISTS grader_profiles_organization_id_idx
  ON greenhouse_growth.grader_profiles (organization_id)
  WHERE organization_id IS NOT NULL;

-- 3. Anti pre-up-marker: aborta si la columna/FK/index no quedaron creados.
DO $$
DECLARE col_ok boolean; fk_ok boolean; idx_ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'greenhouse_growth' AND table_name = 'grader_profiles'
       AND column_name = 'organization_id'
  ) INTO col_ok;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'grader_profiles_organization_id_fkey'
  ) INTO fk_ok;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'greenhouse_growth' AND indexname = 'grader_profiles_organization_id_idx'
  ) INTO idx_ok;

  IF NOT (col_ok AND fk_ok AND idx_ok) THEN
    RAISE EXCEPTION 'TASK-1243 anti pre-up-marker: binding NO creado completo (col=% fk=% idx=%).',
      col_ok, fk_ok, idx_ok;
  END IF;
END
$$;

-- 4. GRANTs: el runtime lee/escribe; ops es owner. La columna hereda los grants de la tabla,
--    pero re-afirmamos por claridad (idempotente).
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.grader_profiles TO greenhouse_runtime;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_growth.grader_profiles_organization_id_idx;

ALTER TABLE greenhouse_growth.grader_profiles
  DROP CONSTRAINT IF EXISTS grader_profiles_organization_id_fkey;

ALTER TABLE greenhouse_growth.grader_profiles
  DROP COLUMN IF EXISTS organization_id;
