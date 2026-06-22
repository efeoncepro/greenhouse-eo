-- Up Migration

-- TASK-1202 — Quote capability hardening (Wave 3 F9).
-- Seed de 2 capabilities admin-only para las acciones price-affecting más sensibles del
-- cotizador: override manual del costo de una línea (bypassa el pricing engine) y la
-- config global de márgenes/tiers. Grant (runtime.ts, mismo PR): FINANCE_ADMIN +
-- EFEONCE_ADMIN. El resto del lifecycle del cotizador (crear/editar/emitir/enviar/
-- compartir) usa la capability EXISTENTE commercial.quotation (roles comerciales,
-- consistente con el command de TASK-1212); convert-to-invoice usa la existente
-- commercial.quote_to_cash.execute. Solo gate de acceso; el pricing engine es SoT.
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('commercial.quotation.cost_override', 'commercial', ARRAY['update'], ARRAY['tenant'], 'TASK-1202 — Override manual del costo de una línea de cotización (bypassa el engine). POST /api/finance/quotes/[id]/lines/[lineItemId]/cost-override. Admin-only.', NOW(), NULL),
  ('commercial.quotation.pricing_config', 'commercial', ARRAY['update'], ARRAY['tenant'], 'TASK-1202 — Config global de márgenes/tiers del cotizador. PUT /api/finance/quotes/pricing/config. Admin-only.', NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- Anti pre-up-marker bug guard: aborta si los 2 seeds no quedaron realmente aplicados.
DO $$
DECLARE seeded_count integer;
BEGIN
  SELECT COUNT(*) INTO seeded_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN ('commercial.quotation.cost_override', 'commercial.quotation.pricing_config')
    AND deprecated_at IS NULL;

  IF seeded_count <> 2 THEN
    RAISE EXCEPTION 'TASK-1202 anti pre-up-marker check: expected 2 capabilities seeded, found %. Migration markers may be inverted.', seeded_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key IN ('commercial.quotation.cost_override', 'commercial.quotation.pricing_config')
  AND deprecated_at IS NULL;
