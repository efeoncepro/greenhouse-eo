# TASK-652 — API Platform People / Workforce Read Surface

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
- Branch: `task/TASK-652-api-platform-people-workforce-read-surface`
- Legacy ID: `TASK-649 child`
- GitHub Issue: `—`

## Summary

Crear una read surface People/Workforce para API Platform con datos seguros de personas, membresías, facets operativas y workforce summaries. Person-level, payroll y costos quedan bloqueados hasta que `TASK-658` defina policy de sensibilidad/capabilities.

## Why This Task Exists

People y Workforce concentran datos sensibles. Hoy existen rutas product API y resolvers 360, pero no un contrato ecosystem-facing que combine binding scope con entitlements/capabilities para consumers externos o MCP.

## Goal

- Definir qué datos People/Workforce pueden exponerse read-only.
- Crear adapters sobre `person-360` y workforce readers existentes.
- Redactar o diferir campos sensibles.
- Documentar el plano `views` vs `entitlements`.

## Architecture Alignment

Revisar:

- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Person-level data requires explicit capability/sensitivity policy.
- Payroll, compensation and costs cannot be exposed by binding scope alone.
- Do not use UI views as the only authorization plane.

## Normative Docs

- `docs/tasks/to-do/TASK-650-api-platform-domain-read-surfaces-program.md`
- `docs/tasks/to-do/TASK-658-api-platform-resource-authorization-bridge.md`

## Dependencies & Impact

### Depends on

- `TASK-658`
- `src/lib/person-360/**`
- `src/lib/entitlements/**`
- `src/app/api/people/**`

### Blocks / Impacts

- MCP people/workforce tools.
- Future first-party app People resources.

### Files owned

- `src/lib/api-platform/resources/people.ts`
- `src/lib/api-platform/resources/workforce.ts`
- `src/app/api/platform/ecosystem/people/**`
- `src/app/api/platform/ecosystem/workforce/**`
- docs/OpenAPI updates

## Current Repo State

### Already exists

- `Person Complete 360` resolver and product API routes.
- Entitlements runtime/governance.

### Gap

- No API Platform surface with sensitivity policy exists for People/Workforce.

## Scope

### Slice 1 — Data classification

- Classify fields as public-to-scope, sensitive, restricted or out-of-scope.

### Slice 2 — Safe read adapters

- Implement only data classes allowed by `TASK-658`.

### Slice 3 — Docs/tests

- Add tests, OpenAPI and functional docs.

## Out of Scope

- Payroll/cost details unless explicitly allowed by `TASK-658`.
- Writes or lifecycle commands.
- MCP tools.

## Acceptance Criteria

- [ ] People/Workforce platform reads are scope-safe and sensitivity-aware.
- [ ] Restricted fields are redacted or deferred.
- [ ] Tests cover authorization failures.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- focused tests
- `git diff --check`

## Closing Protocol

- [ ] Lifecycle and folder synchronized.
- [ ] README/Handoff updated.
