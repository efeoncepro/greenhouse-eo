-- Up Migration

-- TASK-876 — Workforce Activation Remediation Flow.
-- Capability granular para editar los datos laborales que desbloquean
-- readiness antes de ejecutar la transicion final complete-intake.

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'workforce.member.intake.update',
    'workforce',
    ARRAY['update'],
    ARRAY['tenant'],
    'TASK-876 — Actualizacion auditada de datos laborales de intake para resolver blockers antes de completar ficha.',
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
  WHERE capability_key = 'workforce.member.intake.update'
    AND module = 'workforce'
    AND deprecated_at IS NULL;

  IF capability_count <> 1 THEN
    RAISE EXCEPTION 'TASK-876 anti pre-up-marker check: expected active workforce.member.intake.update capability, got %', capability_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'workforce.member.intake.update';
