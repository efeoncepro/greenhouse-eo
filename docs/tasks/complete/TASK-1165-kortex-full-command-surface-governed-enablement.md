# TASK-1165 — Kortex Full Command Surface Governed Enablement

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `command`
- Epic: `none`
- Status real: `Complete — staging deployed and smoke verified`
- Rank: `TBD`
- Domain: `platform|crm|integrations|ops|ecosystem|hubspot|kortex`
- Blocked by: `none`
- Branch: `develop`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Extender el adapter de TASK-1164 para exponer todo el catalogo mutativo real de Kortex como comandos Greenhouse gobernados, sin convertir Greenhouse en proxy arbitrario. El resultado debe cubrir strategy, audit, onboarding/card config y operaciones admin bajo tiers de riesgo, idempotencia, redaccion, flags y confirmacion humana proporcional.

## Why This Task Exists

TASK-1164 probo el canal Greenhouse -> Kortex con un primer set de 4 comandos y smoke real `kortex.audit.run` contra HubSpot portal `48713323`. El operador ahora necesita usar absolutamente todas las capacidades programaticas de Kortex desde Greenhouse. Abrir un passthrough libre seria riesgoso: Kortex incluye endpoints que mutan HubSpot, runtime strategy, usuarios locales y snapshots.

## Goal

- Inventariar el OpenAPI/rutas Kortex actuales y mapear todos los endpoints mutativos a command names gobernados.
- Reemplazar el hardcode de 4 comandos por un registry declarativo de comandos, path builders, parametros requeridos y risk tier.
- Mantener binding preflight, allowlist, idempotencia, audit trail, redaccion y live/breakglass flags.
- Validar en staging con smoke por tier usando el portal conectado `48713323`, sin habilitar production live execute.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_KORTEX_COMMAND_ADAPTER_V1.md`
- `docs/architecture/GREENHOUSE_KORTEX_CONTROL_PLANE_READER_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`
- `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Greenhouse no escribe HubSpot directo.
- Kortex sigue siendo owner runtime de strategy/audit/HubSpot mutations.
- No exponer proxy arbitrario de URL/path/body hacia Kortex.
- Todo command requiere `Idempotency-Key`.
- Mutaciones destructivas o live execute requieren confirmacion humana y flags.
- Admin/user/bootstrap/snapshot endpoints quedan detras de breakglass flag separado.
- Responses se redacted antes de persistir/devolver.

## Normative Docs

- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- `TASK-1164` complete.
- `src/lib/kortex/commands/**`
- `src/app/api/admin/kortex/commands/route.ts`
- `greenhouse_core.api_platform_command_executions`
- Kortex OpenAPI runtime `https://kortex-control-plane-758246035804.us-central1.run.app/openapi.json`

### Blocks / Impacts

- Desbloquea operar todo el ciclo Kortex desde Greenhouse: intake, normalize, workspace, approval, compile, release execute variants, conversations, extraction, hub profile, snapshots y admin operations.
- Aumenta riesgo de mutacion externa si los tiers/flags quedan mal configurados.

### Files owned

- `src/lib/kortex/commands/**`
- `src/app/api/admin/kortex/commands/route.ts`
- `docs/architecture/GREENHOUSE_KORTEX_COMMAND_ADAPTER_V1.md`
- `docs/documentation/plataforma/kortex-command-adapter.md`
- `docs/manual-de-uso/plataforma/kortex-command-adapter.md`
- `docs/tasks/complete/TASK-1165-kortex-full-command-surface-governed-enablement.md`

## Current Repo State

### Already exists

- `POST /api/admin/kortex/commands` con contrato `greenhouse-kortex-command-adapter.v1`.
- Primeros comandos: `kortex.audit.run`, `kortex.strategy.compile`, `kortex.strategy.release_candidate.dry_run`, `kortex.strategy.release_candidate.execute`.
- Binding activo `EO-SPB-0002` para Kortex portal `9b0a6e91-0e08-4642-bc42-54a4b5c83ad8` / HubSpot `48713323`.
- Staging smoke final de TASK-1164: `kortex.audit.run` -> `200 completed`.

