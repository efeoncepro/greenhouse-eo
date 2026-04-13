# ISSUE-046 — Deliverability monitor siempre devuelve 0 bounces y 0 complaints

## Ambiente

production + staging

## Detectado

2026-04-13, audit E2E del sistema de email post-TASK-382

## Síntoma

El cron `/api/cron/email-deliverability-monitor` responde con `hardBounces: 0, complaints: 0` en todos los casos. Nunca dispara un outbox event de alerta, aunque haya emails rebotados o marcados como spam.

## Causa raíz

La query del cron filtra por `source_entity` en la tabla `email_deliveries`:

```sql
COUNT(*) FILTER (
  WHERE source_entity = 'email_delivery.undeliverable_marked'
    AND created_at > NOW() - INTERVAL '7 days'
)::text AS hard_bounces
```

Pero `source_entity` en `email_deliveries` guarda el **origen del envío** (ej. `'leave_request.created'`, `'payroll.export_requested'`), no el tipo de evento de bounce. Los valores `'email_delivery.undeliverable_marked'` y `'email_delivery.complained'` son event types del outbox — no valores que se persistan en `email_deliveries.source_entity`.

El resultado es que `hard_bounces` y `complaints` siempre son 0, independientemente del volumen real de rebotes.

## Impacto

- El cron de monitoreo nunca alerta — la reputación del dominio puede degradarse sin que nadie lo detecte
- El sistema de alertas de deliverability es efectivamente un no-op
- Resend puede suspender la cuenta si el bounce rate supera 2% sin que el sistema lo notifique

## Solución propuesta

La query debe contar emails cuyo `recipient_email` aparece en `client_users` con `email_undeliverable = TRUE` (hard bounces) o buscar en los outbox events publicados por el webhook. La opción más simple y correcta es agregar las columnas `bounced_at` y `complained_at` a `email_deliveries`, y que el webhook de Resend las actualice al recibir `email.bounced` y `email.complained`.

Query corregida (post-migración):

```sql
SELECT
  COUNT(*) FILTER (WHERE status IN ('sent', 'delivered'))::text AS total_sent,
  COUNT(*) FILTER (WHERE bounced_at IS NOT NULL AND bounced_at > NOW() - INTERVAL '7 days')::text AS hard_bounces,
  COUNT(*) FILTER (WHERE complained_at IS NOT NULL AND complained_at > NOW() - INTERVAL '7 days')::text AS complaints
FROM greenhouse_notifications.email_deliveries
WHERE created_at > NOW() - INTERVAL '7 days'
```

Alternativa sin migración: consultar la tabla de outbox events por `event_type = 'email_delivery.undeliverable_marked'` en la ventana de 7 días.

## Archivos afectados

- `src/app/api/cron/email-deliverability-monitor/route.ts` — query incorrecta
- `src/app/api/webhooks/resend/route.ts` — necesita actualizar `bounced_at`/`complained_at` si se agrega la columna

## Estado

open

## Relacionado

- TASK-382 — creó el cron pero con la query incorrecta
- TASK-383 — incluye la corrección de este bug en su scope
