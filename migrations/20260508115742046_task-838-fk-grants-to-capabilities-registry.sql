-- Up Migration

-- TASK-838 Fase 4 / ISSUE-068 — FK enforcement de grants → capabilities_registry.
-- ============================================================================
-- Cierra el defense-in-depth Layer 1 que TASK-611 V1 dejó deferred.
--
-- Una vez existen las governance tables (TASK-838 Fase 1), agregar FK desde
-- `capability` columns hacia `capabilities_registry.capability_key` enforce
-- a nivel DB que NUNCA se puede insertar un grant con capability inexistente.
--
-- Patrón canónico NOT VALID + VALIDATE atomic (TASK-708/728/766):
--   1. ALTER TABLE ... ADD CONSTRAINT ... NOT VALID — no escanea filas existentes
--      (zero blocking lock).
--   2. Pre-check defensivo: scan filas existentes con capability inexistente.
--      Si hay rows huérfanas, RAISE NOTICE con detalle (operador decide qué hacer).
--   3. ALTER TABLE ... VALIDATE CONSTRAINT — scan + valida; con tablas vacías
--      es trivial. Con miles de rows sería más lento pero las governance
--      tables son operacionales (decenas, no miles).

-- 1. Pre-check defensivo: detectar grants con capability NO en registry.
--    Las tablas son nuevas (creadas por Fase 1 vacías), pero el check es
--    defense-in-depth para futuras re-aplicaciones idempotentes.
DO $$
DECLARE
  orphan_role_count    integer;
  orphan_user_count    integer;
  orphan_role_sample   text;
  orphan_user_sample   text;
BEGIN
  SELECT count(*), string_agg(DISTINCT capability, ', ' ORDER BY capability)
    INTO orphan_role_count, orphan_role_sample
    FROM greenhouse_core.role_entitlement_defaults rd
    WHERE NOT EXISTS (
      SELECT 1 FROM greenhouse_core.capabilities_registry cr
      WHERE cr.capability_key = rd.capability AND cr.deprecated_at IS NULL
    );

  SELECT count(*), string_agg(DISTINCT capability, ', ' ORDER BY capability)
    INTO orphan_user_count, orphan_user_sample
    FROM greenhouse_core.user_entitlement_overrides uo
    WHERE NOT EXISTS (
      SELECT 1 FROM greenhouse_core.capabilities_registry cr
      WHERE cr.capability_key = uo.capability AND cr.deprecated_at IS NULL
    );

  IF orphan_role_count > 0 THEN
    RAISE NOTICE
      'TASK-838 Fase 4: % orphan role_entitlement_defaults rows reference unknown/deprecated capabilities: [%]. VALIDATE will fail. Mark them deprecated_at in capabilities_registry o limpiar/archivar las rows huérfanas antes de re-correr esta migration.',
      orphan_role_count, orphan_role_sample;
    RAISE EXCEPTION 'TASK-838 Fase 4 aborted: % orphan rows in role_entitlement_defaults', orphan_role_count;
  END IF;

  IF orphan_user_count > 0 THEN
    RAISE NOTICE
      'TASK-838 Fase 4: % orphan user_entitlement_overrides rows reference unknown/deprecated capabilities: [%]. VALIDATE will fail.',
      orphan_user_count, orphan_user_sample;
    RAISE EXCEPTION 'TASK-838 Fase 4 aborted: % orphan rows in user_entitlement_overrides', orphan_user_count;
  END IF;
END
$$;

-- 2. ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ... NOT VALID — instant.
--    NOT VALID significa "el constraint aplica a futuros INSERT/UPDATE pero NO
--    re-escanea filas existentes". Sin lock pesado.
ALTER TABLE greenhouse_core.role_entitlement_defaults
  ADD CONSTRAINT role_entitlement_defaults_capability_fk
  FOREIGN KEY (capability)
  REFERENCES greenhouse_core.capabilities_registry(capability_key)
  NOT VALID;

ALTER TABLE greenhouse_core.user_entitlement_overrides
  ADD CONSTRAINT user_entitlement_overrides_capability_fk
  FOREIGN KEY (capability)
  REFERENCES greenhouse_core.capabilities_registry(capability_key)
  NOT VALID;

-- 3. ALTER TABLE ... VALIDATE CONSTRAINT — verifica filas existentes.
--    Con tablas vacías (Fase 1) es trivial. Si hubieran rows orphan, el pre-check
--    DO block ya habría abortado.
ALTER TABLE greenhouse_core.role_entitlement_defaults
  VALIDATE CONSTRAINT role_entitlement_defaults_capability_fk;

ALTER TABLE greenhouse_core.user_entitlement_overrides
  VALIDATE CONSTRAINT user_entitlement_overrides_capability_fk;

-- 4. Anti pre-up-marker bug guard — verifica que los 2 FKs realmente quedaron
--    creados Y validados en pg_constraint.
DO $$
DECLARE
  expected_fks CONSTANT text[] := ARRAY[
    'role_entitlement_defaults_capability_fk',
    'user_entitlement_overrides_capability_fk'
  ];
  missing_fk    text;
  invalid_fk    text;
BEGIN
  FOR missing_fk IN
    SELECT fk FROM unnest(expected_fks) AS fk
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = fk AND contype = 'f'
    )
  LOOP
    RAISE EXCEPTION
      'TASK-838 Fase 4 verify FAILED: FK constraint % was NOT created.',
      missing_fk;
  END LOOP;

  FOR invalid_fk IN
    SELECT conname FROM pg_constraint
    WHERE conname = ANY (expected_fks) AND contype = 'f' AND NOT convalidated
  LOOP
    RAISE EXCEPTION
      'TASK-838 Fase 4 verify FAILED: FK constraint % is NOT VALID. Run VALIDATE CONSTRAINT.',
      invalid_fk;
  END LOOP;
END
$$;

-- Down Migration

ALTER TABLE greenhouse_core.user_entitlement_overrides
  DROP CONSTRAINT IF EXISTS user_entitlement_overrides_capability_fk;

ALTER TABLE greenhouse_core.role_entitlement_defaults
  DROP CONSTRAINT IF EXISTS role_entitlement_defaults_capability_fk;
