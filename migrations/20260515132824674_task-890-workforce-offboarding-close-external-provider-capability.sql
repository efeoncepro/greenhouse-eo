-- Up Migration

-- TASK-890 Slice 4 — Workforce offboarding external provider close capability.
--
-- Capability granular para autorizar el cierre de offboarding cases en lane
-- `external_payroll` (Deel/EOR/proveedor externo). Operador firma decision;
-- cierre operativo vive en el proveedor externo (Greenhouse no emite
-- finiquito Chile). Reason >= 10 chars enforced en route handler.
--
-- Spec: docs/architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md
-- TS catalog: src/config/entitlements-catalog.ts (mismo PR)
-- Runtime grant: src/lib/entitlements/runtime.ts (mismo PR — HR route_group ∪
-- EFEONCE_ADMIN ∪ FINANCE_ADMIN, action `update`, scope `tenant`).

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'workforce.offboarding.close_external_provider',
    'workforce',
    ARRAY['update'],
    ARRAY['tenant'],
    'TASK-890 — Cierre auditado de offboarding cases en lane external_payroll (Deel/EOR/proveedor externo). Reason >= 10 chars; combinada con hr.offboarding_case:approve|manage cuando transition cruza el state machine.',
    NOW(),
    NULL
  )
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- Anti pre-up-marker bug guard: verifica que la capability quedo realmente
-- registrada post-INSERT (sigue patron canonico CLAUDE.md migration markers).
DO $$
DECLARE
  registered_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO registered_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key = 'workforce.offboarding.close_external_provider';

  IF registered_count <> 1 THEN
    RAISE EXCEPTION 'TASK-890 anti pre-up-marker check: expected 1 capabilities_registry row for workforce.offboarding.close_external_provider, got %', registered_count;
  END IF;
END
$$;

-- Down Migration

-- Soft-delete: marca deprecated_at en lugar de DELETE para preservar audit.
-- Registry NUNCA pierde filas (CLAUDE.md hard rule "Deprecated Capabilities Discipline").
UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'workforce.offboarding.close_external_provider'
  AND deprecated_at IS NULL;
