# TASK-383 — Email Observabilidad

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `none`
- Branch: `task/TASK-383-email-observabilidad`
- Legacy ID: none
- GitHub Issue: none

## Summary

El sistema de emails es operacionalmente ciego: un bounce rate alto, un dead letter acumulado o una oleada de complaints puede degradar la reputación del dominio de envío sin que nadie se entere. Esta task agrega tres capas de visibilidad: Sentry capture para errores de entrega, monitoreo automático de bounce/complaint rates con alerta, y alerta inmediata cuando un email entra en dead letter.

## Why This Task Exists

TASK-382 implementó el pipeline de entrega con dead letter, prioridad y retry. Pero si algo falla en producción, no hay ningún canal de alerta. Los errores llegan a la DB y ahí mueren. Resend puede suspender el dominio si el bounce rate supera 2% o el complaint rate supera 0.1% — sin monitoreo, eso ocurriría sin previo aviso.

Además, los errores de JavaScript en `deliverRecipient()` y `deliverBroadcastBatch()` no se capturan en ningún sistema de observabilidad. El único rastro es una fila con `status='failed'` en la DB.

## Goal

- Capturar excepciones del pipeline de email en Sentry con contexto suficiente (emailType, domain, priority, deliveryId, recipientEmail)
- Ejecutar un cron diario que calcule bounce rate y complaint rate de los últimos 7 días y cree un outbox event de alerta si se superan los umbrales (2% / 0.1%)
- Alertar inmediatamente cuando cualquier email transiciona a `dead_letter`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — outbox event pattern canónico
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` — webhook de Resend ya procesa bounced/complained

Reglas obligatorias:

- Alertas van por outbox event (no por llamada directa a email) para respetar el patrón de desacople
- No crear un segundo cliente Sentry — usar `@sentry/nextjs` que ya está instalado
- Los umbrales (2% / 0.1%) deben ser configurables — leerlos desde `email_type_config` o desde env vars, no hardcodeados

## Normative Docs

- `src/lib/email/delivery.ts` — pipeline principal, donde van los Sentry.captureException
- `src/app/api/webhooks/resend/route.ts` — donde ocurren las transiciones bounced/complained/dead_letter
- `src/app/api/cron/email-delivery-retry/route.ts` — patrón de cron existente para replicar estructura
- `migrations/20260413162238855_email-delivery-enterprise-v2.sql` — columnas status, priority, error_class

## Dependencies & Impact

### Depends on

- `TASK-382` (complete) — dead letter, priority, error_class, columna `data_redacted_at` ya existen en DB
- `greenhouse_notifications.email_deliveries` — fuente de datos para el cron de monitoreo
- `@sentry/nextjs` — debe estar instalado (verificar en `package.json`)

### Blocks / Impacts

- TASK-384 — el endpoint de GDPR puede beneficiarse del mismo patrón de outbox event para confirmar borrado
- Cualquier agente que opere el sistema de email en producción depende de esta visibilidad

### Files owned

- `src/lib/email/delivery.ts` — agregar Sentry.captureException en catch blocks
- `src/app/api/webhooks/resend/route.ts` — alerta en transición a dead_letter
- `src/app/api/cron/email-monitoring/route.ts` — nuevo cron de monitoreo
- `vercel.json` — registrar nuevo cron

## Current Repo State

### Already exists

- `@sentry/nextjs` instalado (verificar versión en `package.json`)
- `src/app/api/webhooks/resend/route.ts` — maneja `email.bounced`, `email.complained`, `email.delivered`
- `src/app/api/cron/email-delivery-retry/route.ts` — patrón de cron con `maxDuration=60`
- `greenhouse_notifications.email_deliveries` — columnas `status`, `error_class`, `priority` disponibles
- Patrón de outbox event en `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

### Gap

- No hay `Sentry.captureException()` en ningún path de entrega de email
- No existe cron de monitoreo de bounce/complaint rate
- La transición a `dead_letter` no dispara ninguna alerta
- Los umbrales de alerta no están definidos en ninguna configuración

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Sentry capture en pipeline de entrega

- En `deliverRecipient()`: capturar excepciones en el catch de Resend API con tags `{ emailType, domain, priority, deliveryId }`
- En `deliverBroadcastBatch()`: capturar fallo del batch con `extra: { recipientCount, batchId }`
- En `processFailedEmailDeliveries()`: capturar cuando un retry falla y el email transiciona a dead_letter
- No capturar errores esperados (rate_limited, unsubscribed) — solo excepciones reales

