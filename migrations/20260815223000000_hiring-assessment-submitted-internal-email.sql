-- Up Migration

-- Aviso interno a People cuando un candidate_test emite hiring.assessment.submitted.
-- Una fila ausente ya significa enabled=true, pero el seed explícito hace visible y
-- operable el kill-switch por tipo. No modifica la configuración de los otros correos.
INSERT INTO greenhouse_notifications.email_type_config (email_type, enabled)
VALUES ('hiring_assessment_submitted_internal', TRUE)
ON CONFLICT (email_type) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM greenhouse_notifications.email_type_config
    WHERE email_type = 'hiring_assessment_submitted_internal'
  ) THEN
    RAISE EXCEPTION 'Expected hiring_assessment_submitted_internal email_type_config row';
  END IF;
END
$$;

-- Down Migration

DELETE FROM greenhouse_notifications.email_type_config
WHERE email_type = 'hiring_assessment_submitted_internal';
