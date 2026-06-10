-- Up Migration

-- TASK-1072b — Reconciliación catalog⇆registry (capabilities_registry).
--
-- CAUSA RAÍZ (no parche): el catálogo TS (src/config/entitlements-catalog.ts) es la
-- SSOT runtime; greenhouse_core.capabilities_registry es la reflexión declarativa
-- que parity.live.test.ts (TASK-611) exige en sync. Tasks posteriores al seed
-- original de TASK-611 agregaron capabilities al catálogo TS PERO no escribieron su
-- seed de registry — drift acumulado de 14 capabilities (TASK-490 documents.signature_request,
-- TASK-790/792 hr.contractor_*, TASK-793/968 finance.contractor_payable*, TASK-992/1001
-- client.lifecycle.*). La live parity quedaba roja en el lane PG.
--
-- FIX ROBUSTO Y ESCALABLE (mismo patrón que TASK-611 seed-existing): seed idempotente
-- derivado del catálogo (module + allowed_actions + allowed_scopes exactos). ON CONFLICT
-- DO UPDATE re-sincroniza esos campos → self-healing si un futuro drift de module/actions
-- emerge. La live parity test (ya cableada) previene la regresión de aquí en adelante:
-- toda capability nueva en el catálogo TS DEBE acompañarse de su seed (o esta test rompe CI).
--
-- NOTA: el GRANT runtime de cada capability ya vive en runtime.ts (sus tasks dueñas lo
-- pusieron; capability-grant-coverage.test verde). Esta migración solo cierra el plano
-- de governance reflection (registry), NO toca grants.

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, deprecated_at)
VALUES
  ('client.lifecycle.case.advance','commercial',ARRAY['update'],ARRAY['tenant'],'Avanzar un caso del ciclo de vida de cliente (checklist). TASK-992.',NULL),
  ('client.lifecycle.case.open','commercial',ARRAY['create'],ARRAY['tenant'],'Abrir un caso del ciclo de vida de cliente (onboarding). TASK-992.',NULL),
  ('client.lifecycle.case.override_blocker','commercial',ARRAY['override'],ARRAY['tenant'],'Override de bloqueante al cerrar un caso de ciclo de vida (EFEONCE_ADMIN). TASK-992.',NULL),
  ('client.lifecycle.case.read','commercial',ARRAY['read'],ARRAY['tenant'],'Leer casos del ciclo de vida de cliente. TASK-992.',NULL),
  ('client.lifecycle.case.resolve','commercial',ARRAY['approve'],ARRAY['tenant'],'Resolver/completar un caso del ciclo de vida de cliente. TASK-992.',NULL),
  ('client.lifecycle.portal_user.invite','commercial',ARRAY['create'],ARRAY['tenant'],'Invitar usuarios de portal cliente como parte del onboarding. TASK-1001.',NULL),
  ('documents.signature_request','documents',ARRAY['read','create','update','manage'],ARRAY['tenant'],'Orquestación de firma provider-neutral (enviar/cancelar/reconciliar). TASK-490.',NULL),
  ('finance.contractor_payable','finance',ARRAY['read','create','manage'],ARRAY['tenant'],'Contractor payables (cuentas por pagar a contractors). TASK-793.',NULL),
  ('finance.contractor_payable.override_agreed_amount','finance',ARRAY['update'],ARRAY['tenant'],'Override del guardrail de monto acordado de un payable (admin, SoD). TASK-968.',NULL),
  ('finance.contractor_payable.waive_payment_profile','finance',ARRAY['update'],ARRAY['tenant'],'Waiver del gate de payment profile de un payable (admin). TASK-793.',NULL),
  ('hr.contractor_classification','hr',ARRAY['read','approve'],ARRAY['tenant'],'Revisión del riesgo de reclasificación laboral de un engagement contractor. TASK-790.',NULL),
  ('hr.contractor_engagement','hr',ARRAY['read','create','update','manage'],ARRAY['tenant'],'Contractor engagements (contrato operativo contractor/honorarios). TASK-790.',NULL),
  ('hr.contractor_work_submission','hr',ARRAY['read','create','update','manage'],ARRAY['tenant'],'Work submissions de contractor (evidencia de trabajo). TASK-792.',NULL),
  ('hr.contractor_work_submission.review','hr',ARRAY['read','approve'],ARRAY['tenant'],'Revisión (approve/dispute/reject) de work submissions de contractor. TASK-792.',NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL,
  introduced_at = COALESCE(greenhouse_core.capabilities_registry.introduced_at, NOW());

-- Anti pre-up-marker guard (CLAUDE.md migration markers rule).
DO $$
DECLARE seeded integer;
BEGIN
  SELECT COUNT(*) INTO seeded
    FROM greenhouse_core.capabilities_registry
   WHERE deprecated_at IS NULL
     AND capability_key IN (
       'client.lifecycle.case.advance','client.lifecycle.case.open','client.lifecycle.case.override_blocker',
       'client.lifecycle.case.read','client.lifecycle.case.resolve','client.lifecycle.portal_user.invite',
       'documents.signature_request','finance.contractor_payable','finance.contractor_payable.override_agreed_amount',
       'finance.contractor_payable.waive_payment_profile','hr.contractor_classification','hr.contractor_engagement',
       'hr.contractor_work_submission','hr.contractor_work_submission.review'
     );

  IF seeded < 14 THEN
    RAISE EXCEPTION 'TASK-1072b anti pre-up-marker: expected 14 reconciled capabilities, got %. Markers may be inverted.', seeded;
  END IF;
END
$$;

-- Down Migration

-- Append-only governance: deprecate (no delete) so audit history survives. These
-- capabilities remain owned by their tasks; reverting only this reconciliation marks
-- them deprecated in the registry (the catalog TS + runtime grants are untouched).
UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key IN (
  'client.lifecycle.case.advance','client.lifecycle.case.open','client.lifecycle.case.override_blocker',
  'client.lifecycle.case.read','client.lifecycle.case.resolve','client.lifecycle.portal_user.invite',
  'documents.signature_request','finance.contractor_payable','finance.contractor_payable.override_agreed_amount',
  'finance.contractor_payable.waive_payment_profile','hr.contractor_classification','hr.contractor_engagement',
  'hr.contractor_work_submission','hr.contractor_work_submission.review'
);
