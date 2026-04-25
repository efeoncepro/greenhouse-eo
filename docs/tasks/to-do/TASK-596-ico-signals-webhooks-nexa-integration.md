# TASK-596 — Webhooks outbound + Nexa agent integration (EPIC-006 child 7/8)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-006`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-592`
- Branch: `task/TASK-596-ico-signals-webhooks-nexa`

## Summary

Exponer la capa de signals al exterior vía webhooks HMAC-signed al configurar subscripciones por tenant, y permitir que el agente Nexa lea signals y ejecute transiciones via la API en nombre del user con audit trail correcto. Habilita integración Slack, PagerDuty, tickets, y cualquier endpoint HTTP custom por tenant. El agente AI entra como actor first-class del sistema.

## Delta 2026-04-24 — TASK-598 shipped: resolver narrativas ANTES de firmar el payload

`TASK-598` instaló `src/lib/ico-engine/ai/narrative-presentation.ts` y dejó el weekly digest live con narrativas resueltas contra canonical vigente. Los webhooks y Nexa DEBEN consumir la misma capa para evitar que clientes externos reciban payloads con labels frozen o sentinels.

**Qué significa para esta task (Webhooks + Nexa):**

### Webhooks outbound HMAC-signed

Antes de firmar el payload y enviarlo al endpoint del cliente, pasar las narrativas por `resolveMentions` con contexto canonical. Ejemplo:

```ts
// En el webhook dispatcher
const mentionContext = await loadMentionContext({ enrichments: [signalPayload.enrichment] })
const resolvedEnrichment = resolveAllNarrativeFields(signalPayload.enrichment, mentionContext)

const webhookPayload = {
  event: 'signal.critical',
  signal_id: signal.signal_id,
  enrichment: {
    explanation_summary: resolvedEnrichment.explanation_summary,
    root_cause_narrative: resolvedEnrichment.root_cause_narrative,
    recommended_action: resolvedEnrichment.recommended_action
  }
}

// Emitir log structured para SLI
emitPresentationLog(summarizePresentationReports(resolvedEnrichment.presentation_reports, {
  source: 'webhook_outbound',
  windowStart: ..., windowEnd: ...
}))

const signature = hmacSign(JSON.stringify(webhookPayload), subscription.signing_secret)
await httpPost(subscription.endpoint_url, { payload: webhookPayload, 'X-Greenhouse-Signature': signature })
```

### Nexa agent tools

Los tools que el agente invoca (listIcoSignals, acknowledgeSignal, resolveSignal) deben devolver narrativa resuelta. Esto significa:

- `listIcoSignals` usa `selectPresentableEnrichments` + `resolveMentions` idéntico a la UI.
- `acknowledgeSignal(signal_key, reason)` escribe el transition event — no necesita resolver nada, pero el `reason` debería ir tal cual (no procesar con `resolveMentions` porque no tiene mentions).
- Al devolver el signal detail al agente para que lo resuma, la narrativa ya debe venir resuelta.

### Source en el log estructurado

- Webhooks: `source: 'webhook_outbound'`
- Nexa agent: `source: 'nexa_agent'`

Esto permite a TASK-594 medir SLIs por superficie.

### Label policy en el payload HMAC

Decidir: ¿el payload lleva los `@[label](type:id)` tokens o texto plano hidratado?

- Plain text (recomendado): clientes externos reciben narrativa human-readable sin procesar. Ej. "El proyecto TEASER TS cayó a 67.6%".
- Tokens (alternativa): `@[TEASER TS](project:abc)` — cliente externo decide cómo renderizar. Complica el webhook.

Recomendado: plain text, usando `resolveMentions` (que ya colapsa a texto plano cuando el canonical existe).

**Contrato que NO se debe romper:**

- Firmas públicas de la capa TASK-598.
- No enviar labels frozen en webhooks — el cliente externo puede confiar en que el payload es vigente.
- No enviar signals huérfanos — `selectPresentableEnrichments` con `requireSignalExists: true`.

**Sinergia:**

- Clientes de Slack/PagerDuty/etc. ven siempre labels actuales.
- Nexa agent tiene la misma vista que humanos en la UI inbox (TASK-595).
- Si un signal se resuelve entre la detección y el webhook send (ventana de minutos), el handler puede consultar `status` via TASK-592 y skippear el envío — el webhook queda consistente con la UI.

**Referencias:**