### Slice 2 — Alerta inmediata en dead letter

- En `src/app/api/webhooks/resend/route.ts`, cuando el handler detecta que un email llega a `dead_letter` (max attempts + permanent failure): insertar outbox event `email.dead_letter_alert` con `{ deliveryId, emailType, recipientEmail, attemptNumber }`
- El consumer existente del outbox debe poder rutear este evento a un email de ops (o a Slack si hay webhook configurado)

### Slice 3 — Cron de monitoreo de deliverability

- Crear `src/app/api/cron/email-monitoring/route.ts` con `maxDuration=60`
- Query: calcular bounce rate y complaint rate de los últimos 7 días
- Si `bounceRate > 0.02` (2%) o `complaintRate > 0.001` (0.1%): insertar outbox event `email.deliverability_alert` con las métricas
- Registrar en `vercel.json` como cron diario (ej. `"0 9 * * *"` — 9am Santiago)
- Incluir en la respuesta del endpoint las métricas calculadas para debugging manual

## Out of Scope

- Integración directa con Slack — el outbox event es el punto de salida; el consumer decide el canal
- Dashboard de métricas de email en el portal UI
- Retención de datos GDPR (TASK-384)
- Scaling a Cloud Run (TASK-385)
- Modificar umbrales desde el portal — configuración via env var es suficiente

## Detailed Spec

### Sentry capture pattern

```typescript
import * as Sentry from '@sentry/nextjs'

// En el catch de deliverRecipient():
Sentry.withScope(scope => {
  scope.setTags({ emailType, domain, priority: input.priority ?? 'broadcast' })
  scope.setExtras({ deliveryId, recipientEmail: recipient.email, attemptNumber })
  Sentry.captureException(error)
})
```

### Query del cron de monitoreo

```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'bounced') AS bounced,
  COUNT(*) FILTER (WHERE status = 'complained') AS complained,
  COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'bounced', 'complained')) AS total_sent,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'bounced') * 100.0 /
    NULLIF(COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'bounced', 'complained')), 0),
    2
  ) AS bounce_rate_pct,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'complained') * 100.0 /
    NULLIF(COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'bounced', 'complained')), 0),
    4
  ) AS complaint_rate_pct
FROM greenhouse_notifications.email_deliveries
WHERE created_at > NOW() - INTERVAL '7 days'
```

### Umbrales configurables

```typescript
const BOUNCE_RATE_THRESHOLD = parseFloat(process.env.EMAIL_BOUNCE_RATE_THRESHOLD ?? '0.02')
const COMPLAINT_RATE_THRESHOLD = parseFloat(process.env.EMAIL_COMPLAINT_RATE_THRESHOLD ?? '0.001')
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un error real en `deliverRecipient()` aparece en Sentry con tags `emailType`, `domain`, `priority`
- [ ] El cron `/api/cron/email-monitoring` responde 200 con `{ bounceRate, complaintRate, alertSent }` cuando se llama manualmente
- [ ] Si se inserta manualmente una fila con `status='bounced'` en la DB y el porcentaje supera el umbral, el cron crea un outbox event `email.deliverability_alert`
- [ ] Cuando un email transiciona a `dead_letter` via el webhook de Resend, existe un outbox event `email.dead_letter_alert` en la DB
- [ ] `pnpm lint` y `pnpm tsc --noEmit` pasan sin errores
- [ ] `pnpm test` pasa (incluye tests del pipeline de delivery)

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- Llamada manual a `GET /api/cron/email-monitoring` en staging y verificar respuesta
- Insertar fila de prueba con `status='bounced'` y verificar outbox event generado

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado
- [ ] `changelog.md` quedo actualizado
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] Las variables de entorno `EMAIL_BOUNCE_RATE_THRESHOLD` y `EMAIL_COMPLAINT_RATE_THRESHOLD` están documentadas en `AGENTS.md` o en el env template del proyecto
- [ ] El nuevo cron está registrado en `vercel.json` y verificado en Vercel dashboard

## Follow-ups

- TASK-384 — Email Compliance & Retención GDPR
- Evaluar si los outbox events de alerta deben rutear a Slack además de email de ops

## Open Questions

- ¿El outbox event de alerta debe generar un email a una dirección fija de ops, o basta con que quede en el outbox para que el agente de turno lo procese? Definir antes de ejecutar Slice 2.
- ¿`@sentry/nextjs` ya tiene DSN configurado en Vercel? Verificar en Discovery.
