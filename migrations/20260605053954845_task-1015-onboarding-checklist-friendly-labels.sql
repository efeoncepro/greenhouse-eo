-- Up Migration

-- TASK-1015 — UX-writing de las etiquetas del checklist de onboarding.
-- Las labels de standard_onboarding_v1 se sembraron "verbatim" desde la spec
-- (§5.5) y eran técnicas / no amigables para el operador (jerga tipo
-- `engagement_kind`, `client_team_assignments con FTE`). Esta migración reescribe
-- SOLO el `item_label` (display) — los `item_code` (identificadores estables) NO
-- cambian. Actualiza la plantilla (casos futuros) Y los items ya materializados
-- (casos abiertos, p.ej. Grupo Berel) para que ambas superficies (cockpit +
-- timeline) muestren copy es-CL amigable.

-- 1. Plantilla (single source of truth para casos futuros).
UPDATE greenhouse_core.client_lifecycle_checklist_templates AS t
SET item_label = v.label
FROM (VALUES
  ('verify_hubspot_company_synced', 'Confirmar la empresa sincronizada desde HubSpot'),
  ('confirm_legal_documents',       'Confirmar la firma del contrato (MSA)'),
  ('declare_engagement_kind',       'Definir el tipo de servicio (contratado, piloto, trial, POC o discovery)'),
  ('declare_commercial_terms',      'Definir los términos comerciales del servicio'),
  ('declare_engagement_phases',     'Definir las fases del servicio (kickoff, operación, reporte y decisión)'),
  ('assign_team_members',           'Asignar el equipo y su dedicación al cliente'),
  ('provision_notion_workspace',    'Provisionar el espacio de Notion del cliente'),
  ('provision_communication_channels', 'Configurar el canal de Teams y las notificaciones por email'),
  ('provision_client_users_access', 'Invitar a las personas del cliente al portal (si aplica)'),
  ('confirm_billing_setup',         'Confirmar la facturación del cliente (Nubox y condiciones de pago)')
) AS v(item_code, label)
WHERE t.template_code = 'standard_onboarding_v1'
  AND t.item_code = v.item_code;

-- 2. Items ya materializados (casos abiertos): reescribir su label solo si sigue
--    siendo la label técnica original (no pisar una edición manual del operador).
UPDATE greenhouse_core.client_lifecycle_checklist_items AS i
SET item_label = v.new_label
FROM (VALUES
  ('verify_hubspot_company_synced', 'Verificar company HubSpot sincronizada en Greenhouse', 'Confirmar la empresa sincronizada desde HubSpot'),
  ('confirm_legal_documents',       'Confirmar firma de contrato/MSA', 'Confirmar la firma del contrato (MSA)'),
  ('declare_engagement_kind',       'Declarar engagement_kind del servicio (regular/pilot/trial/poc/discovery)', 'Definir el tipo de servicio (contratado, piloto, trial, POC o discovery)'),
  ('declare_commercial_terms',      'Declarar engagement_commercial_terms activos', 'Definir los términos comerciales del servicio'),
  ('declare_engagement_phases',     'Declarar fases del engagement (kickoff/operation/reporting/decision)', 'Definir las fases del servicio (kickoff, operación, reporte y decisión)'),
  ('assign_team_members',           'Asignar miembros vía client_team_assignments con FTE', 'Asignar el equipo y su dedicación al cliente'),
  ('provision_notion_workspace',    'Provisionar workspace Notion para el cliente', 'Provisionar el espacio de Notion del cliente'),
  ('provision_communication_channels', 'Configurar Teams channel + email subscriptions', 'Configurar el canal de Teams y las notificaciones por email'),
  ('provision_client_users_access', 'Provisionar acceso al portal cliente (si aplica)', 'Invitar a las personas del cliente al portal (si aplica)'),
  ('confirm_billing_setup',         'Confirmar setup de facturación (Nubox + payment terms)', 'Confirmar la facturación del cliente (Nubox y condiciones de pago)')
) AS v(item_code, old_label, new_label)
WHERE i.template_code = 'standard_onboarding_v1'
  AND i.item_code = v.item_code
  AND i.item_label = v.old_label;

