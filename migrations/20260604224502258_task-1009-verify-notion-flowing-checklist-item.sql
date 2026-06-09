-- Up Migration
--
-- TASK-1009 — Agrega el ítem bloqueante `verify_notion_flowing` al checklist
-- canónico `standard_onboarding_v1` (TASK-992). Garantiza que ningún cliente se
-- declare "onboardeado" hasta que sus tareas REALMENTE fluyan al portal
-- (preflight end-to-end: token → raw → client_id → readiness → template L1 →
-- conformed → portal PG → freshness).
--
-- ADITIVO + idempotente (ON CONFLICT DO NOTHING). Solo afecta a casos onboarding
-- NUEVOS: los casos ya abiertos materializaron sus ítems al crearse y NO reciben
-- este ítem (el trigger de transición chequea las filas del caso, no el template)
-- → cero regresión sobre onboardings en curso.

INSERT INTO greenhouse_core.client_lifecycle_checklist_templates
  (template_code, case_kind, item_code, item_label, item_description, required, default_order, owner_role, blocks_completion, requires_evidence)
VALUES
  ('standard_onboarding_v1', 'onboarding', 'verify_notion_flowing',
   'Verificar que el cliente fluye al portal (preflight Notion)',
   'Corre el preflight end-to-end (POST .../cases/[caseId]/notion-preflight). El ítem se auto-completa solo si todos los checks críticos están verdes.',
   TRUE, 11, 'operations', TRUE, FALSE)
ON CONFLICT (template_code, item_code) DO NOTHING;

-- Anti pre-up-marker guard: aborta si el seed no quedó realmente aplicado.
DO $$
DECLARE seeded INTEGER;
BEGIN
  SELECT COUNT(*) INTO seeded
  FROM greenhouse_core.client_lifecycle_checklist_templates
  WHERE template_code = 'standard_onboarding_v1'
    AND item_code = 'verify_notion_flowing'
    AND effective_to IS NULL;

  IF seeded < 1 THEN
    RAISE EXCEPTION 'TASK-1009 anti pre-up-marker: verify_notion_flowing NO quedó en standard_onboarding_v1 (markers invertidos?)';
  END IF;
END
$$;

-- Down Migration

DELETE FROM greenhouse_core.client_lifecycle_checklist_templates
WHERE template_code = 'standard_onboarding_v1'
  AND item_code = 'verify_notion_flowing';