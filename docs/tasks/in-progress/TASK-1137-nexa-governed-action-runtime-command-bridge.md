# TASK-1137 — Nexa governed action runtime + command bridge

## Delta 2026-06-15

- **Desbloqueada**: el bloqueante TASK-655 (API Platform Command & Idempotency Foundation) quedó `complete`. Ya existe el bridge de ejecución gobernada: `runEcosystemCommandRoute` + `executeApiPlatformCommand` (`src/lib/api-platform/core/commands.ts`) con `Idempotency-Key` + command audit en `greenhouse_core.api_platform_command_executions`. La ejecución de `NexaActionProposal` debe montarse sobre esta foundation (no reinventar idempotencia/audit de commands).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `In progress (2026-06-15) — piloto: mark notifications read · alcance S1-S5 · UI confirm-card = follow-up Codex`
- Rank: `TBD`
- Domain: `nexa|platform|api|agentic|ops|security`
- Blocked by: `TASK-655`
- Branch: `task/TASK-1137-nexa-governed-action-runtime-command-bridge`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Crear la capa que permita a Nexa pasar de advisory/read-only a acciones gobernadas sin que el LLM
ejecute mutaciones directas. Nexa debe poder proponer una accion, mostrar preview/impacto, pedir
confirmacion humana y ejecutar commands idempotentes/auditados via API Platform.

## Why This Task Exists

Nexa ya tiene tools de lectura y varias tasks de CTAs/insights/actionability, pero no existe un
runtime unificado para acciones de chat con command semantics. TASK-159 habla de "Query, Recommend,
Act" pero es antiguo y domain-specific; TASK-655 crea la foundation transversal de commands. Falta
el puente seguro: LLM propone intencion, Greenhouse resuelve deterministicamente el command permitido,
usuario confirma, backend ejecuta con idempotencia, audit/outbox y permisos.

## Goal