-- 3. Verificación: la plantilla quedó con las labels nuevas.
DO $$
DECLARE updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM greenhouse_core.client_lifecycle_checklist_templates
  WHERE template_code = 'standard_onboarding_v1'
    AND item_label LIKE 'Definir el tipo de servicio%';

  IF updated_count < 1 THEN
    RAISE EXCEPTION 'TASK-1015: friendly labels not applied to standard_onboarding_v1 template.';
  END IF;
END
$$;

-- Down Migration

-- Restaurar las labels técnicas originales (plantilla + items).
UPDATE greenhouse_core.client_lifecycle_checklist_templates AS t
SET item_label = v.label
FROM (VALUES
  ('verify_hubspot_company_synced', 'Verificar company HubSpot sincronizada en Greenhouse'),
  ('confirm_legal_documents',       'Confirmar firma de contrato/MSA'),
  ('declare_engagement_kind',       'Declarar engagement_kind del servicio (regular/pilot/trial/poc/discovery)'),
  ('declare_commercial_terms',      'Declarar engagement_commercial_terms activos'),
  ('declare_engagement_phases',     'Declarar fases del engagement (kickoff/operation/reporting/decision)'),
  ('assign_team_members',           'Asignar miembros vía client_team_assignments con FTE'),
  ('provision_notion_workspace',    'Provisionar workspace Notion para el cliente'),
  ('provision_communication_channels', 'Configurar Teams channel + email subscriptions'),
  ('provision_client_users_access', 'Provisionar acceso al portal cliente (si aplica)'),
  ('confirm_billing_setup',         'Confirmar setup de facturación (Nubox + payment terms)')
) AS v(item_code, label)
WHERE t.template_code = 'standard_onboarding_v1'
  AND t.item_code = v.item_code;

UPDATE greenhouse_core.client_lifecycle_checklist_items AS i
SET item_label = v.old_label
FROM (VALUES
  ('verify_hubspot_company_synced', 'Verificar company HubSpot sincronizada en Greenhouse', 'Confirmar la empresa sincronizada desde HubSpot'),
  ('confirm_legal_documents',       'Confirmar firma de contrato/MSA', 'Confirmar la firma del contrato (MSA)'),
  ('declare_engagement_kind',       'Declarar engagement_kind del servicio (regular/pilot/trial/poc/discovery)', 'Definir el tipo de servicio (contratado, piloto, trial, POC o discovery)'),
  ('declare_commercial_terms',      'Declarar engagement_commercial_terms activos', 'Definir los términos comerciales del servicio'),
  ('declare_engagement_phases',     'Declarar fases del engagement (kickoff/operation/reporting/decision)', 'Definir las fases del servicio (kickoff, operación, reporte y decisión)'),
  ('assign_team_members',           'Asignar miembros vía client_team_assignments con FTE', 'Asignar el equipo y su dedicación al cliente'),
  ('provision_notion_workspace',    'Provisionar workspace Notion para el cliente', 'Provisionar el espacio de Notion del cliente'),
  ('provision_communication_channels', 'Configurar Teams channel + email subscriptions', 'Configurar el canal de Teams y las notificaciones por email'),
  ('provision_client_users_access', 'Provisionar acceso al portal cliente (si aplica)', 'Invitar a las personas del cliente al portal (si aplica)'),
  ('confirm_billing_setup',         'Confirmar setup de facturación (Nubox + payment terms)', 'Confirmar la facturación del cliente (Nubox y condiciones de pago)')
) AS v(item_code, old_label, new_label)
WHERE i.template_code = 'standard_onboarding_v1'
  AND i.item_code = v.item_code
  AND i.item_label = v.new_label;
