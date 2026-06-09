-- Up Migration
--
-- TASK-1019 — Workforce Contracting Studio capabilities (6) seeded into the
-- canonical capabilities_registry. Mirrors TASK-839/934 seed pattern.
-- Grants matrix lives in src/lib/entitlements/runtime.ts (operator decision 2026-06-05):
--   read              -> HR route_group ∪ HR_MANAGER ∪ HR_PAYROLL ∪ EFEONCE_ADMIN ∪ FINANCE_ADMIN
--   manage            -> HR route_group ∪ HR_MANAGER ∪ EFEONCE_ADMIN
--   ai_draft          -> HR_MANAGER ∪ EFEONCE_ADMIN
--   approve           -> EFEONCE_ADMIN (V0 unilateral approval; no `legal` role exists)
--   generate_document -> EFEONCE_ADMIN (dormant until the render/signature consumer task)
--   reveal_sensitive  -> EFEONCE_ADMIN ∪ HR_MANAGER

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'workforce.contracting.read',
    'workforce',
    ARRAY['read'],
    ARRAY['tenant'],
    'TASK-1019 — Leer casos de contratación (cartas oferta + contratos), drafts y validación bilingüe.',
    NOW(),
    NULL
  ),
  (
    'workforce.contracting.manage',
    'workforce',
    ARRAY['create','update','manage'],
    ARRAY['tenant'],
    'TASK-1019 — Crear/editar casos y drafts de contratación; gestionar el ciclo de vida (sin aprobar/firmar).',
    NOW(),
    NULL
  ),
  (
    'workforce.contracting.ai_draft',
    'workforce',
    ARRAY['create'],
    ARRAY['tenant'],
    'TASK-1019 — Disparar el drafting asistido por Claude (advisory-only; nunca auto-aprueba).',
    NOW(),
    NULL
  ),
  (
    'workforce.contracting.approve',
    'workforce',
    ARRAY['approve'],
    ARRAY['tenant'],
    'TASK-1019 — Aprobar el par bilingüe completo (ES+EN, parity pass). V0 unilateral EFEONCE_ADMIN.',
    NOW(),
    NULL
  ),
  (
    'workforce.contracting.generate_document',
    'workforce',
    ARRAY['create'],
    ARRAY['tenant'],
    'TASK-1019 — Gate de la acción de generar el artefacto firmable (PDF/DOCX). Reservada; ejercida por el render consumer futuro.',
    NOW(),
    NULL
  ),
  (
    'workforce.contracting.reveal_sensitive',
    'workforce',
    ARRAY['read'],
    ARRAY['tenant'],
    'TASK-1019 — Revelar datos sensibles (PII) usados en drafting. Admin/HR only.',
    NOW(),
    NULL
  )
ON CONFLICT (capability_key) DO NOTHING;

-- Anti pre-up-marker guard
DO $$
DECLARE
  registered_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO registered_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN (
    'workforce.contracting.read',
    'workforce.contracting.manage',
    'workforce.contracting.ai_draft',
    'workforce.contracting.approve',
    'workforce.contracting.generate_document',
    'workforce.contracting.reveal_sensitive'
  );

  IF registered_count <> 6 THEN
    RAISE EXCEPTION 'TASK-1019: expected 6 workforce.contracting.* capabilities, got %', registered_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key IN (
  'workforce.contracting.read',
  'workforce.contracting.manage',
  'workforce.contracting.ai_draft',
  'workforce.contracting.approve',
  'workforce.contracting.generate_document',
  'workforce.contracting.reveal_sensitive'
)
  AND deprecated_at IS NULL;
