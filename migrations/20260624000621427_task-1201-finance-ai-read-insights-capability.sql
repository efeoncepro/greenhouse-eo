-- Up Migration

-- TASK-1201 — Capability gobernada para la lectura de Finance AI insights.
-- Cierra el matiz de Full API Parity: el reader `readFinanceAiLlmSummary` +
-- el guard `isFinanceAiInsightConsumable` quedan detrás de una capability
-- registrada, consumible por todos los consumers (UI/Nexa/API) con autorización
-- fina. Grant (runtime.ts, mismo PR): route_group=finance + FINANCE_ADMIN +
-- FINANCE_ANALYST + EFEONCE_ADMIN (read-only; superset de la audiencia previa de
-- requireFinanceTenantContext, sin regresión). SOLO gate de lectura; el contrato
-- de honestidad (dataStatus ready/empty/degraded) vive en el reader.
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('finance.ai.read_insights', 'finance', ARRAY['read'], ARRAY['tenant'], 'TASK-1201 — Leer los Finance AI insights/señales (dataStatus + insights enriquecidos). GET /api/finance/intelligence/nexa-insights.', NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- Anti pre-up-marker bug guard: aborta si la capability no quedó seeded.
DO $$
DECLARE seeded_count integer;
BEGIN
  SELECT COUNT(*) INTO seeded_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key = 'finance.ai.read_insights'
    AND deprecated_at IS NULL;

  IF seeded_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1201 anti pre-up-marker check: expected 1 capability seeded, found %. Migration markers may be inverted.', seeded_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'finance.ai.read_insights'
  AND deprecated_at IS NULL;
