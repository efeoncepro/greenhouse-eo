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

- Retry policy acotada.
- Signals `ecosystem.provisioning.dead_letter` y `ecosystem.provisioning.apply_lag`.

### Slice 5 — Docs & Contract Tests

- OpenAPI/API docs derivadas.
- Contract tests para result payloads.

## Out of Scope

- Implementar el worker/adaptador interno de Kortex.
- UI admin.
- Auto-aprobar provisioning local no autorizado.

## Detailed Spec

Events sugeridos:

- `ecosystem.access.provisioning_requested`
- `ecosystem.access.deprovisioning_requested`
- `ecosystem.access.provisioning_applied`
- `ecosystem.access.provisioning_failed`
- `ecosystem.access.provisioning_dead_lettered`

Result payload minimo:

```json
{
  "commandId": "cmd_...",
  "platformKey": "kortex",
  "status": "applied",
  "platformUserId": "kortex_user_...",
  "appliedCapabilities": ["kortex.crm_intelligence.read"],
  "appliedAt": "2026-05-15T00:00:00.000Z"
}
```

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
