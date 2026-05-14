-- Up Migration

-- TASK-877 — Workforce external identity reconciliation.
--
-- Separa el permiso operacional de HR para resolver identidad externa desde
-- Workforce Activation de las capabilities administrativas del módulo de
-- reconciliación. La surface visible sigue viviendo en `equipo.workforce_activation`;
-- estas filas mantienen paridad TS↔DB en greenhouse_core.capabilities_registry.

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'workforce.member.external_identity.resolve',
    'workforce',
    ARRAY['read', 'update'],
    ARRAY['tenant'],
    'TASK-877 — Lectura de candidatos y resolución auditada de identidad externa requerida para activar colaboradores.',
    NOW(),
    NULL
  ),
  (
    'identity.reconciliation.read',
    'organization',
    ARRAY['read'],
    ARRAY['tenant'],
    'TASK-877 — Lectura administrativa de propuestas de reconciliación de identidad externa.',
    NOW(),
    NULL
  ),
  (
    'identity.reconciliation.approve',
    'organization',
    ARRAY['approve'],
    ARRAY['tenant'],
    'TASK-877 — Aprobación administrativa auditada de propuestas de reconciliación de identidad externa.',
    NOW(),
    NULL
  ),
  (
    'identity.reconciliation.reject',
    'organization',
    ARRAY['update'],
    ARRAY['tenant'],
    'TASK-877 — Rechazo o descarte administrativo auditado de propuestas de reconciliación de identidad externa.',
    NOW(),
    NULL
  ),
  (
    'identity.reconciliation.reassign',
    'organization',
    ARRAY['update'],
    ARRAY['tenant'],
    'TASK-877 — Reasignación administrativa auditada de propuestas de reconciliación a otro member/profile.',
    NOW(),
    NULL
  ),
  (
    'identity.reconciliation.run',
    'organization',
    ARRAY['execute'],
    ARRAY['tenant'],
    'TASK-877 — Ejecución manual del discovery/reconciliation job de identidades externas.',
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
  capability_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO capability_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN (
    'workforce.member.external_identity.resolve',
    'identity.reconciliation.read',
    'identity.reconciliation.approve',
    'identity.reconciliation.reject',
    'identity.reconciliation.reassign',
    'identity.reconciliation.run'
  )
    AND deprecated_at IS NULL;

  IF capability_count <> 6 THEN
    RAISE EXCEPTION 'TASK-877 anti pre-up-marker check: expected 6 active external identity capabilities, got %', capability_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key IN (
  'workforce.member.external_identity.resolve',
  'identity.reconciliation.read',
  'identity.reconciliation.approve',
  'identity.reconciliation.reject',
  'identity.reconciliation.reassign',
  'identity.reconciliation.run'
);
