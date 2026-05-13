-- Up Migration

-- ─────────────────────────────────────────────────────────────
-- TASK-826 Slice 5 — Seed 7 client_portal admin capabilities
-- ─────────────────────────────────────────────────────────────
-- Reflexión declarativa DB del TS catalog (`src/config/entitlements-catalog.ts`).
-- Parity test live (`src/lib/client-portal/capabilities/parity.live.test.ts`) rompe
-- build si TS ↔ DB divergen.
--
-- NOTA spec V1.4 §3.1: el nombre de la capability `override_business_line_default`
-- PRESERVA el concept-level "business_line" (NO se renombra a `applicability_scope`).
-- Es la única capability operator-facing que se interpreta semánticamente como
-- "permitir asignar módulo cuyo applicability_scope ≠ business_line canónico del cliente".

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description)
VALUES
  ('client_portal.module.read_assignment',
    'client_portal',
    ARRAY['read'],
    ARRAY['tenant','all'],
    'TASK-826 — read assignments + history per organization'),

  ('client_portal.module.enable',
    'client_portal',
    ARRAY['create'],
    ARRAY['tenant','all'],
    'TASK-826 — enable a module assignment for an organization'),

  ('client_portal.module.disable',
    'client_portal',
    ARRAY['delete'],
    ARRAY['tenant','all'],
    'TASK-826 — churn / terminate a module assignment (terminal)'),

  ('client_portal.module.pause',
    'client_portal',
    ARRAY['update'],
    ARRAY['tenant','all'],
    'TASK-826 — pause / resume an active module assignment'),

  ('client_portal.module.override_business_line_default',
    'client_portal',
    ARRAY['approve'],
    ARRAY['tenant','all'],
    'TASK-826 — approve override of business_line check when applicability_scope mismatches'),

  ('client_portal.catalog.manage',
    'client_portal',
    ARRAY['read','manage'],
    ARRAY['all'],
    'TASK-826 — manage the canonical module catalog (V1.0 read-only UI)'),

  ('client_portal.assignment.migrate_legacy',
    'client_portal',
    ARRAY['create'],
    ARRAY['all'],
    'TASK-826 — migrate legacy tenant_capabilities.businessLines[] to module assignments (TASK-829 backfill)')
ON CONFLICT (capability_key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Anti pre-up-marker bug check (TASK-838 pattern)
-- ─────────────────────────────────────────────────────────────
-- Si el marker `-- Up Migration` quedó invertido o el CONFLICT swallow-eo silencio,
-- este bloque DO aborta con mensaje explícito.

DO $$
DECLARE expected_count integer;
BEGIN
  SELECT COUNT(*) INTO expected_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN (
    'client_portal.module.read_assignment',
    'client_portal.module.enable',
    'client_portal.module.disable',
    'client_portal.module.pause',
    'client_portal.module.override_business_line_default',
    'client_portal.catalog.manage',
    'client_portal.assignment.migrate_legacy'
  )
  AND deprecated_at IS NULL;

  IF expected_count <> 7 THEN
    RAISE EXCEPTION 'TASK-826 anti pre-up-marker check: expected 7 client_portal capabilities seeded, found %', expected_count;
  END IF;
END
$$;

-- Down Migration

DELETE FROM greenhouse_core.capabilities_registry
WHERE capability_key IN (
  'client_portal.module.read_assignment',
  'client_portal.module.enable',
  'client_portal.module.disable',
  'client_portal.module.pause',
  'client_portal.module.override_business_line_default',
  'client_portal.catalog.manage',
  'client_portal.assignment.migrate_legacy'
);
