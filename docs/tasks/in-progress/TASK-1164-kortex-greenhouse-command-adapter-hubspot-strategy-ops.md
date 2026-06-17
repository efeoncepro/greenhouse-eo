# TASK-1164 — Kortex Greenhouse Command Adapter for HubSpot Strategy Ops

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `command`
- Epic: `none`
- Status real: `Rollout externo en ejecucion`
- Rank: `TBD`
- Domain: `platform|crm|integrations|ops|ecosystem|hubspot`
- Blocked by: `none`
- Branch: `task/TASK-1164-kortex-command-adapter`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Habilitar que Greenhouse pueda solicitar comandos gobernados a Kortex para operaciones HubSpot/estrategia: auditoria, compile, dry-run y execute. Kortex sigue siendo el runtime que muta HubSpot; Greenhouse agrega access gate, binding preflight, idempotencia, audit trail, respuesta redacted y confirmacion humana para live execute.

## Why This Task Exists

El operador pidio usar desde Greenhouse las capacidades Kortex para modificar propiedades HubSpot y desplegar programaticamente una estrategia. TASK-1162 dejo un reader read-only sano, pero bloqueo writes a proposito. Abrir writes sin command adapter expondria riesgo de replay, portal equivocado, secrets leak o execute sin aprobacion humana.

## Goal

