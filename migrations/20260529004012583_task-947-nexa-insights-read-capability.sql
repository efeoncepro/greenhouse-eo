-- Up Migration

-- TASK-947 — Seed canonical capability `nexa.insights.read` para el detail page
-- `/nexa/insights/[id]`. Module `delivery` (Nexa Insights vive bajo el motor
-- ICO delivery dominio); action `read`; default scope `tenant`.
--
-- Invariant TASK-873 + TASK-935: capability seed en DB DEBE acompañar grant
-- en runtime.ts mismo PR. Sin grant runtime, `can(subject, 'nexa.insights.read',
-- 'read', 'tenant')` retorna false para todos → latent 403. El guard
-- `capability-grant-coverage.test.ts` lo enforce mecánicamente.

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description)
VALUES (
  'nexa.insights.read',
  'delivery',
  ARRAY['read'],
  ARRAY['tenant', 'all'],
  'TASK-947 — read canonical de Nexa Insights detail page /nexa/insights/[id]. Subject-aware filter por space/member assignment + dispatch prefix EO-AIS-* (signal-anchored) / EO-AIE-* (enrichment-anchored) / EO-AIH-* (enrichment-history forensic).'
)
ON CONFLICT (capability_key) DO NOTHING;

-- Anti pre-up-marker check: verifica que la fila quedó realmente insertada.
DO $$
DECLARE registered_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO registered_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key = 'nexa.insights.read';

  IF registered_count < 1 THEN
    RAISE EXCEPTION 'TASK-947 anti pre-up-marker check: nexa.insights.read NOT registered in capabilities_registry. Migration markers may be inverted.';
  END IF;
END
$$;

-- Down Migration

-- NOTE: capability rows en `capabilities_registry` son append-only governance
-- por design (CLAUDE.md TASK-840 capability deprecation discipline). Down
-- migration marca `deprecated_at` en lugar de DELETE para preservar audit trail.

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW(),
    updated_at = NOW()
WHERE capability_key = 'nexa.insights.read';
