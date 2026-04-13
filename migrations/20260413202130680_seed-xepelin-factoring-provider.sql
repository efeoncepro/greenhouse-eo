-- ═══════════════════════════════════════════════════════════════════════════
-- Seed: Xepelin como proveedor de factoring
--
-- Razón social registrada: X Capital SpA
-- provider_type = 'factoring' habilita el proveedor en el dropdown de
-- FactoringOperationDrawer (GET /api/finance/factoring/providers).
-- ═══════════════════════════════════════════════════════════════════════════

-- Up Migration

INSERT INTO greenhouse_core.providers (
  provider_id,
  provider_name,
  legal_name,
  provider_type,
  active,
  created_at,
  updated_at
)
VALUES (
  'prov-xepelin-001',
  'Xepelin',
  'X Capital SpA',
  'factoring',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (provider_id) DO UPDATE
  SET provider_name = EXCLUDED.provider_name,
      legal_name    = EXCLUDED.legal_name,
      provider_type = EXCLUDED.provider_type,
      active        = EXCLUDED.active,
      updated_at    = CURRENT_TIMESTAMP;

-- Down Migration

DELETE FROM greenhouse_core.providers WHERE provider_id = 'prov-xepelin-001';
