# TASK-888 — Ecosystem Provisioning Commands + Webhooks

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|identity|integrations`
- Blocked by: `TASK-887`
- Branch: `task/TASK-888-ecosystem-provisioning-commands-webhooks`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Expone comandos y eventos para que Greenhouse pueda pedir a Kortex/Verk/sitio publico aplicar assignments: provisionar usuario, revocar acceso, suspender, cambiar scope o capability, y reportar resultado aplicado o fallido.

## Why This Task Exists

`TASK-886` guarda lo que Greenhouse desea y `TASK-887` observa lo que las plataformas tienen. Falta el carril de aplicacion: comandos idempotentes y webhooks/eventos para que Greenhouse asigne usuarios desde el portal y las plataformas converjan sin compartir runtime ni DB.

## Goal

- Crear provisioning command queue/control plane.
- Publicar eventos outbound `ecosystem.access.provisioning_requested`.
- Exponer APIs para que plataformas confirmen applied/failed.
- Integrar con Event Control Plane cuando corresponda.
- Mantener retries, idempotency keys y dead-letter/reliability.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`

Reglas obligatorias:

- No llamar APIs externas inline dentro del command helper si eso rompe transaccionalidad; usar outbox/dispatcher.
- Todo command debe tener idempotency key estable.
- Las plataformas aplican cambios localmente, pero reportan applied state de vuelta.
- Failure debe quedar observable, no oculto como 200 parcial.

## Normative Docs

- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-884`
- `TASK-885`
- `TASK-886`
- `TASK-887`
- `greenhouse_sync.outbox_events`
- `src/lib/webhooks/**`
- `src/app/api/platform/ecosystem/webhook-subscriptions/**`

### Blocks / Impacts

- `TASK-889`
- Future Verk provisioning adapter.
- Future public website CMS access adapter.

### Files owned

- `migrations/*_ecosystem_provisioning_commands.sql`
- `src/lib/ecosystem-access/provisioning-commands.ts`
- `src/lib/ecosystem-access/provisioning-results.ts`
- `src/lib/sync/event-catalog.ts`
- `src/app/api/platform/ecosystem/access/provisioning-results/route.ts`
- `src/lib/reliability/queries/ecosystem-provisioning-signals.ts`
- `src/types/db.d.ts`

## Current Repo State

### Already exists

- Outbox events and webhook control plane.
- Ecosystem auth/read lanes.
- Desired assignments and observed drift are planned in previous tasks.

### Gap

- No command queue for outbound provisioning.
- No applied/failed result contract.
- No retry/dead-letter semantics for platform provisioning.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce plan.md.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Provisioning Command Model

- Tabla/aggregate para commands.
- States: `queued`, `dispatching`, `dispatched`, `applied`, `failed`, `dead_letter`, `cancelled`.

### Slice 2 — Command Emitter

- Derivar commands desde assignment changes.
- Publicar outbox events por plataforma/scope.

### Slice 3 — Result API

- Endpoint ecosystem-facing para applied/failed con idempotency.
- Validar consumer + command id + binding.

### Slice 4 — Retry & Dead Letter

- Retry policy exponencial acotada: 5 intentos con backoff `0 / +1m / +5m / +15m / +60m`. Despues `dead_letter` terminal (patron outbox publisher TASK-773).
- Signals canonicos (naming alineado spec V1 §5.4):
  - `ecosystem.access.provisioning_apply_lag` — kind=lag, warning>1h / error>4h. Commands en `queued`/`dispatching`.
  - `ecosystem.access.provisioning_dead_letter` — kind=dead_letter, error si count>0. Steady=0.

### Slice 5 — Docs & Contract Tests

- OpenAPI/API docs derivadas.
- Contract tests para result payloads.
- Documentar 5 outbox events nuevos en `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`.

## Out of Scope

- Implementar el worker/adaptador interno de Kortex.
- UI admin.
- Auto-aprobar provisioning local no autorizado.

## Detailed Spec

Alineado con `GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md` §4.2 + §5.3 + §6.2.

### Outbox events canonicos (versionados v1)

- `ecosystem.access.provisioning_requested v1`
- `ecosystem.access.deprovisioning_requested v1`
- `ecosystem.access.provisioning_applied v1`
- `ecosystem.access.provisioning_failed v1`
- `ecosystem.access.provisioning_dead_lettered v1`

Registrar en `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`.

### Hosting canonico — Cloud Scheduler + ops-worker (no Vercel cron)

El dispatcher es **async_critical** segun la clasificacion `GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md` (TASK-775). Por lo tanto:

- Cloud Scheduler job `ops-ecosystem-provisioning-dispatch` cada 2 min, timezone `America/Santiago`.
- Endpoint en ops-worker `POST /ecosystem-access/dispatch-batch` envuelto via `wrapCronHandler({ name, domain: 'ecosystem', run })`.
- Logica pura en `src/lib/ecosystem-access/provisioning-dispatcher.ts` reusable desde Vercel route fallback + Cloud Run.
- Snapshot canonico de `CLOUD_SCHEDULER_JOBS_FOR_VERCEL_CRONS` actualizado en AMBOS readers (`src/lib/reliability/queries/cron-staging-drift.ts` + `scripts/ci/vercel-cron-async-critical-gate.mjs`).

NUNCA en Vercel cron — el async_critical CI gate (TASK-775) bloquea el commit.

### Sister platform delivery — 2 carriles

Sister platforms reciben commands por **uno** de estos carriles, declarados en el binding:

1. **Webhook outbound**: sister platform configura `webhook_subscriptions` filtrando `event_type IN ('ecosystem.access.provisioning_requested', 'ecosystem.access.deprovisioning_requested')` + `platform_key=<own>`. Dispatcher canonico (`GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`) los entrega con HMAC-SHA256 + retries propios.
2. **Polling**: sister platform llama `GET /api/platform/ecosystem/access/commands/pending` (sister_platform_consumers auth) — alternativa cuando no puede recibir webhooks (e.g. sitio publico CMS sin endpoint).

Ambos carriles son idempotentes via `idempotencyKey` = SHA256(`assignment_id` + `command_kind` + `effective_from`).

### Result payload canonico

```json
{
  "commandId": "cmd_...",
  "platformKey": "kortex",
  "idempotencyKey": "sha256:...",
  "status": "applied",
  "platformUserExternalId": "kortex_user_...",
  "appliedCapabilities": ["kortex.crm_intelligence.read"],
  "appliedAt": "2026-05-15T00:00:00.000Z"
}
```

POST a `/api/platform/ecosystem/access/provisioning-results` valida (a) consumer auth via `sister_platform_consumers`, (b) `commandId` existe + binding matches consumer scope, (c) `idempotencyKey` matches el persistido en `provisioning_commands` (anti-spoof). Result idempotente: misma POST 2 veces = 1 fila en `provisioning_command_results`.

### Dispatch enabled flag

`ecosystem_platforms.metadata_json -> 'provisioning_dispatch_enabled'` boolean por plataforma. Default `false`. Commands se persisten queued pero no se dispatchean hasta flag `true`. Patron compatible con cutover staged: TASK-889 Slice 5 habilita Kortex sandbox primero.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4 -> Slice 5.
- No external dispatch until result API and dead-letter are implemented.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Provisioning duplicado por retry | integrations | medium | idempotency key + platform command id | duplicate result test |
| Revocation no aplicada | identity | medium | apply lag signal + dead-letter queue | ecosystem.provisioning.apply_lag |
| Plataforma reporta applied falso | security | low | consumer auth + observed snapshot reconciliation | drift persists |

### Feature flags / cutover

Introducir flag/env o DB platform mode para dispatch real:

- `ecosystem_provisioning_dispatch_enabled` por platformKey.
- Default `false`; commands quedan queued/dispatched-to-outbox solo cuando se habilite.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Down migration antes de dispatch real | <30 min | parcial |
| Slice 2 | Disable dispatch flag | <5 min | si |
| Slice 3 | Disable result endpoint by credential suspension | <10 min | si |
| Slice 4 | Pause retry worker/job | <10 min | si |
| Slice 5 | Revert docs/tests | <15 min | si |

### Production verification sequence

- Staging with dispatch disabled.
- Create test assignment -> command queued.
- Enable dispatch for sandbox consumer only.
- Report applied via fixture.
- Confirm observed drift clears after next snapshot.

## Acceptance Criteria

- Assignment changes can enqueue provisioning commands.
- Commands are idempotent and auditable.
- Platform result API can mark command applied/failed.
- Dispatch can be disabled per platform.
- Dead-letter and lag signals exist.
- No direct DB/runtime sharing with Kortex/Verk.

## Verification

- `pnpm pg:doctor`
- `pnpm migrate:up`
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm vitest run src/lib/ecosystem-access src/app/api/platform/ecosystem`
