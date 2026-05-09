-- Up Migration

-- TASK-836 — Services lifecycle validation stage + lineage protection.
--
-- Cambios atómicos en una sola migration:
--   1. Extender CHECK pipeline_stage agregando 'validation' (Sample Sprints).
--   2. Agregar CHECK structural a 'status' (foundation defense-in-depth).
--   3. Agregar CHECK structural a 'hubspot_sync_status'.
--   4. Agregar columna 'unmapped_reason' con CHECK enum cerrado.
--   5. Agregar columna 'parent_service_id' FK self con ON DELETE RESTRICT.
--   6. Crear trigger lineage protection (BEFORE INSERT OR UPDATE).
--   7. Bloque DO con RAISE EXCEPTION post-DDL (anti pre-up-marker bug).
--
-- Pattern fuente:
--   - TASK-768 Slice 1 (DO block verificación post-DDL).
--   - TASK-810 (trigger BEFORE INSERT OR UPDATE en services).
--   - TASK-742 (defense-in-depth multi-layer).

-- ── 1. Extender CHECK pipeline_stage con 'validation' ──

ALTER TABLE greenhouse_core.services
  DROP CONSTRAINT services_pipeline_stage_check;

ALTER TABLE greenhouse_core.services
  ADD CONSTRAINT services_pipeline_stage_check
  CHECK (pipeline_stage IN (
    'validation',
    'onboarding',
    'active',
    'renewal_pending',
    'renewed',
    'closed',
    'paused'
  ));

-- ── 2. CHECK structural a 'status' (NOT VALID + VALIDATE atomic) ──
-- Validamos NOT VALID para evitar lock prolongado; sabemos que las 36 filas
-- existentes solo tienen 'active' y 'legacy_seed_archived' (verificado pre-migration).

ALTER TABLE greenhouse_core.services
  ADD CONSTRAINT services_status_check
  CHECK (status IN (
    'active',
    'closed',
    'paused',
    'legacy_seed_archived'
  ))
  NOT VALID;

ALTER TABLE greenhouse_core.services
  VALIDATE CONSTRAINT services_status_check;

-- ── 3. CHECK structural a 'hubspot_sync_status' ──

ALTER TABLE greenhouse_core.services
  ADD CONSTRAINT services_hubspot_sync_status_check
  CHECK (hubspot_sync_status IS NULL OR hubspot_sync_status IN (
    'pending',
    'synced',
    'unmapped'
  ))
  NOT VALID;

ALTER TABLE greenhouse_core.services
  VALIDATE CONSTRAINT services_hubspot_sync_status_check;

-- ── 4. Columna unmapped_reason con CHECK enum cerrado ──
-- Discrimina los dos modos de unmapped:
--   - 'unknown_pipeline_stage': stage HubSpot que el mapper no reconoce.
--   - 'missing_classification': ef_linea_de_servicio NULL (TASK-813 / TASK-768 honest degradation).

ALTER TABLE greenhouse_core.services
  ADD COLUMN unmapped_reason TEXT NULL;

ALTER TABLE greenhouse_core.services
  ADD CONSTRAINT services_unmapped_reason_check
  CHECK (unmapped_reason IS NULL OR unmapped_reason IN (
    'unknown_pipeline_stage',
    'missing_classification'
  ));

CREATE INDEX IF NOT EXISTS services_unmapped_reason_idx
  ON greenhouse_core.services (unmapped_reason)
  WHERE unmapped_reason IS NOT NULL;

-- ── 5. Columna parent_service_id (FK self, lineage Sample Sprint -> regular) ──
-- ON DELETE RESTRICT preserva el lineage histórico; nadie puede borrar un parent
-- mientras tenga child convertido. Reversal correcto requiere recordar que el
-- audit log es append-only (TASK-808).

ALTER TABLE greenhouse_core.services
  ADD COLUMN parent_service_id TEXT NULL
  REFERENCES greenhouse_core.services(service_id)
  ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS services_parent_service_id_idx
  ON greenhouse_core.services (parent_service_id)
  WHERE parent_service_id IS NOT NULL;

-- ── 6. Trigger lineage protection (BEFORE INSERT OR UPDATE) ──
-- Reglas enforce:
--   a) Si parent_service_id IS NOT NULL AND engagement_kind = 'regular',
--      el parent debe tener engagement_kind != 'regular'
--      (solo Sample Sprints pueden ser parents de regular services convertidos).
--   b) Auto-referencia prohibida (parent_service_id = service_id).
--   c) Si parent_service_id IS NOT NULL, el parent debe existir y estar active != 'legacy_seed_archived'.
--   El segundo check (parent debe tener outcome converted) queda como TODO documentado;
--   se implementa en TASK-837 cuando la conversion lineage real entre operación.

CREATE OR REPLACE FUNCTION greenhouse_core.assert_services_lineage_protection()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_kind TEXT;
  v_parent_status TEXT;
BEGIN
  -- Caso null: skip (la mayoría de filas no tienen lineage).
  IF NEW.parent_service_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Caso a) Auto-referencia prohibida.
  IF NEW.parent_service_id = NEW.service_id THEN
    RAISE EXCEPTION 'TASK-836 lineage protection: service % cannot reference itself as parent', NEW.service_id
      USING ERRCODE = 'check_violation';
  END IF;

  -- Caso b) Parent debe existir y NO ser legacy_seed_archived.
  SELECT engagement_kind, status
    INTO v_parent_kind, v_parent_status
    FROM greenhouse_core.services
    WHERE service_id = NEW.parent_service_id;

  IF v_parent_kind IS NULL THEN
    RAISE EXCEPTION 'TASK-836 lineage protection: parent_service_id % does not exist', NEW.parent_service_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF v_parent_status = 'legacy_seed_archived' THEN
    RAISE EXCEPTION 'TASK-836 lineage protection: parent service % is legacy_seed_archived; cannot link new lineage', NEW.parent_service_id
      USING ERRCODE = 'check_violation';
  END IF;

  -- Caso c) Si NEW es regular, parent NO puede ser regular (chain regular->regular invalida).
  IF NEW.engagement_kind = 'regular' AND v_parent_kind = 'regular' THEN
    RAISE EXCEPTION 'TASK-836 lineage protection: regular service % cannot have regular parent % (only Sample Sprints can be parents of converted regular services)',
      NEW.service_id, NEW.parent_service_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS services_lineage_protection_trigger
  ON greenhouse_core.services;

