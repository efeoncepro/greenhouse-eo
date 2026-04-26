# TASK-619.3 — Quote Signature Notifications (email + in-app + Slack reactors)

## Delta 2026-04-26 — alineación con Notification Hub (TASK-690)

El approach original de "3 reactores independientes (email, in-app, Slack) consumiendo el outbox" está **redirigido**, no deprecado. La razón: TASK-690/691/692 introduce el Notification Hub canónico — una sola projection que consume el outbox + dispatcha a N adapters per-canal con preferencias por persona y mentions con push real.

**Scope ajustado:**

- En vez de 3 reactores nuevos, esta task aporta al Hub:
  - 2 templates: `quote.signed.completed` y `quote.signed.declined` con sus 4 variantes (in_app, email, teams_card, teams_dm).
  - Routing default en `notification-kind-defaults.ts`: ambos → `[email, in_app, teams_dm]` con mention al `salesRepMemberId` del Space owner.
  - 1 handler opcional `quote.signature.acknowledge` para Action.Submit en Teams.
- Slack queda fuera de V1 (Out of Scope §11 del Hub). Cuando exista un adapter Slack del Hub, se agrega como canal default de este evento sin tocar este task.
- **Bloqueo cambiado**: ahora bloquea por TASK-693 (handlers + templates + mentions activos), no por TASK-490/TASK-619 directamente (que ya están).
- **Type cambia** de `implementation` independiente a `implementation` parte de la fase 4 del Hub. El work se prioriza con los demás templates de TASK-693 (es uno de los 6 prioritarios candidatos junto a finance/ops/delivery/payroll/sentry/notification-assigned).

Si se necesita la entrega ANTES de que TASK-693 cierre, se puede ejecutar el subset `email + in-app` con el path actual (sin pasar por el Hub) bajo un PR temporal — pero queda explícito que el código se borra cuando TASK-692 cutover llega. Mejor esperar.

## Orden de implementación recomendado

