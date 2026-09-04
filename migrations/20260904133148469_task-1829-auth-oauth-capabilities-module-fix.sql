-- Up Migration

-- TASK-1829 forward-fix: las capabilities `identity.auth_client.register` / `identity.auth_consent.revoke`
-- se sembraron con module='identity'; el catálogo TS (ENTITLEMENT_MODULES) agrupa las keys `identity.*`
-- bajo el module `organization` (igual que `identity.external_access.revoke`, TASK-1631). Se alinea el
-- registry con el catálogo en vez de editar la migration ya aplicada (regla: nunca editar una aplicada).

UPDATE greenhouse_core.capabilities_registry
SET module = 'organization'
WHERE capability_key IN ('identity.auth_client.register', 'identity.auth_consent.revoke');

DO $$
DECLARE aligned INTEGER;
BEGIN
  SELECT COUNT(*) INTO aligned
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN ('identity.auth_client.register', 'identity.auth_consent.revoke')
    AND module = 'organization' AND deprecated_at IS NULL;

  IF aligned <> 2 THEN
    RAISE EXCEPTION 'TASK-1829 anti pre-up-marker: expected 2 capabilities under module organization, got %.', aligned;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET module = 'identity'
WHERE capability_key IN ('identity.auth_client.register', 'identity.auth_consent.revoke');
