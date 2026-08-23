-- Up Migration

-- TASK-1757 — El aviso al candidato de que su acceso fue rotado nace APAGADO.
--
-- En `email_type_config` una fila AUSENTE significa habilitado (`resolveEmailTypeConfig` es
-- fail-open, `src/lib/email/delivery.ts`). Shipear sin este seed encendería, en el momento del
-- deploy, un correo candidate-facing sobre un ops-worker de Producción cuyo master
-- `HIRING_LIFECYCLE_EMAILS_ENABLED` ya está en TRUE.
--
-- Privacidad aprobó el canal `secure_link` SIN aviso al candidato (ADR de TASK-1746). Agregar un
-- correo saliente a esa aprobación es un cambio que necesita su propia puerta: se enciende con un
-- UPDATE gobernado tras el sign-off de Talent y Privacidad, sin redeploy y con rollback inmediato.
INSERT INTO greenhouse_notifications.email_type_config (email_type, enabled)
VALUES ('hiring_assessment_access_rotated', FALSE)
ON CONFLICT (email_type) DO NOTHING;

-- Anti pre-up-marker bug guard: abortar si el seed no quedó realmente aplicado. Sin esto, una
-- migración con markers invertidos se registra como aplicada SIN ejecutar el SQL, y la fila
-- ausente encendería el correo en silencio — exactamente lo que este seed existe para impedir.
DO $$
DECLARE seeded_enabled boolean;
BEGIN
  SELECT enabled INTO seeded_enabled
  FROM greenhouse_notifications.email_type_config
  WHERE email_type = 'hiring_assessment_access_rotated';

  IF seeded_enabled IS NULL THEN
    RAISE EXCEPTION 'TASK-1757 anti pre-up-marker check: hiring_assessment_access_rotated row was NOT seeded. Migration markers may be inverted.';
  END IF;

  IF seeded_enabled IS TRUE THEN
    RAISE EXCEPTION 'TASK-1757 guard: hiring_assessment_access_rotated must ship DISABLED. Found enabled=TRUE.';
  END IF;
END
$$;

-- Down Migration

DELETE FROM greenhouse_notifications.email_type_config
WHERE email_type = 'hiring_assessment_access_rotated';