CREATE TRIGGER services_lineage_protection_trigger
  BEFORE INSERT OR UPDATE ON greenhouse_core.services
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_core.assert_services_lineage_protection();

-- ── 7. Bloque DO con RAISE EXCEPTION post-DDL (anti pre-up-marker bug ISSUE-068) ──
-- Verifica que TODOS los cambios quedaron aplicados; aborta si no.

DO $$
DECLARE
  v_validation_accepted BOOLEAN;
  v_status_check_exists BOOLEAN;
  v_sync_check_exists BOOLEAN;
  v_unmapped_reason_exists BOOLEAN;
  v_parent_col_exists BOOLEAN;
  v_trigger_exists BOOLEAN;
BEGIN
  -- 1. CHECK pipeline_stage acepta 'validation'?
  SELECT EXISTS (
    SELECT 1
      FROM pg_constraint
      WHERE conname = 'services_pipeline_stage_check'
        AND pg_get_constraintdef(oid) LIKE '%validation%'
  ) INTO v_validation_accepted;

  IF NOT v_validation_accepted THEN
    RAISE EXCEPTION 'TASK-836 anti pre-up-marker check: services_pipeline_stage_check did NOT include validation';
  END IF;

  -- 2. CHECK status existe?
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'services_status_check'
  ) INTO v_status_check_exists;

  IF NOT v_status_check_exists THEN
    RAISE EXCEPTION 'TASK-836 anti pre-up-marker check: services_status_check NOT created';
  END IF;

  -- 3. CHECK hubspot_sync_status existe?
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'services_hubspot_sync_status_check'
  ) INTO v_sync_check_exists;

  IF NOT v_sync_check_exists THEN
    RAISE EXCEPTION 'TASK-836 anti pre-up-marker check: services_hubspot_sync_status_check NOT created';
  END IF;

  -- 4. Columna unmapped_reason existe?
  SELECT EXISTS (
    SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'greenhouse_core'
        AND table_name = 'services'
        AND column_name = 'unmapped_reason'
  ) INTO v_unmapped_reason_exists;

  IF NOT v_unmapped_reason_exists THEN
    RAISE EXCEPTION 'TASK-836 anti pre-up-marker check: column unmapped_reason NOT created';
  END IF;

  -- 5. Columna parent_service_id existe?
  SELECT EXISTS (
    SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'greenhouse_core'
        AND table_name = 'services'
        AND column_name = 'parent_service_id'
  ) INTO v_parent_col_exists;

  IF NOT v_parent_col_exists THEN
    RAISE EXCEPTION 'TASK-836 anti pre-up-marker check: column parent_service_id NOT created';
  END IF;

  -- 6. Trigger lineage protection existe?
  SELECT EXISTS (
    SELECT 1
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'greenhouse_core'
        AND c.relname = 'services'
        AND t.tgname = 'services_lineage_protection_trigger'
        AND NOT t.tgisinternal
  ) INTO v_trigger_exists;

  IF NOT v_trigger_exists THEN
    RAISE EXCEPTION 'TASK-836 anti pre-up-marker check: trigger services_lineage_protection_trigger NOT created';
  END IF;

  RAISE NOTICE 'TASK-836 migration verified: pipeline_stage validation OK, status CHECK OK, sync_status CHECK OK, unmapped_reason OK, parent_service_id OK, lineage trigger OK';
END
$$;

-- Down Migration

-- Drop trigger first (depends on function).
DROP TRIGGER IF EXISTS services_lineage_protection_trigger
  ON greenhouse_core.services;

DROP FUNCTION IF EXISTS greenhouse_core.assert_services_lineage_protection();

-- Drop columns + indexes.
DROP INDEX IF EXISTS greenhouse_core.services_parent_service_id_idx;

ALTER TABLE greenhouse_core.services
  DROP COLUMN IF EXISTS parent_service_id;

DROP INDEX IF EXISTS greenhouse_core.services_unmapped_reason_idx;

ALTER TABLE greenhouse_core.services
  DROP CONSTRAINT IF EXISTS services_unmapped_reason_check;

ALTER TABLE greenhouse_core.services
  DROP COLUMN IF EXISTS unmapped_reason;

-- Drop CHECK constraints (status + hubspot_sync_status).
ALTER TABLE greenhouse_core.services
  DROP CONSTRAINT IF EXISTS services_hubspot_sync_status_check;

ALTER TABLE greenhouse_core.services
  DROP CONSTRAINT IF EXISTS services_status_check;

-- Restore previous CHECK pipeline_stage (sin 'validation').
ALTER TABLE greenhouse_core.services
  DROP CONSTRAINT IF EXISTS services_pipeline_stage_check;

ALTER TABLE greenhouse_core.services
  ADD CONSTRAINT services_pipeline_stage_check
  CHECK (pipeline_stage IN (
    'onboarding',
    'active',
    'renewal_pending',
    'renewed',
    'closed',
    'paused'
  ));
