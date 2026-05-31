# TASK-652 — API Platform People / Workforce Read Surface

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-017`
- Status real: `Reframe requerido — defer until Person 360 workforce facet + redaction policy`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-658`, `TASK-961`, `TASK-962`
- Branch: `task/TASK-652-api-platform-people-workforce-read-surface`
- Legacy ID: `TASK-649 child`
- GitHub Issue: `—`

## Summary

Crear, más adelante, una read surface People/Workforce para API Platform con datos seguros de personas, membresías, facets operativas y workforce summaries.

**Reframe 2026-05-31:** esta task no debe ejecutarse hasta que `TASK-961` defina la faceta workforce de Person 360 y `TASK-962` clasifique coverage/readiness gaps. API/agent exposure debe consumir el read model/facet ya redacted, no inferir workforce state desde tablas crudas.

## Why This Task Exists

People y Workforce concentran datos sensibles. Hoy existen rutas product API y resolvers 360, pero no un contrato ecosystem-facing que combine binding scope con entitlements/capabilities para consumers externos o MCP.

El riesgo post-EPIC-017 es mayor: si se expone una API antes de estabilizar Person 360 `workforce`, agentes/MCP pueden volver a inferir estado laboral desde heurísticas locales (`members`, payroll, contractor payables) y reabrir el mismo drift que `TASK-959` está cerrando.

## Goal

- Definir qué datos People/Workforce pueden exponerse read-only.
- Crear adapters sobre `PersonComplete360` `workforce` facet y readers existentes.
- Redactar o diferir campos sensibles.
- Documentar el plano `views` vs `entitlements`.
- Prohibir exposición de payroll/compensation/payment rail fields sin field-level sensitivity y capability.

## Architecture Alignment

Revisar:

- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Person-level data requires explicit capability/sensitivity policy.
- Payroll, compensation and costs cannot be exposed by binding scope alone.
- Do not use UI views as the only authorization plane.
- Do not expose workforce state before `TASK-961` redaction/access decisions are implemented.
- Do not infer current workforce state from raw table heuristics; consume canonical read model/facet.

## Normative Docs

- `docs/tasks/to-do/TASK-650-api-platform-domain-read-surfaces-program.md`
- `docs/tasks/to-do/TASK-658-api-platform-resource-authorization-bridge.md`
- `docs/tasks/to-do/TASK-961-person-360-workforce-facet-read-only-promotion.md`
- `docs/tasks/to-do/TASK-962-workforce-coverage-readiness-remediation-plan.md`

## Dependencies & Impact

### Depends on

- `TASK-658`
- `TASK-961`
- `TASK-962`
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

### Slice 0 — Reframe gate

- Confirm `TASK-961` delivered a stable `workforce` facet/adapter.
- Confirm `TASK-962` classified coverage/readiness gaps.
- Confirm field-level sensitivity/redaction policy exists for workforce state.
- Decide which API fields are `public-to-scope`, `sensitive`, `restricted`, `agent_restricted` or out-of-scope.

### Slice 1 — Data classification

- Classify fields as public-to-scope, sensitive, restricted or out-of-scope.

### Slice 2 — Safe read adapters

- Implement only data classes allowed by `TASK-658`.

### Slice 3 — Docs/tests

- Add tests, OpenAPI and functional docs.

## Out of Scope

- Payroll/cost/payment rail details unless explicitly allowed by `TASK-658` and the `TASK-961` redaction policy.
- Writes or lifecycle commands.
- MCP tools.
- Any raw-table fallback for current workforce state.

## Acceptance Criteria

- [ ] People/Workforce platform reads are scope-safe and sensitivity-aware.
- [ ] Restricted fields are redacted or deferred.
- [ ] Tests cover authorization failures.
- [ ] API output consumes canonical Person 360/workforce read model, not raw-table heuristics.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- focused tests
- `git diff --check`

## Closing Protocol

- [ ] Lifecycle and folder synchronized.
- [ ] README/Handoff updated.
