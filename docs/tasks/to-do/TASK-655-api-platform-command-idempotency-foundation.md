# TASK-655 — API Platform Command & Idempotency Foundation

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
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

- [ ] Platform command helper exists.
- [ ] `Idempotency-Key` is supported for selected commands.
- [ ] Event control plane commands use the new foundation.
- [ ] Tests cover replay, conflict and failed retries.

## Verification

- `pnpm migrate:up`
- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- focused tests
- `git diff --check`

## Closing Protocol

- [ ] Migration and `src/types/db.d.ts` committed together.
- [ ] README/Handoff updated.
