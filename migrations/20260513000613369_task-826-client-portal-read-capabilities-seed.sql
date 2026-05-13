-- Up Migration

-- ─────────────────────────────────────────────────────────────
-- TASK-826 Slice 5 (cont) — Seed 9 client-facing READ capabilities
-- ─────────────────────────────────────────────────────────────
-- Materializa los values forward-looking declarados en
-- greenhouse_client_portal.modules.capabilities[] (TASK-824 seed).
-- Sin estas filas, el parity check B (seed ⊆ TS catalog) y el `can()` runtime
-- fallarían cuando un client_user intente leer una surface del módulo.

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description)
VALUES
  ('client_portal.pulse.read',
    'client_portal',
    ARRAY['read'],
    ARRAY['space','tenant','all'],
    'TASK-826 — client-facing Pulse surface (Pulse cliente, performance highlights)'),

  ('client_portal.creative_hub.read',
    'client_portal',
    ARRAY['read'],
    ARRAY['space','tenant','all'],
    'TASK-826 — client-facing Creative Hub surface (Globe bundle core)'),

  ('client_portal.csc_pipeline.read',
    'client_portal',
    ARRAY['read'],
    ARRAY['space','tenant','all'],
    'TASK-826 — client-facing CSC pipeline (Creative Strategy Cell pipeline)'),

  ('client_portal.brand_intelligence.read',
    'client_portal',
    ARRAY['read'],
    ARRAY['space','tenant','all'],
    'TASK-826 — client-facing Brand Intelligence surface'),

  ('client_portal.cvr.read',
    'client_portal',
    ARRAY['read'],
    ARRAY['space','tenant','all'],
    'TASK-826 — client-facing Creative Velocity Review (quarterly)'),

  ('client_portal.roi.read',
    'client_portal',
    ARRAY['read'],
    ARRAY['space','tenant','all'],
    'TASK-826 — client-facing ROI reports surface'),

  ('client_portal.exports.generate',
    'client_portal',
    ARRAY['export'],
    ARRAY['space','tenant','all'],
    'TASK-826 — client-facing exports generation (PDF/Excel/snapshot)'),

  ('client_portal.staff_aug.read',
    'client_portal',
    ARRAY['read'],
    ARRAY['space','tenant','all'],
    'TASK-826 — client-facing Staff Augmentation surface'),

  ('client_portal.web_delivery.read',
    'client_portal',
    ARRAY['read'],
    ARRAY['space','tenant','all'],
    'TASK-826 — client-facing Web Delivery surface (Wave bundle core)')
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
    'client_portal.pulse.read',
    'client_portal.creative_hub.read',
    'client_portal.csc_pipeline.read',
    'client_portal.brand_intelligence.read',
    'client_portal.cvr.read',
    'client_portal.roi.read',
    'client_portal.exports.generate',
    'client_portal.staff_aug.read',
    'client_portal.web_delivery.read'
  )
  AND deprecated_at IS NULL;

  IF expected_count <> 9 THEN
    RAISE EXCEPTION 'TASK-826 read-capabilities anti pre-up-marker check: expected 9 client_portal read capabilities seeded, found %', expected_count;
  END IF;
END
$$;

-- Down Migration

DELETE FROM greenhouse_core.capabilities_registry
WHERE capability_key IN (
  'client_portal.pulse.read',
  'client_portal.creative_hub.read',
  'client_portal.csc_pipeline.read',
  'client_portal.brand_intelligence.read',
  'client_portal.cvr.read',
  'client_portal.roi.read',
  'client_portal.exports.generate',
  'client_portal.staff_aug.read',
  'client_portal.web_delivery.read'
);