### Gap

- El adapter no cubre el resto de endpoints mutativos de Kortex.
- No existe registry declarativo por command/risk tier.
- No hay flags separados para comandos admin/breakglass.
- Los docs todavia describen solo los 4 comandos iniciales.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `src/lib/kortex/commands/**`, Kortex OpenAPI/runtime, `greenhouse_core.api_platform_command_executions`
- Consumidores afectados: `API admin`, futuros agentes/Nexa/MCP, operadores internos
- Runtime target: `staging`, `external`, `production gated`

### Contract surface

- Contrato existente a respetar: `POST /api/admin/kortex/commands`, `greenhouse-kortex-command-adapter.v1`
- Contrato nuevo o modificado: command registry completo con tiers `safe|stateful|external_write|admin_breakglass`
- Backward compatibility: `compatible` para los 4 comandos existentes; nuevos comandos additive
- Full API parity: UI/agentes/operadores deben consumir este command adapter, no Kortex DB ni HubSpot directo

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_core.api_platform_command_executions`
- Invariantes que no se pueden romper:
  - `(principal, Idempotency-Key, fingerprint)` no duplica ejecucion.
  - Payload distinto con misma key devuelve conflicto.
  - Binding y allowlist se resuelven antes de llamar a Kortex.
  - `execute` y variantes live no corren sin confirmacion y flags.
  - Admin/breakglass no corre si `KORTEX_COMMAND_ADMIN_ENABLED` no esta activo.
- Tenant/space boundary: resuelto por `sister_platform_bindings` y portal Kortex/HubSpot.
- Idempotency/concurrency: `executeApiPlatformCommand` + `Idempotency-Key` obligatorio.
- Audit/outbox/history: `api_platform_command_executions` append-only para evidencia de request/response redacted.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: adapter enabled solo donde ya este configurado; live/admin commands disabled by default
- Backfill plan: `N/A`
- Rollback path: flags off (`KORTEX_COMMAND_ADAPTER_ENABLED=false`, `KORTEX_COMMAND_LIVE_EXECUTE_ENABLED=false`, `KORTEX_COMMAND_ADMIN_ENABLED=false`) + revert PR si falla registry
- External coordination: Vercel env vars/redeploy; Kortex runtime health; operator sign-off para live/admin

### Security and access

- Auth/access gate: `requireAdminTenantContext` + API Platform command harness
- Sensitive data posture: no secrets; possible PII/CRM payloads redacted in errors/responses
- Error contract: `ApiPlatformError` canonical, no raw Kortex/HubSpot secrets
- Abuse/rate-limit posture: idempotency, portal allowlist, admin flag, confirmation phrase, no arbitrary path proxy

### Runtime evidence

- Local checks: focal tests for registry, parser, path builders, tier gates and legacy commands
- DB/runtime checks: command execution row for smoke commands
- Integration checks: staging `kortex.audit.run`, one non-HubSpot stateful strategy command where safe, live/admin rejection checks
- Reliability signals/logs: command execution status, redacted error codes
- Production verification sequence: staging only for broad enablement; production live/admin remains disabled until explicit approval

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Command catalog and risk tiers

- Read Kortex OpenAPI and local route source.
- Enumerate all non-GET Kortex endpoints.
- Define command names, required payload keys, path params, HTTP method, upstream path and tier.
- Explicitly mark internal Cloud Tasks endpoint and auth/bootstrap endpoints as `admin_breakglass`.

### Slice 2 — Registry-driven adapter

- Replace hardcoded command construction with registry-driven dispatch.
- Preserve existing command names and behavior.
- Add new command aliases for every mutative Kortex route.
- Add tier gates:
  - `safe`: allowed under adapter flag.
  - `stateful`: allowed under adapter flag + binding/allowlist.
  - `external_write`: requires live flag or command-specific execute flag.
  - `admin_breakglass`: requires admin flag and confirmation phrase.

### Slice 3 — Tests and docs

- Add focal unit tests for all command registry entries.
- Cover legacy commands, required path params, tier gating and no arbitrary path.
- Update architecture, manual and documentation with command catalog and flags.

### Slice 4 — Staging rollout evidence

- Configure staging flags for all non-admin safe/stateful commands.
- Keep live execute/admin disabled unless explicitly approved.
- Run staging smokes:
  - existing `kortex.audit.run` still passes.
  - at least one newly exposed safe/stateful command passes or is rejected with expected canonical error.
  - live/admin commands reject with expected gate.

## Out of Scope

- Direct HubSpot writes from Greenhouse.
- Production live execute enablement.
- Removing confirmation gates for destructive commands.
- Building UI for command execution.
- Kortex-side API redesign unless a blocking upstream bug is discovered.

## Detailed Spec

Initial mutative Kortex route inventory from OpenAPI:

- `PUT /api/v1/portals/{hubspot_portal_id}/hub-profile`
- `POST /api/v1/admin/snapshots/trigger`
- `POST /api/v1/admin/auth/verify`
- `POST /api/v1/admin/users/seed`
- `POST /api/v1/admin/users/bootstrap-e2e-agent`
- `POST /api/v1/audits/run`
- `POST /api/v1/strategy/normalize`
- `POST /api/v1/strategy/intake`
- `POST /api/v1/strategy/seed-from-audit`
- `PATCH /api/v1/strategy/workspaces/{workspace_id}`
- `POST /api/v1/strategy/workspaces/{workspace_id}/compilation-runs`
- `POST /api/v1/strategy/workspaces/{workspace_id}/compile`
- `POST /api/v1/strategy/workspaces/{workspace_id}/approval-decisions`
- `POST /api/v1/strategy/release-candidates/{release_candidate_id}/execute`
- `POST /api/v1/strategy/release-candidates/{release_candidate_id}/execute-workflows`
- `POST /api/v1/strategy/release-candidates/{release_candidate_id}/execute-custom-objects`
- `POST /api/v1/strategy/conversations`
- `POST /api/v1/strategy/chat`
- `POST /api/v1/strategy/internal/operations/execute/{operation_id}`
- `POST /api/v1/strategy/conversations/{conversation_id}/extract`

Do not expose any command by accepting arbitrary `path` from the request. Every command must be defined in source.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4.
- Tier gates must ship before any new external-write/admin command is reachable.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Abrir proxy arbitrario hacia Kortex | Security/API | medium | Registry fixed in source; reject unknown commands | `bad_request` unsupported command |
| Ejecutar mutaciones HubSpot no aprobadas | HubSpot/Kortex | medium | `external_write` flag + confirmation + dry-run where applicable | command execution failed/blocked |
| Ejecutar admin/bootstrap endpoints accidentalmente | Kortex ops/security | medium | `admin_breakglass` flag OFF + phrase | `kortex_admin_command_disabled` |
| Drift con OpenAPI Kortex | Integration | medium | registry test compares known routes / docs inventory | test failure / missing route |
| Respuesta con datos sensibles | Security | low | redaction before response/persist | secret hygiene review |

### Feature flags / cutover

- `KORTEX_COMMAND_ADAPTER_ENABLED` controls all commands.
- `KORTEX_COMMAND_LIVE_EXECUTE_ENABLED` controls live external writes.
- `KORTEX_COMMAND_ADMIN_ENABLED` controls admin/breakglass commands.
- `KORTEX_COMMAND_ALLOWED_PORTALS` keeps portal allowlist.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | docs/registry revert | <5 min | si |
| Slice 2 | `KORTEX_COMMAND_ADAPTER_ENABLED=false` or revert | <5 min | si |
| Slice 3 | revert tests/docs | <5 min | si |
| Slice 4 | disable live/admin flags + redeploy | <5 min | si |

### Production verification sequence

1. Local focal tests for registry/tier/path builders.
2. Staging deploy with admin/live flags OFF.
3. Smoke existing audit command.
4. Smoke one new safe/stateful command.
5. Verify external-write/admin commands reject without required flags/confirmation.
6. Production remains no-op for live/admin until explicit operator approval.

### Out-of-band coordination required

- Vercel staging env vars/redeploy if new flags are introduced.
- Kortex runtime must stay installed/active for portal `48713323`.
- Operator approval required before enabling live/admin commands beyond staging-safe tests.

## Acceptance Criteria

- [x] All non-GET Kortex OpenAPI routes are either mapped to a command or explicitly excluded with rationale.
- [x] Existing TASK-1164 command names remain backward compatible.
- [x] Adapter rejects unknown command names and never accepts arbitrary upstream path.
- [x] Each command has method, path template, required path params, risk tier and summary metadata.
- [x] External-write commands require live flag and confirmation where appropriate.
- [x] Admin/breakglass commands require admin flag and confirmation phrase.
- [x] Tests cover registry completeness, tier gates, legacy commands and redaction/no raw errors.
- [x] Docs/manual/architecture list the full command catalog and operational flags.
- [x] Staging smoke proves at least one existing command and one newly exposed command path.
- [x] Production live/admin execute remains disabled unless separately approved.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — DELIVERY, VERIFICATION & CLOSURE
     ═══════════════════════════════════════════════════════════ -->

## Verification

```bash
pnpm test src/lib/kortex/commands/adapter.test.ts src/lib/kortex/commands/client.test.ts src/app/api/admin/kortex/commands/route.test.ts
pnpm task:lint --task TASK-1165
pnpm ops:lint --changed
NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit --pretty false
pnpm docs:closure-check
pnpm qa:gates --changed --agent codex --task TASK-1165 --integration --runtime --docs --security
```

### Evidence — 2026-06-17

- Registry complete in `src/lib/kortex/commands/registry.ts`: 21 governed command names covering the 20 non-GET Kortex OpenAPI routes plus the backward-compatible dry-run alias.
- Local tests: `pnpm test src/lib/kortex/commands/adapter.test.ts src/lib/kortex/commands/client.test.ts src/app/api/admin/kortex/commands/route.test.ts` -> 17 tests passed.
- TypeScript: `NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit --pretty false` -> pass.
- Vercel staging env: `KORTEX_COMMAND_ADMIN_ENABLED=false` added; live execute already remains disabled.
- Vercel package hygiene fixed: `.vercelignore` now excludes `.captures`, `.codex`, `.claude`, `.agents`, `.tmp`, `tmp`, `artifacts`, `videos`, `test-results`, `tsconfig.tsbuildinfo`; upload dropped from `7.2GB` to `57MB`. Inflated deployment `greenhouse-hyqnb6n6k-efeonce-7670142f.vercel.app` was removed.
- Staging deploy: `https://greenhouse-s63g4vzwt-efeonce-7670142f.vercel.app` Ready, aliased to staging.
- Control-plane smoke: `GET /api/admin/kortex/control-plane?hubspot_portal_id=48713323` -> `200`, binding `EO-SPB-0002`, latest audit visible.
- Command smoke existing: `kortex.audit.run` -> `200 completed`, `commandExecutionId=EO-APC-F75FD63E`, `kortexOperationId=d8b4b769-4c33-4193-bb15-9545253ac521`.
- Command smoke new: `kortex.strategy.normalize` -> `200 completed`, `commandExecutionId=EO-APC-0D842212`, tier `safe`.
- Guardrail smoke: `kortex.strategy.release_candidate.execute_workflows` -> `409 kortex_live_execute_disabled`.
- Guardrail smoke: `kortex.admin.snapshots.trigger` -> `409 kortex_admin_command_disabled`.

## Closing Protocol

- Task moved to `complete/` after registry tests and staging smoke.
- Flags and external runtime evidence documented in `Handoff.md`.
- Production live/admin commands remain disabled unless the operator explicitly approves enablement.
