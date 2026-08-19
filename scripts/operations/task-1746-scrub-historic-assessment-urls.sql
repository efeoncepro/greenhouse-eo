-- TASK-1746 — saneado de URLs de acceso con bearer vivo en el historial de entregas.
--
-- QUÉ PASÓ. El registro de tipos token-sensitive (que impide persistir la URL con bearer y bloquea
-- el reenvío ciego) entró el 2026-08-19. Los correos de assessment están vivos desde el 2026-08-12.
-- Toda entrega de ese período guardó `delivery_payload.context.assessmentUrl` con el token EN CLARO,
-- y una parte de esos tokens sigue siendo válida: el TTL del enlace es de 14 días.
--
-- POR QUÉ NO ESPERAR A LA RETENCIÓN. El cron de retención redacta a los 90 días. Un bearer vivo
-- sentado 90 días en una tabla que varios roles internos pueden leer no es un problema de
-- retención, es una credencial expuesta. La redacción es inmediata y no destruye evidencia
-- operativa: se quita SÓLO la URL, el resto del payload (tipo, destinatario, timestamps, estado)
-- queda intacto para auditoría.
--
-- ES IDEMPOTENTE: el WHERE exige que la clave exista, así que re-ejecutarlo no toca nada.
--
-- Uso:  pnpm pg:connect:shell < scripts/operations/task-1746-scrub-historic-assessment-urls.sql

-- 1) Alcance ANTES de tocar nada. Si esto devuelve 0, no hay nada que sanear.
SELECT COUNT(*) AS payloads_con_bearer
FROM greenhouse_notifications.email_deliveries
WHERE email_type IN ('hiring_assessment_assigned', 'hiring_assessment_access_recovery')
  AND delivery_payload -> 'context' ? 'assessmentUrl';

-- 2) Redacción. `jsonb_set` sobre el objeto `context` menos la clave: preserva todo lo demás.
UPDATE greenhouse_notifications.email_deliveries
SET delivery_payload = jsonb_set(
      delivery_payload,
      '{context}',
      (delivery_payload -> 'context') - 'assessmentUrl'
    )
WHERE email_type IN ('hiring_assessment_assigned', 'hiring_assessment_access_recovery')
  AND delivery_payload -> 'context' ? 'assessmentUrl';

-- 3) Readback: debe devolver 0. Si no, la redacción no se aplicó y NO se puede dar por cerrado.
SELECT COUNT(*) AS payloads_con_bearer_restantes
FROM greenhouse_notifications.email_deliveries
WHERE email_type IN ('hiring_assessment_assigned', 'hiring_assessment_access_recovery')
  AND delivery_payload -> 'context' ? 'assessmentUrl';

-- 4) Barrido de control: cualquier OTRA clave del payload que contenga un token de acceso.
-- Si aparece algo acá, hay un writer que no pasó por el registro token-sensitive.
SELECT email_type, COUNT(*) AS filas
FROM greenhouse_notifications.email_deliveries
WHERE delivery_payload::text LIKE '%/public/assessment/%'
GROUP BY email_type;
