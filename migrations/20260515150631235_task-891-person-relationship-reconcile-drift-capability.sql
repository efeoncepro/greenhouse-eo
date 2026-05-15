-- Up Migration

-- TASK-891 Slice 3 — Person 360 relationship drift reconciliation capability.
--
-- Capability granular para autorizar `reconcileMemberContractDrift` que cierra
-- la relacion legacy `employee` + abre nueva `contractor` en una sola
-- transaccion atomica. V1.0 grant solo EFEONCE_ADMIN porque drift Person 360
-- es cross-domain (payroll readiness, payslips, reportes legales, ICO).
-- Delegacion a HR queda V1.1 post 30d steady.
--
-- Reason >= 20 chars enforced en helper + route handler (bar mas alto que
-- TASK-890 close_external_provider >= 10 porque blast es mayor).
--
-- Spec: docs/architecture/GREENHOUSE_PERSON_LEGAL_RELATIONSHIP_RECONCILIATION_V1.md
-- TS catalog: src/config/entitlements-catalog.ts (mismo PR)
-- Runtime grant: src/lib/entitlements/runtime.ts (mismo PR, EFEONCE_ADMIN solo)

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'person.legal_entity_relationships.reconcile_drift',
    'identity',
    ARRAY['update'],
    ARRAY['tenant'],
    'TASK-891 — Reconciliacion auditada de drift Person 360 (member.contract_type contractor/Deel + relacion legal activa employee). Cierra legacy + abre contractor en tx atomica. Reason >= 20 chars. V1.0 EFEONCE_ADMIN-only; delegacion a HR queda V1.1.',
    NOW(),
    NULL
  )
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- Anti pre-up-marker bug guard: verifica que la capability quedo registrada
-- post-INSERT (sigue patron canonico CLAUDE.md migration markers + TASK-839).
DO $$
DECLARE
  registered_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO registered_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key = 'person.legal_entity_relationships.reconcile_drift';

  IF registered_count <> 1 THEN
    RAISE EXCEPTION 'TASK-891 anti pre-up-marker check: expected 1 capabilities_registry row for person.legal_entity_relationships.reconcile_drift, got %', registered_count;
  END IF;
END
$$;

-- Down Migration

-- Soft-delete: marca deprecated_at en lugar de DELETE para preservar audit.
-- Registry NUNCA pierde filas (CLAUDE.md hard rule "Deprecated Capabilities Discipline").
UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'person.legal_entity_relationships.reconcile_drift'
  AND deprecated_at IS NULL;
