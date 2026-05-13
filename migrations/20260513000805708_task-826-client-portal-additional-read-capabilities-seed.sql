-- Up Migration

-- ─────────────────────────────────────────────────────────────
-- TASK-826 Slice 5 (cont 2) — Seed 3 additional client_portal read capabilities
-- ─────────────────────────────────────────────────────────────
-- Materializa los últimos 3 values forward-looking declarados en
-- greenhouse_client_portal.modules.capabilities[] (TASK-824 seed) que no
-- fueron seedeados en la migration anterior.

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description)
VALUES
  ('client_portal.assigned_team.read',
    'client_portal',
    ARRAY['read'],
    ARRAY['space','tenant','all'],
    'TASK-826 — client-facing Assigned Team surface (members + responsabilidades)'),

  ('client_portal.crm_command.read',
    'client_portal',
    ARRAY['read'],
    ARRAY['space','tenant','all'],
    'TASK-826 — client-facing CRM Command Center surface (CRM Solutions bundle)'),

  ('client_portal.cvr.export',
    'client_portal',
    ARRAY['export'],
    ARRAY['space','tenant','all'],
    'TASK-826 — client-facing CVR exports (PDF/Excel del Creative Velocity Review trimestral)')
ON CONFLICT (capability_key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Anti pre-up-marker bug check (TASK-838 pattern)
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE expected_count integer;
BEGIN
  SELECT COUNT(*) INTO expected_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN (
    'client_portal.assigned_team.read',
    'client_portal.crm_command.read',
    'client_portal.cvr.export'
  )
  AND deprecated_at IS NULL;

  IF expected_count <> 3 THEN
    RAISE EXCEPTION 'TASK-826 additional read-capabilities anti pre-up-marker check: expected 3 client_portal capabilities seeded, found %', expected_count;
  END IF;
END
$$;

-- Down Migration

DELETE FROM greenhouse_core.capabilities_registry
WHERE capability_key IN (
  'client_portal.assigned_team.read',
  'client_portal.crm_command.read',
  'client_portal.cvr.export'
);