- Spec TASK-598: `docs/tasks/complete/TASK-598-ico-narrative-presentation-layer.md`
- Utilities: `src/lib/ico-engine/ai/narrative-presentation.ts`
- Helper `resolveAllNarrativeFields`: aplica a los 3 campos de narrativa en una pasada + retorna reports.

## Why This Task Exists

Un sistema de alertas enterprise-grade tiene que integrarse con los canales donde el equipo ya opera: Slack para notificación rápida, PagerDuty para SLAs duros, tickets para trazabilidad. Hoy los signals viven solo en la UI interna. Además, Nexa (el agente AI) tiene que poder actuar como representante del user dentro del sistema con audit trail explícito (`actor_type='agent'` + `agent_id`).

## Goal

- Tabla `ico_engine.signal_webhook_subscriptions` con `space_id + endpoint_url + signing_secret + event_types[]`.
- Cada transición de state (acknowledge/resolve/suppress/auto_resolved/new) publica webhook HMAC-signed.
- Retries exponenciales + dead-letter queue para fallos persistentes.
- API `GET /api/signals` + transitions accesible para Nexa con su propio bearer token.
- Audit trail con `actor_type + agent_id + user_id` cuando Nexa actúa en nombre de un humano.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_ICO_ENGINE_V2.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

## Dependencies & Impact

### Depends on
- `TASK-592` — transitions API.
- `TASK-590` — signal_events para emission con actor.

### Blocks / Impacts
- Integraciones externas (Slack bot, PagerDuty) dependen de esta capa.
- Nexa UX de acciones directas (ver next section).

### Files owned
- `migrations/*_ico-signals-webhook-subscriptions.sql`
- `src/lib/ico-engine/ai/webhook-dispatcher.ts`
- `src/app/api/admin/ico-signals/webhooks/**/route.ts` (CRUD de subs)
- `src/lib/nexa/signal-tools.ts` (extender)
- Tests

## Current Repo State

### Already exists
- Pattern de webhooks inbound + HMAC validation en `src/lib/webhooks/`.
- Outbox consumer + reactive workers.
- Nexa agent con tool registry (`src/lib/nexa/`).

### Gap
- No existe webhook outbound para signals.
- No existe subscription table.
- Nexa no tiene tools de `signals.acknowledge` / `signals.resolve`.

## Scope

### Slice 1 — Subscription table + CRUD admin

- Migración.
- `POST /api/admin/ico-signals/webhooks` (create), `DELETE` (revoke), `GET` (list), `PATCH` (update).
- RBAC: capability `admin.webhooks.manage`.

### Slice 2 — Webhook dispatcher

- Lee `signal_events` via outbox pattern → para cada event verifica subscriptions que matchean → POST HMAC-signed.
- Reusa pattern de `src/lib/sync/reactive-consumer.ts`.
- Retries: 1min, 5min, 30min, 2h, 8h, dead-letter.

### Slice 3 — Nexa tools

- `nexa.tools.listIcoSignals(filters)` — read.
- `nexa.tools.acknowledgeSignal(signal_key, reason)` — transition via API.
- `nexa.tools.resolveSignal(signal_key, reason)` — transition.
- `nexa.tools.suppressSignal(signal_key, until, reason)` — transition.
- Audit: toda invocación lleva `actor_type='agent'`, `agent_id='nexa'`, `on_behalf_of_user_id=X` en `signal_events`.

### Slice 4 — Tests

- Webhook: firma HMAC verificable; retries; dead-letter.
- Nexa tools: invocación end-to-end con mock del agente + verificación de audit trail.

## Out of Scope

- Slack adapter específico (follow-up).
- PagerDuty adapter específico (follow-up).
- Agent-initiated create de signals (v1 es read + transition only).

## Acceptance Criteria

- [ ] Tabla de subscriptions creada + CRUD funcional.
- [ ] Webhook HMAC-signed entregado a endpoint test con payload válido.
- [ ] Retries + dead-letter funcionando.
- [ ] Nexa ejecuta acknowledge/resolve end-to-end con audit correcto.
- [ ] `pnpm lint`, `pnpm test`, `npx tsc --noEmit`, `pnpm build` clean.

## Verification

- Tests + staging con endpoint tester.
- Nexa chat session demo: "resuelve el signal X" → verifica audit + side effect.

## Closing Protocol

- [ ] Lifecycle sincronizado.
- [ ] EPIC-006 child 7/8 marcado complete.

## Follow-ups

- Slack adapter genérico.
- PagerDuty adapter.
- Customización de payload shape por tenant (JSON template).