- Crear el contrato versionado `greenhouse-kortex-command-adapter.v1`.
- Exponer `POST /api/admin/kortex/commands` para comandos allowlisted.
- Reusar `executeApiPlatformCommand` y `greenhouse_core.api_platform_command_executions`.
- Usar el reader de TASK-1162 como preflight/binding.
- Bloquear live execute sin flag, dry-run reciente y confirmacion humana.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_KORTEX_CONTROL_PLANE_READER_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`
- `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_KORTEX_COMMAND_ADAPTER_V1.md`

Reglas obligatorias:

- Greenhouse no escribe HubSpot directo.
- Kortex sigue siendo owner runtime de strategy/audit/HubSpot mutations.
- No agregar `kortex.*` al catalogo interno de entitlements.
- Todo command requiere `Idempotency-Key`.
- Production live execute queda default OFF hasta aprobacion explicita.

## Normative Docs

- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- `TASK-1162` complete.
- `src/lib/api-platform/core/commands.ts`
- `src/lib/api-platform/core/idempotency.ts`
- `src/lib/kortex/control-plane/**`

### Blocks / Impacts

- Desbloquea UI/Admin/Nexa futura para operar Kortex desde Greenhouse.
- Desbloquea dry-run/execute gobernado por API server-side.

### Files owned

- `src/lib/kortex/commands/**`
- `src/app/api/admin/kortex/commands/route.ts`
- `docs/architecture/GREENHOUSE_KORTEX_COMMAND_ADAPTER_V1.md`
- `docs/documentation/plataforma/kortex-command-adapter.md`
- `docs/manual-de-uso/plataforma/kortex-command-adapter.md`
- `docs/tasks/in-progress/TASK-1164-kortex-greenhouse-command-adapter-hubspot-strategy-ops.md`

## Current Repo State

### Already exists

- `GET /api/admin/kortex/control-plane` read-only.
- Binding Kortex para portal piloto `51183921` observado por TASK-1162.
- API Platform command foundation e idempotency.

### Gap

- Staging smoke real pendiente porque requiere configurar flags/secrets externos y validar Kortex mutative path con portal allowlist.

## Backend/Data Contract

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `greenhouse_core.api_platform_command_executions`.
- Consumidores: operadores internos, futuros agentes/Nexa, Kortex runtime.
- Runtime target: staging first; production live execute gated.

Invariantes:

- Mismo `(principal, Idempotency-Key, fingerprint)` no duplica ejecucion.
- Payload distinto con misma key devuelve conflicto.
- `execute` live requiere dry-run/preview reciente, confirmation phrase y flag live.
- Response Greenhouse nunca incluye tokens ni raw HubSpot payload.
- Portal scope se resuelve por binding, no por parametro arbitrario.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contract and docs

- Crear ADR `GREENHOUSE_KORTEX_COMMAND_ADAPTER_V1.md`.
- Documentar funcional y manual operativo.

### Slice 2 — Greenhouse command adapter

- Crear `src/lib/kortex/commands/**`.
- Implementar `POST /api/admin/kortex/commands`.
- Reusar `executeApiPlatformCommand`.

### Slice 3 — Guardrails and tests

- Validar command names, reason, idempotency, binding, flags y confirmation.
- Tests focales de adapter y route.

### Slice 4 — Rollout

- Configurar staging env y smoke externo.
- Mantener production live execute OFF hasta aprobacion.

## Out of Scope

- UI visible.
- Mutar HubSpot directo.
- Agregar `kortex.*` a entitlements internos.
- Live execute production sin aprobacion explicita.

## Detailed Spec

Comandos permitidos:

- `kortex.audit.run`
- `kortex.strategy.compile`
- `kortex.strategy.release_candidate.dry_run`
- `kortex.strategy.release_candidate.execute`

Request minimo:

- header `Idempotency-Key`
- `commandName`
- `hubspotPortalId` o `portalId`
- `reason`
- `payload`
- `confirmation` solo para live execute.

Response minimo:

- `contractVersion`
- `commandExecutionId`
- `status`
- `kortexOperationId`
- `scope`
- `summary`
- `sources`
- `redacted: true`

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4.
- Live execute nunca se habilita antes de dry-run staging.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Doble ejecucion por retry | Greenhouse/Kortex/HubSpot | medium | API Platform idempotency + key propagada | replay/conflict headers |
| Portal equivocado | HubSpot | medium | binding preflight + allowlist | `kortex_portal_mismatch` |
| Execute accidental | Ops/security | low | flag live OFF + confirmation phrase + preview | `kortex_live_execute_disabled` |
| Secret leak | Security | low | redaction + server-only tokens | tests/review |

### Feature flags / cutover

- `KORTEX_COMMAND_ADAPTER_ENABLED=false` default.
- `KORTEX_COMMAND_LIVE_EXECUTE_ENABLED=false` default.
- `KORTEX_COMMAND_ALLOWED_PORTALS=51183921` para staging piloto.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert docs | <5 min | si |
| 2 | disable `KORTEX_COMMAND_ADAPTER_ENABLED` | <5 min | si |
| 3 | revert tests/code or keep disabled | <10 min | si |
| 4 | force `KORTEX_COMMAND_LIVE_EXECUTE_ENABLED=false` | <5 min | si |

### Production verification sequence

1. Deploy con live execute OFF.
2. Smoke `GET /api/admin/kortex/control-plane`.
3. Smoke `POST /api/admin/kortex/commands` bloqueando sin flag/key.
4. Habilitar adapter solo en staging con portal allowlist.
5. Ejecutar dry-run/audit safe y verificar row en command executions.
6. Live execute solo con aprobacion explicita.

### Out-of-band coordination required

- Configurar env/secrets staging en Vercel/GCP/Kortex.
- Validar token server-to-server si Kortex exige auth para POST.

## Acceptance Criteria

- [x] `greenhouse-kortex-command-adapter.v1` documentado y versionado.
- [x] `POST /api/admin/kortex/commands` existe, admin-gated y usa idempotencia/audit canonica.
- [x] El adapter resuelve binding via TASK-1162 y bloquea portal mismatch.
- [x] `audit.run`, `strategy.compile`, `dry_run` y `execute` estan modelados con validacion por comando.
- [x] `execute` live no corre sin dry-run/preview vigente, confirmacion humana, reason e idempotency key.
- [x] Greenhouse no muta HubSpot directo ni almacena tokens HubSpot/Kortex.
- [x] Tests focales cubren parser, idempotency missing, flag disabled, dry-run dispatch, live flag y preview.
- [ ] Staging smoke deja evidencia de command execution row y Kortex operation/status redacted.
- [x] Production queda deployable con live execute disabled por default.

## Verification

```bash
pnpm test src/lib/kortex/commands/adapter.test.ts src/app/api/admin/kortex/commands/route.test.ts
pnpm task:lint --task TASK-1164
pnpm ops:lint --changed
NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit --pretty false
pnpm docs:closure-check
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — DELIVERY, VERIFICATION & CLOSURE
     ═══════════════════════════════════════════════════════════ -->

## Closing Protocol

- Mantener `in-progress` hasta staging smoke externo.
- Documentar flags/env y evidencia en `Handoff.md`.
- Mover a `complete/` solo con smoke staging o con decision explicita de cerrar como rollout pendiente.

## Operational Notes

- Production live execute queda OFF hasta aprobacion explicita.
