# TASK-651 — API Platform Finance / Commercial Read Surface

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-658`
- Branch: `task/TASK-651-api-platform-finance-commercial-read-surface`
- Legacy ID: `TASK-649 child`
- GitHub Issue: `—`

## Summary

Crear una read surface Finance/Commercial bajo API Platform para exponer datos agregados y scope-safe de organizaciones, clientes, cotizaciones, contratos, economics y readiness comercial sin consumir rutas UI legacy.

## Why This Task Exists

Finance y Commercial tienen muchos readers y rutas product API, pero no un contrato ecosystem-facing estable. Exponer estos datos por MCP requiere antes un resource adapter con authorization/sensitivity explícita.

## Goal

- Crear resource adapters Finance/Commercial bajo `src/lib/api-platform/resources/**`.
- Exponer rutas read-only bajo `src/app/api/platform/ecosystem/**`.
- Reutilizar readers existentes en `src/lib/finance/**` y `src/lib/commercial/**`.
- Evitar datos sensibles sin policy de `TASK-658`.

## Architecture Alignment

Revisar:

- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

Reglas obligatorias:

- No usar rutas `/api/finance/*` como backend directo.
- No exponer costos, payroll, margen o banking sin sensibilidad autorizada.
- Queries deben filtrar por binding scope antes de devolver datos.

## Normative Docs

- `docs/tasks/to-do/TASK-650-api-platform-domain-read-surfaces-program.md`
- `docs/tasks/to-do/TASK-658-api-platform-resource-authorization-bridge.md`

## Dependencies & Impact

### Depends on

- `TASK-658`
- `src/lib/finance/**`
- `src/lib/commercial/**`
- `src/lib/api-platform/core/**`

### Blocks / Impacts

- MCP finance/commercial read tools.
- OpenAPI stable resource coverage.

### Files owned

- `src/lib/api-platform/resources/finance-commercial.ts`
- `src/lib/api-platform/resources/finance-commercial/**`
- `src/app/api/platform/ecosystem/finance/**`
- `src/app/api/platform/ecosystem/commercial/**`
- `docs/api/GREENHOUSE_API_PLATFORM_V1.md`
- `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml`
- `Handoff.md`

## Current Repo State

### Already exists

- Product routes under `src/app/api/finance/**` and `src/app/api/commercial/**`.
- Domain readers under `src/lib/finance/**` and `src/lib/commercial/**`.
- Domain-local idempotency exists for some writes, but this task is read-only.

### Gap

- No API Platform read surface exists for Finance/Commercial.

## Scope

### Slice 1 — Discovery and sensitivity map

- Identify safe aggregate reads vs sensitive reads.
- Document capability requirements for sensitive fields.

### Slice 2 — Resource adapters

- Build read-only adapters over existing domain readers.
- Add pagination/freshness/degraded metadata where applicable.

### Slice 3 — Routes and docs

- Add ecosystem routes and OpenAPI/docs.

## Out of Scope

- Writes, quote issuance, banking operations, payments or HubSpot outbound commands.
- MCP tools.

## Acceptance Criteria

- [ ] Finance/Commercial read resources exist under API Platform.
- [ ] Sensitive fields are gated or deferred.
- [ ] Routes use API Platform envelopes, scope and tests.
- [ ] Docs/OpenAPI are updated.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- focused route/resource tests
- `git diff --check`

## Closing Protocol

- [ ] Lifecycle and folder synchronized.
- [ ] README/Handoff updated.

## Follow-ups

- MCP finance/commercial tools after this task closes.
