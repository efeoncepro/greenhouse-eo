-- Up Migration

-- TASK-1830 — Kill-switch explícito del correo `auth_server_magic_link` (Efeonce ID).
--
-- En `email_type_config` una fila AUSENTE significa habilitado (`checkEmailTypeEnabled` es
-- fail-open). Aquí la fila se siembra **enabled = TRUE**, a diferencia de `TASK-1762`, y la
-- diferencia es deliberada:
--
--   * En TASK-1762 el master del dominio ya estaba en TRUE en producción, así que la fila era el
--     ÚNICO gate y tenía que nacer apagada.
--   * Acá el gate real es `AUTH_SERVER_PERSON_AUTH_ENABLED=false`: con el flag apagado nadie puede
--     siquiera pedir un magic link, así que el correo no puede dispararse solo.
--
-- Sembrarla apagada crearía el modo de falla contrario y peor: se prende el flag en staging, la
-- persona pide su enlace, la respuesta dice "te enviamos un correo" (respuesta idéntica por
-- anti-enumeración, así que NO puede reportar el fallo) y el correo nunca sale. El acceso queda
-- muerto en silencio. Es exactamente el patrón de `GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED`.
--
-- La fila existe para poder APAGAR el correo en un incidente con un UPDATE de una línea, sin
-- redeploy: un kill-switch operable es mejor que una fila ausente cuya semántica hay que recordar.
INSERT INTO greenhouse_notifications.email_type_config (email_type, enabled, paused_reason)
VALUES (
  'auth_server_magic_link',
  TRUE,
  NULL
)
ON CONFLICT (email_type) DO NOTHING;

-- Anti pre-up-marker bug guard (ISSUE-068).
DO $$
DECLARE seeded_enabled boolean;
BEGIN
  SELECT enabled INTO seeded_enabled
  FROM greenhouse_notifications.email_type_config
  WHERE email_type = 'auth_server_magic_link';

  IF seeded_enabled IS NULL THEN
    RAISE EXCEPTION 'TASK-1830 anti pre-up-marker check: la fila de email_type_config para auth_server_magic_link NO quedó creada. Markers posiblemente invertidos.';
  END IF;
END
$$;

-- Down Migration

-- El Down NO borra la fila: con semántica fail-open, borrarla dejaría el tipo habilitado igual y
-- perdería el kill-switch operable. Lo apaga, que es el reposo seguro para un rollback.
UPDATE greenhouse_notifications.email_type_config
   SET enabled = FALSE,
       paused_reason = 'TASK-1830 rollback: superficie de personas retirada; el correo queda apagado.'
 WHERE email_type = 'auth_server_magic_link';
