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