- Definir `NexaActionProposal` como contrato versionado.
- Mapear intenciones a commands permitidos desde registry deterministico, no desde texto libre.
- Exigir preview/impacto + confirmacion humana para cualquier write.
- Ejecutar via API Platform command/idempotency foundation.
- Dejar audit, telemetry y reliability signals por accion.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_NEXA_CORE_AGENTIC_PLATFORM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_MOMENT_FABRIC_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/tasks/to-do/TASK-655-api-platform-command-idempotency-foundation.md`
- `docs/tasks/to-do/TASK-1002-full-api-parity-first-wave-program.md`

Reglas obligatorias:

- El LLM nunca ejecuta writes directamente.
- Toda accion mutativa requiere command server-side, autorizacion, idempotency key, audit y respuesta canonica.
- Acciones sensibles (finance, payroll, legal, security, contractual) requieren confirmacion explicita y, si aplica, aprobacion adicional.
- Si no existe command canonico, Nexa ofrece deep-link/CTA, no inventa endpoint.

## Normative Docs

- `docs/tasks/to-do/TASK-435-nexa-actionable-insights-cta-contract.md`
- `docs/tasks/to-do/TASK-159-nexa-agency-tools.md`
- `docs/tasks/to-do/TASK-449-nexa-insights-interaction-layer.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-655` — API Platform command/idempotency foundation.
- Existing domain commands/readers for the first pilot action.
- `src/lib/nexa/nexa-tools.ts`
- `src/lib/nexa/nexa-contract.ts`
- `src/app/api/home/nexa/*`

### Blocks / Impacts

- Future "Act" Nexa tools.
- MCP/app write-safe patterns downstream.
- Domain pilots in Agency, Delivery, Finance, HR once their commands exist.

### Files owned

- `src/lib/nexa/actions/*` (nuevo)
- `src/lib/nexa/nexa-contract.ts`
- `src/lib/nexa/nexa-tools.ts`
- `src/app/api/nexa/actions/*` o API Platform command lane equivalente
- `docs/architecture/nexa-intelligence/behavior/behavior-and-routing.md`
- `docs/architecture/nexa-intelligence/technical/data-contracts.md`

## Current Repo State

### Already exists

- Nexa tools read-only/operativos.
- `TASK-435` define CTAs advisory/deep-link para insights.
- `TASK-655` define la foundation necesaria para commands idempotentes.
- `TASK-159` documenta una vision antigua de Agency tools con acciones.

### Gap

- No existe `NexaActionProposal` versionado.
- No existe registry de acciones permitidas para Nexa.
- No existe preview/confirm/execute loop de accion desde el chat.
- No existe telemetry/reliability especifica de accion Nexa.

<!-- ZONE 2 — PLAN MODE: no llenar al crear la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Action proposal contract

- Definir `nexa-action-proposal.v1`: action key, intent, target, required permissions, sensitivity,
  preview payload, confirmation copy, command binding y expiration.
- Documentar que proposal no es write.

### Slice 2 — Registry and resolver

- Registry deterministico `intent/context -> allowed action`.
- Si falta command canonico, resolver devuelve CTA/deep-link o gap honesto.
- Tests anti-freeform route/endpoint.

### Slice 3 — Preview + confirmation API

- Endpoint/server action para preparar preview con datos reales y permisos.
- Confirmacion humana genera idempotency key y llama command foundation.

### Slice 4 — First safe pilot

- Elegir una accion de bajo riesgo con command existente o creada por task dependiente.
- No usar finance/payroll/legal/security como primer piloto salvo aprobacion explicita.

### Slice 5 — Observability + docs

- Audit trail, outbox si corresponde, telemetry de proposed/confirmed/executed/failed/cancelled.
- Reliability signals para action failure rate y unauthorized proposal rate.

## Out of Scope

- Acciones autonomas sin confirmacion.
- Crear commands de dominio amplios si no existen.
- Reemplazar CTAs de `TASK-435`; esta task las complementa.
- MCP writes directos.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

TASK-655 -> Slice 1 -> Slice 2 -> Slice 3 -> Slice 4 -> Slice 5.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| LLM induce accion no permitida | security | medium | registry deterministico + allowlist | unauthorized proposal rate |
| Usuario confirma sin entender impacto | product/security | medium | preview obligatorio + copy canonico + sensitivity gate | cancelled/failed action rate |
| Command se reintenta y duplica mutacion | platform | low | TASK-655 idempotency | command replay/conflict metrics |
| Dominio sensible se activa prematuramente | finance/payroll/legal | medium | first pilot bajo riesgo + approvals | domain-specific audit |

### Feature flags / cutover

- Nuevo flag server-side `NEXA_ACTION_RUNTIME_ENABLED=false` por defecto.
- Pilotos por action key con allowlist separada.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Contrato docs/types revertibles | < 10 min | si |
| Slice 2 | Registry flag OFF | < 5 min | si |
| Slice 3 | Disable action runtime flag | < 5 min | si |
| Slice 4 | Disable pilot action key | < 5 min | si |
| Slice 5 | Signals/docs revertibles | < 10 min | si |

### Production verification sequence

1. Staging with runtime flag OFF: no visible behavior change.
2. Staging with pilot action ON for internal test user.
3. Verify preview, confirmation, idempotency replay, audit and denial paths.
4. Operator sign-off before production pilot.

### Out-of-band coordination required

Human approval required for the first pilot action and any sensitive-domain action.

## Acceptance Criteria

- [ ] `NexaActionProposal` v1 exists and is documented.
- [ ] Nexa cannot execute a write without deterministic command binding and human confirmation.
- [ ] First pilot action executes through command/idempotency foundation.
- [ ] Unauthorized or unsupported action requests degrade to CTA/gap honestos.
- [ ] Audit/telemetry/reliability signals exist.

## Verification

- `pnpm vitest run src/lib/nexa`
- Command/idempotency focused tests from TASK-655
- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm nexa:doc-gate --changed`

