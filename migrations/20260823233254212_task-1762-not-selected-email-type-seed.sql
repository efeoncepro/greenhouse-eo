-- Up Migration

-- TASK-1762 Slice 4 — el correo de «sin selección» nace APAGADO.
--
-- En `email_type_config` una fila AUSENTE significa habilitado: `checkEmailTypeEnabled` es
-- fail-open (`src/lib/email/delivery.ts:135` — `if (!rows[0]) return { enabled: true }`, y el catch
-- de :143 hace lo mismo). Shipear el tipo nuevo sin este seed lo encenderia EN EL
-- MOMENTO DEL DEPLOY, sobre un ops-worker de Produccion cuyo master `HIRING_LIFECYCLE_EMAILS_ENABLED`
-- ya esta en TRUE.
--
-- Y el riesgo aca no es un correo de mas: un cierre por capacidad manda N correos DE GOLPE. Las dos
-- vacantes vivas tienen 36 y 14 personas en proceso. Un encendido accidental no se descubre con un
-- caso raro: se descubre con decenas de personas reales ya notificadas, y un correo emitido no se
-- retira.
--
-- Se enciende con un UPDATE gobernado tras el sign-off de Talent y Privacidad sobre el copy, sin
-- redeploy y con rollback inmediato.
INSERT INTO greenhouse_notifications.email_type_config (email_type, enabled, paused_reason)
VALUES (
  'hiring_decision_not_selected',
  FALSE,
  'TASK-1762: pendiente sign-off de Talent y Privacidad sobre el copy y el gate de consentimiento del Banco de Talento.'
)
ON CONFLICT (email_type) DO NOTHING;

-- Anti pre-up-marker bug guard: abortar si el seed no quedo realmente aplicado. Sin esto, una
-- migracion con markers invertidos se registra como aplicada SIN ejecutar el SQL, y la fila ausente
-- encenderia el correo en silencio — exactamente lo que este seed existe para impedir.
DO $$
DECLARE seeded_enabled boolean;
BEGIN
  SELECT enabled INTO seeded_enabled
  FROM greenhouse_notifications.email_type_config
  WHERE email_type = 'hiring_decision_not_selected';

  IF seeded_enabled IS NULL THEN
    RAISE EXCEPTION 'TASK-1762 anti pre-up-marker check: la fila de email_type_config para hiring_decision_not_selected NO quedo creada. Markers posiblemente invertidos.';
  END IF;

  IF seeded_enabled IS TRUE THEN
    RAISE EXCEPTION 'TASK-1762: hiring_decision_not_selected quedo ENABLED y debe nacer apagado.';
  END IF;
END
$$;

-- Down Migration

-- 🔴 El Down NO borra la fila, y esa es la decision entera de esta seccion.
--
-- Con semantica fail-open, «no hay fila» significa HABILITADO. Un `DELETE` aca no desharia la
-- migracion: ENCENDERIA el correo de «sin seleccion» sobre un ops-worker de produccion cuyo master
-- ya esta en TRUE, para las dos vacantes vivas de 36 y 14 personas. Es la inversion exacta del
-- proposito del Up, y ocurriria en el peor momento posible: uno hace rollback justo cuando algo ya
-- va mal y nadie esta mirando el correo.
--
-- Desandar un kill-switch no es desandar un cambio: es apagar una proteccion. El Down restaura el
-- estado apagado, que es el unico reposo seguro para algo que debe nacer sin sonar.
--
-- (El seed de `TASK-1757` — `20260820045834971` — tiene este mismo `DELETE` y por lo tanto el mismo
--  riesgo para `hiring_assessment_access_rotated`. Esta ya aplicada y commiteada, asi que su
--  correccion es un forward fix propio, no una edicion desde aca.)
UPDATE greenhouse_notifications.email_type_config
   SET enabled = FALSE,
       paused_reason = 'TASK-1762 rollback: el tipo queda apagado; fila ausente significaria habilitado.'
 WHERE email_type = 'hiring_decision_not_selected';
