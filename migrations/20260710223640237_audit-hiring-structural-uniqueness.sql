-- Up Migration

-- Audit motor hiring 2026-07-10 — unicidad estructural (defensa contra carreras
-- check-then-insert que el código no puede cerrar solo):
--
-- 1. Una application no puede tener DOS instancias de assessment ABIERTAS del mismo
--    template (retakes legítimos = instancia nueva tras scored/cancelled/expired).
-- 2. Un identity_profile tiene a lo más UN member (el 360 es Person-first; re-hire =
--    reactivación del member existente, nunca un member paralelo). Pre-check live
--    2026-07-10: 0 duplicados en ambos casos.

CREATE UNIQUE INDEX IF NOT EXISTS hiring_assessment_open_instance_unique_idx
  ON greenhouse_hiring.hiring_assessment (application_id, template_id)
  WHERE status IN ('assigned', 'sent', 'in_progress', 'submitted');

CREATE UNIQUE INDEX IF NOT EXISTS members_identity_profile_unique_idx
  ON greenhouse_core.members (identity_profile_id)
  WHERE identity_profile_id IS NOT NULL;

-- Anti pre-up-marker bug guard: abortar si los índices no quedaron creados.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_hiring' AND indexname = 'hiring_assessment_open_instance_unique_idx'
  ) THEN
    RAISE EXCEPTION 'Audit hiring anti pre-up-marker check: hiring_assessment_open_instance_unique_idx was NOT created.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_core' AND indexname = 'members_identity_profile_unique_idx'
  ) THEN
    RAISE EXCEPTION 'Audit hiring anti pre-up-marker check: members_identity_profile_unique_idx was NOT created.';
  END IF;
END
$$;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_hiring.hiring_assessment_open_instance_unique_idx;
DROP INDEX IF EXISTS greenhouse_core.members_identity_profile_unique_idx;
