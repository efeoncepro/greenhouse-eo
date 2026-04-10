# ISSUE-035 — Emails de permisos sin deduplicacion por source_event_id

## Ambiente

production + staging

## Detectado

2026-04-09, auditoria de codigo del flujo de emails de permisos

## Sintoma

Si el reactive log (`outbox_reactive_log`) se limpia, se corrompe, o un evento se reprocesa por recovery, los emails de leave request se re-enviarian sin ninguna proteccion de deduplicacion a nivel email.

## Causa raiz

A diferencia de `payroll_period.calculated` que implementa `wasNotificationAlreadySent()` con lookup en `notification_log` antes de despachar, los handlers de leave request (`leave_request.created`, `.escalated_to_hr`, `.approved`, `.rejected`, `.cancelled`) no verifican si ya se envio un email para el mismo `sourceEventId`.

La unica proteccion es el reactive log (`outbox_reactive_log`) que opera a nivel de evento+handler. Si esta capa falla (recovery, limpieza de retention, o bug), los emails se re-enviarian.

El campo `source_event_id` ya se persiste en `email_deliveries` pero no se consulta antes de enviar.

## Impacto

- **Bajo en condiciones normales:** el reactive log es la capa primaria de deduplicacion y funciona correctamente
- **Riesgo en recovery:** si se ejecuta el endpoint `/reactive/recover` y un evento de leave ya procesado queda como orphan, se re-enviaria
- **Diferencia de profundidad defensiva:** payroll tiene doble proteccion (reactive log + notification log), leave solo tiene una capa

## Solucion

Agregar un check de deduplicacion en los handlers de leave email: antes de llamar `sendEmail()`, verificar en `email_deliveries` si ya existe un registro `sent` para el mismo `source_event_id` + `source_entity`.

## Verificacion

1. Verificar que enviar un email de leave request registra `source_event_id` en `email_deliveries`
2. Simular un reprocesamiento del mismo evento y verificar que el email no se re-envia
3. Verificar que nuevos eventos legitimos siguen enviando emails normalmente

## Estado

resolved — 2026-04-09

## Relacionado

- `src/lib/sync/projections/notifications.ts` — handlers de leave request sin dedup
- `src/lib/email/delivery.ts` — campo `source_event_id` ya disponible pero no consultado
- `src/lib/sync/reactive-consumer.ts` — capa primaria de deduplicacion (reactive log)
- ISSUE-033, ISSUE-034 — descubiertos en la misma auditoria
