# TASK-655 — API Platform Command & Idempotency Foundation

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Complete (2026-06-15)`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-655-api-platform-command-idempotency-foundation`
- Legacy ID: `TASK-649 child`
- GitHub Issue: `—`

## Summary

Crear la foundation transversal de commands e idempotencia para API Platform, separando semánticamente reads de writes y desbloqueando futuros MCP write-safe tools.

## Why This Task Exists

API Platform ya tiene commands mutativos, especialmente en event control plane y app lane, pero no comparten `Idempotency-Key`, command audit trail ni respuesta estándar de replay/conflict/accepted.

## Goal

- Crear command route helpers para ecosystem/app según corresponda.
- Crear idempotency store platform-wide.
- Definir response semantics para commands.
- Usar event control plane como primer proving ground.

## Architecture Alignment

Revisar:

- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Usar `pnpm migrate:create <name>` para migraciones.
- Usar `getDb`, `query` o `withTransaction` desde `@/lib/db`; no `new Pool()`.
- Writes deben ser idempotentes y auditables antes de MCP.

## Normative Docs

- `docs/tasks/in-progress/TASK-649-api-platform-completion-program.md`
- `docs/tasks/to-do/TASK-656-api-platform-query-conventions-foundation.md`

## Dependencies & Impact

### Depends on

- `src/lib/api-platform/core/**`
- `src/lib/api-platform/resources/events.ts`
- `greenhouse_core.api_platform_request_logs`
- `greenhouse_core.sister_platform_request_logs`

### Blocks / Impacts

- MCP write-safe tools.
- Stable command OpenAPI.

### Files owned

- `src/lib/api-platform/core/commands.ts`
- `src/lib/api-platform/core/idempotency.ts`
- `src/lib/api-platform/core/commands.test.ts`
- migration under `migrations/**`
- event control plane route/resource updates
- docs/OpenAPI updates

## Current Repo State

### Already exists

- Domain-local idempotency: finance, notifications, webhook inbox, commercial deal attempts.
- Mutative platform routes exist but use read-route helpers.

### Gap

- No platform-wide command/idempotency foundation exists.

## Scope

### Slice 1 — Schema and types

- Create platform idempotency/command audit schema.

### Slice 2 — Runtime helpers

- Implement command wrapper with replay/conflict semantics.

### Slice 3 — First adoption

- Adopt in event control plane commands.

### Slice 4 — Docs/tests

- Add tests and OpenAPI command documentation.

## Out of Scope

- Broad domain writes.
- MCP tool implementation.

## Acceptance Criteria

- [x] Platform command helper exists. → `runEcosystemCommandRoute` + `executeApiPlatformCommand` (`src/lib/api-platform/core/commands.ts`).
- [x] `Idempotency-Key` is supported for selected commands. → header opt-in + `Idempotency-Replayed` response header; documentado en OpenAPI.
- [x] Event control plane commands use the new foundation. → subscriptions create/update + delivery retry; aserción en `route-contract.test.ts`.
- [x] Tests cover replay, conflict and failed retries. → `commands.test.ts` (18 tests: replay, conflict, in-progress, failed-retry, no-key, fingerprint, key-parse).

## Implementation Summary (2026-06-15)

- **Slice 1** — migración `20260615181918477` crea `greenhouse_core.api_platform_command_executions` (state machine + partial UNIQUE + CHECK `key ⇒ fingerprint`); verificada live (25 cols / 4 índices / 4 CHECKs) + `db.d.ts`.
- **Slice 2** — `core/idempotency.ts` (store + lógica pura) + `core/commands.ts` (`runEcosystemCommandRoute` reusa `runEcosystemReadRoute`) + `core/errors.ts` (`+idempotency_conflict +idempotency_in_progress`).
- **Slice 3** — adopción event control plane (3 routes) + contract test + reliability signal `platform.command.stuck_processing` (reader + wire-up).
- **Slice 4** — `commands.test.ts` (18) + OpenAPI (`IdempotencyKey` param + 409) + arch Delta + funcional `api-platform-ecosystem.md` v1.5 + changelog + Handoff.
- **Decisión SSOT**: una sola tabla sirve audit trail + idempotency store (no dos que se desincronizan). Lane-agnostic (`principal_kind`); hoy adopta `ecosystem`.
- **Follow-ups** (no bloqueantes): adopción lane `app` (mismo store, distinto `principalKind`); cleanup/barrido de keys expiradas; MCP write-safe tools (desbloqueado).

## Verification

- `pnpm migrate:up`
- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- focused tests
- `git diff --check`

## Closing Protocol

- [x] Migration and `src/types/db.d.ts` committed together. → commit Slice 1.
- [x] README/Handoff updated. → README (Complete), Handoff (sesión 2026-06-15), changelog.
