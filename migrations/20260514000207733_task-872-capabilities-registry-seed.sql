-- Up Migration

-- TASK-872 Slice 1.5 — Capabilities registry seed
--
-- 4 capabilities nuevas (3 SCIM eligibility + 1 workforce intake transition).
-- Patrón canonical: ON CONFLICT DO UPDATE para idempotency (TASK-850 mirror).
-- Parity test live `src/lib/capabilities-registry/parity.live.test.ts` rompe
-- build si emerge drift TS catalog ↔ DB registry.

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description)
VALUES
  (
    'scim.eligibility_override.create',
    'organization',
    ARRAY['create'],
    ARRAY['tenant'],
    'TASK-872 — Crear override de elegibilidad SCIM (L4 allow/deny). Capacidad break-glass: bypassea L1/L2/L3 policy con reason >= 20 chars + audit append-only. Reservada EFEONCE_ADMIN + DEVOPS_OPERATOR.'
  ),
  (
    'scim.eligibility_override.delete',
    'organization',
    ARRAY['delete'],
    ARRAY['tenant'],
    'TASK-872 — Supersede (soft-delete) override de elegibilidad SCIM existente. NUNCA physical DELETE — sets effective_to + audit row. Reservada EFEONCE_ADMIN solo.'
  ),
  (
    'scim.backfill.execute',
    'organization',
    ARRAY['execute'],
    ARRAY['all'],
    'TASK-872 — Disparar SCIM backfill internal collaborators (dry-run + apply). Apply requiere --allowlist explícita por email/OID. Reservada EFEONCE_ADMIN solo. Patrón mirror TASK-850 platform.release.preflight.execute.'
  ),
  (
    'workforce.member.complete_intake',
    'workforce',
    ARRAY['update'],
    ARRAY['tenant'],
    'TASK-872 — Transición member.workforce_intake_status pending_intake → completed (o in_review → completed). Validation server-side: requiere compensation_packages + contract_terms + person_legal_profile readiness. Reservada FINANCE_ADMIN + EFEONCE_ADMIN.'
  )
ON CONFLICT (capability_key) DO UPDATE
SET module = EXCLUDED.module,
    allowed_actions = EXCLUDED.allowed_actions,
    allowed_scopes = EXCLUDED.allowed_scopes,
    description = EXCLUDED.description,
    deprecated_at = NULL;

-- Anti pre-up-marker check
DO $$
DECLARE
  cap_count int;
BEGIN
  SELECT COUNT(*) INTO cap_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN (
    'scim.eligibility_override.create',
    'scim.eligibility_override.delete',
    'scim.backfill.execute',
    'workforce.member.complete_intake'
  )
  AND deprecated_at IS NULL;

  IF cap_count != 4 THEN
    RAISE EXCEPTION 'TASK-872 anti pre-up-marker: expected 4 capabilities seeded active, got %. Migration markers may be inverted.', cap_count;
  END IF;
END
$$;

-- Down Migration

-- Use deprecation marker en lugar de DELETE — capabilities son append-only
-- (canonical TASK-840 deprecated capabilities discipline).
UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key IN (
  'scim.eligibility_override.create',
  'scim.eligibility_override.delete',
  'scim.backfill.execute',
  'workforce.member.complete_intake'
);
