-- Up Migration
--
-- TASK-935 Slice 2 — Reconcile capability module drift (TS catalog vs DB registry).
-- =====================================================================
--
-- `person.legal_entity_relationships.reconcile_drift` (TASK-891) quedó seedeada
-- en greenhouse_core.capabilities_registry con module='identity', pero el TS
-- catalog (canónico, CLAUDE.md TASK-891) la declara con module='people'
-- (alineado con person.legal_profile.* de TASK-784). El parity test detecta el
-- mismatch. El módulo NO afecta el gate can() (que matchea capability+action+
-- scope), solo el agrupamiento/display — por eso no hubo impacto funcional.
-- Canónico = 'people' (TS). Alineamos la DB.

UPDATE greenhouse_core.capabilities_registry
   SET module = 'people'
 WHERE capability_key = 'person.legal_entity_relationships.reconcile_drift'
   AND module = 'identity';

-- Verification (anti pre-up-marker guard).
DO $$
DECLARE
  wrong_module INTEGER;
BEGIN
  SELECT COUNT(*) INTO wrong_module
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key = 'person.legal_entity_relationships.reconcile_drift'
    AND module <> 'people';

  IF wrong_module > 0 THEN
    RAISE EXCEPTION 'TASK-935: person.legal_entity_relationships.reconcile_drift sigue con module != people (% filas)', wrong_module;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
   SET module = 'identity'
 WHERE capability_key = 'person.legal_entity_relationships.reconcile_drift'
   AND module = 'people';
