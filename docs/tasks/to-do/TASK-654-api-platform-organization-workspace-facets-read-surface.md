# TASK-654 — API Platform Organization Workspace Facets Read Surface

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-008`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-611`, `TASK-658`
- Branch: `task/TASK-654-api-platform-organization-workspace-facets-read-surface`
- Legacy ID: `TASK-649 child`
- GitHub Issue: `—`

## Summary

Crear una read surface API Platform para Organization Workspace/facets, alineada con `EPIC-008`, para que consumers ecosystem y MCP puedan leer facets visibles/actions disponibles sin depender de rutas UI.

## Why This Task Exists

Organization Workspace será el shell canónico cross-domain. API Platform necesita exponer su proyección de facets de forma contract-first, separando surface visible (`views`) de autorización fina (`entitlements`).

## Goal

- Reutilizar la foundation de `TASK-611`.
- Exponer facets/tabs/actions disponibles por organization scope.
- Documentar ambos planos: `views` y `entitlements`.

## Architecture Alignment

Revisar:

- `docs/epics/to-do/EPIC-008-organization-workspace-convergence-facet-entitlements.md`
- `docs/tasks/to-do/TASK-611-organization-workspace-facet-projection-entitlements-foundation.md`
- `docs/architecture/GREENHOUSE_ACCOUNT_COMPLETE_360_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- No duplicar shell UI.
- No usar `views` como autorización única.
- Organization remains canonical anchor.

## Normative Docs

- `docs/tasks/to-do/TASK-650-api-platform-domain-read-surfaces-program.md`
- `docs/tasks/to-do/TASK-658-api-platform-resource-authorization-bridge.md`

## Dependencies & Impact

### Depends on

- `TASK-611`
- `TASK-658`
- Account/Organization 360 readers

### Blocks / Impacts

- MCP organization workspace tools.
- Finance Clients and Agency Organization convergence.

### Files owned

- `src/lib/api-platform/resources/organization-workspace.ts`
- `src/app/api/platform/ecosystem/organization-workspace/**`
- docs/OpenAPI updates

## Current Repo State

### Already exists

- Base organizations resource exists.
- EPIC-008 and TASK-611 define target facet model.

### Gap

- No platform contract exists for facets/actions projection.

## Scope

### Slice 1 — Facet contract

- Define response model for facets, actions and availability.

### Slice 2 — Resource route

- Implement read-only ecosystem route after dependencies close.

### Slice 3 — Docs/tests

- Add tests and OpenAPI.

## Out of Scope

- UI shell extraction.
- Facet write commands.

## Acceptance Criteria

- [ ] Organization Workspace facets are exposed through API Platform.
- [ ] Views vs entitlements are explicitly documented.
- [ ] Scope and authorization tests pass.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- focused tests
- `git diff --check`

## Closing Protocol

- [ ] Lifecycle and folder synchronized.
- [ ] README/Handoff updated.
