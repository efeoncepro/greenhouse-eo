-- Up Migration

-- TASK-1689 — Seed del kill-switch por tipo para los emails transaccionales del ciclo de
-- Hiring. Filas ausentes ya significan enabled=true; se seedean explícitas para que el
-- operador pueda pausarlas en caliente (especialmente hiring_decision_rejected) y para que
-- el inventario del kill-switch refleje los tipos existentes. Idempotente.
INSERT INTO greenhouse_notifications.email_type_config (email_type, enabled)
VALUES
  ('hiring_application_received_internal', TRUE),
  ('hiring_application_confirmation', TRUE),
  ('hiring_assessment_assigned', TRUE),
  ('hiring_stage_advanced', TRUE),
  ('hiring_decision_selected', TRUE),
  ('hiring_decision_rejected', TRUE)
ON CONFLICT (email_type) DO NOTHING;

-- Anti pre-up-marker bug guard: abortar si el seed no quedó realmente aplicado.
DO $$
DECLARE seeded_count integer;
BEGIN
  SELECT COUNT(*) INTO seeded_count
  FROM greenhouse_notifications.email_type_config
  WHERE email_type IN (
    'hiring_application_received_internal',
    'hiring_application_confirmation',
    'hiring_assessment_assigned',
    'hiring_stage_advanced',
    'hiring_decision_selected',
    'hiring_decision_rejected'
  );

  IF seeded_count <> 6 THEN
    RAISE EXCEPTION 'TASK-1689 anti pre-up-marker check: expected 6 hiring email_type_config rows, found %. Migration markers may be inverted.', seeded_count;
  END IF;
END
$$;

-- Down Migration

DELETE FROM greenhouse_notifications.email_type_config
WHERE email_type IN (
  'hiring_application_received_internal',
  'hiring_application_confirmation',
  'hiring_assessment_assigned',
  'hiring_stage_advanced',
  'hiring_decision_selected',
  'hiring_decision_rejected'
);