1. **TASK-690** Notification Hub Architecture Contract — tablas + adapters skeleton + router pure function.
2. **TASK-691** Notification Hub Shadow Mode — dual-write 1 semana para validar parity.
3. **TASK-692** Notification Hub Cutover — projection canónica activa, projections viejas borradas.
4. **TASK-693** Notification Hub Bidireccional + UI Preferences + Mentions — Action.Submit handlers + templating unificado + UI `/settings/notifications`.
5. **ESTA task (TASK-619.3)** — agregar templates `quote.signed.completed` + `quote.signed.declined` al registry del Hub. Consumer del trabajo de TASK-693, no productor de infrastructure.

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo` (~1.5 dias)
- Type: `implementation`
- Epic: `EPIC-001`
- Status real: `Diseno cerrado`
- Rank: `TBD`
- Domain: `notifications`
- Blocked by: `TASK-490, TASK-619`
- Branch: `task/TASK-619.3-quote-signature-notifications`
- Legacy ID: `RESEARCH-005 P2.1 follow-up`
- GitHub Issue: `none`

## Summary

Implementar 3 reactores independientes que consumen los eventos outbox de firma de cotizaciones y disparan notificaciones por email, in-app, y Slack al sales rep + stakeholders del Space. Cada reactor es independiente: si Slack falla, email sigue funcionando.

## Why This Task Exists

Hoy un cliente firma una quote y nadie del lado Efeonce lo sabe hasta que alguien refresca el portal. Esto rompe el ciclo comercial: sales rep no celebra el cierre, finance no factura a tiempo, account lead no comienza onboarding.

Los 5 eventos outbox de firma (TASK-619 Slice 6) deben generar notificaciones multicanal con templates consistentes con el resto del portal.

## Goal

- 3 reactores: `signature-email-reactor`, `signature-in-app-reactor`, `signature-slack-reactor`
- Cada uno suscrito a los 5 eventos `commercial.quote.signature_*` + 1 evento `commercial.quote.signature_expiring_soon` (de TASK-619.2)
- Templates email reutilizando react-email + greenhouse design tokens
- In-app notifications via `greenhouse_notifications.notifications` tabla existente
- Slack notifications via webhook URL del Space (configurable per-organization)
- Audiencias: sales rep owner del quote + Finance Admin + custom stakeholders del Space (configurables)

## Architecture Alignment

- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V2.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- TASK-023 (Notification System) — usa la infra que esa task establecio

Reglas obligatorias:

- reactores son async + idempotentes (mismo evento procesado 2 veces no duplica notificacion)
- emails usan template react-email con DM Sans + colores Greenhouse
- Slack solo si organization tiene `slack_webhook_url` configurado en `greenhouse_core.organizations.notification_config`
- in-app usa el sistema de notificaciones existente (TASK-023)
- failures de un reactor NO bloquean otros reactores (DLQ por canal)

## Dependencies & Impact

### Depends on

- `TASK-490` (signature_requests aggregate)
- `TASK-619` (eventos outbox emitidos)
- `TASK-023` (Notification System) — provee `greenhouse_notifications.notifications`
- `src/lib/email/delivery.ts` — `sendEmail` ya productivo
- Cloud Run `ops-worker` para procesar reactores

### Blocks / Impacts

- TASK-619 acceptance: notificaciones son criterio de cierre
- Future: TASK-027 (HRIS contracts) reutiliza los reactores con templates HR-specific

### Files owned

- `src/lib/notifications/reactors/signature-email-reactor.ts` (nuevo)
- `src/lib/notifications/reactors/signature-in-app-reactor.ts` (nuevo)
- `src/lib/notifications/reactors/signature-slack-reactor.ts` (nuevo)
- `src/lib/email/templates/QuoteSigned.tsx` (nuevo react-email template)
- `src/lib/email/templates/QuoteSignedByClient.tsx` (nuevo)
- `src/lib/email/templates/QuoteSignatureDeclined.tsx` (nuevo)
- `src/lib/email/templates/QuoteSignatureExpiringSoon.tsx` (nuevo)
- `src/lib/integrations/slack/signature-templates.ts` (nuevo Slack block kit templates)
- `services/ops-worker/src/jobs/notification-reactors.ts` (registrador de reactores)

## Scope

### Slice 1 — Email reactor + 4 templates (0.75 dia)

`signature-email-reactor.ts`:

- Suscrito a: `signed_by_client`, `countersigned_by_efeonce`, `signature_declined`, `signature_voided_after_signature`, `signature_expiring_soon`
- Resuelve audiencia: sales rep owner del quote + Finance Admin del tenant
- Llama `sendEmail` con template + context

4 templates react-email:

- `QuoteSignedByClient.tsx` — "El cliente firmo tu propuesta, falta tu refrenda"
- `QuoteSigned.tsx` — "Propuesta firmada por ambas partes — listo para facturar"
- `QuoteSignatureDeclined.tsx` — "[Cliente|Efeonce] rechazo la firma de tu propuesta"
- `QuoteSignatureExpiringSoon.tsx` — "Tu envelope expira en 24h y aun esta pendiente"

Cada template:

- Layout consistente con templates existentes (logo Greenhouse, footer Efeonce)
- CTA principal: "Ver propuesta en Greenhouse" (deep link a QuoteDetailView)
- DM Sans + colores semaforo
- Responsive

### Slice 2 — In-app reactor (0.25 dia)

`signature-in-app-reactor.ts`:

- Suscrito a los mismos 5 eventos
- Inserta en `greenhouse_notifications.notifications`:

  ```typescript
  {
    user_id: salesRepUserId,
    notification_type: 'quote_signature_event',
    title: 'Cotizacion firmada por cliente',
    body: 'Juan Perez (Cliente Acme) firmo la propuesta QT-123 v3',
    deep_link_path: '/finance/quotations/qt-123',
    icon: 'check-circle',
    severity: 'success',
    metadata: { signatureRequestId, eventType }
  }
  ```

### Slice 3 — Slack reactor (0.5 dia)

`signature-slack-reactor.ts`:

- Suscrito a los mismos 5 eventos
- Lookup en `greenhouse_core.organizations.notification_config.slack_webhook_url`
- Si null → skip (no error)
- Construye Slack Block Kit message con templates en `signature-templates.ts`
- POST al webhook con timeout 10s
- En caso de error: log + emit `notifications.slack.delivery_failed` event (no DLQ — Slack es best-effort)

Template Block Kit ejemplo `signed_by_client`:

```typescript
{
  blocks: [
    { type: 'header', text: { type: 'plain_text', text: '✅ Propuesta firmada por cliente' } },
    { type: 'section', text: { type: 'mrkdwn', text: `*${clientName}* firmo *${quotationNumber} v${versionNumber}*` } },
    { type: 'context', elements: [
      { type: 'mrkdwn', text: `Falta refrenda Efeonce · <${deepLink}|Ver propuesta>` }
    ]}
  ]
}
```

## Out of Scope

- WhatsApp notifications (deferred — usar ZapSign nativo por ahora)
- SMS notifications (deferred)
- Custom templates per-organization (Fase 2)
- Notificaciones a contactos del cliente (solo internal de Efeonce por ahora)

## Acceptance Criteria

- [ ] 3 reactores corriendo en ops-worker
- [ ] 4 templates email rendered y testeados con react-email preview
- [ ] in-app notifications visibles en NotificationBell del portal
- [ ] Slack messages enviados a webhook configurado (testeado en organization de prueba)
- [ ] reactor failures NO se propagan a otros reactores (verificado con kill switch)
- [ ] dedup por evento_id + canal (mismo evento procesado 2 veces no duplica)
- [ ] templates pasan QA visual con design system Greenhouse

## Verification

- Disparar evento `commercial.quote.signed_by_client` manualmente en dev
- Verificar: sales rep recibe email + in-app notification + Slack message en webhook configurado
- Repetir mismo evento → verificar no se duplica
- Killar Slack webhook (URL invalida) → verificar email + in-app siguen funcionando

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado con screenshots de cada canal
- [ ] `docs/documentation/finance/cotizaciones-gobernanza.md` actualizado con seccion "Notificaciones de firma"
