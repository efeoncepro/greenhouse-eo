# TASK-650 — API Platform Domain Read Surfaces Program

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `umbrella`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-658`
- Branch: `task/TASK-650-api-platform-domain-read-surfaces-program`
- Legacy ID: `TASK-649 child`
- GitHub Issue: `—`

## Summary

Coordinar la expansión de `api/platform/ecosystem/*` hacia dominios Greenhouse más allá de context/organizations/capabilities/readiness. El programa agrupa las read surfaces de ICO, Finance/Commercial, People/Workforce, Ops/Reliability y Organization Workspace/facets.

## Why This Task Exists

La API Platform ya tiene una foundation RESTful, pero los dominios principales siguen dependiendo de rutas product/API internas. Para que MCP y consumers ecosystem no usen rutas legacy, cada dominio necesita resource adapters y contratos platform propios.

## Goal

- Mantener una secuencia API-first por dominio.
- Evitar proxies directos a rutas UI/product API.
- Alinear domain read surfaces con binding scope y authorization bridge.
- Registrar dependencias entre domains y MCP.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md`
- `docs/tasks/in-progress/TASK-649-api-platform-completion-program.md`

Reglas obligatorias:

- Cada domain surface debe tener resource adapter bajo `src/lib/api-platform/resources/**`.
- Cada route nueva debe vivir bajo `src/app/api/platform/ecosystem/**` o justificar otra lane.
- MCP solo consume contratos cerrados.

## Normative Docs

- `docs/tasks/to-do/TASK-648-api-platform-ico-read-surface-v1.md`
- `docs/tasks/to-do/TASK-651-api-platform-finance-commercial-read-surface.md`
- `docs/tasks/to-do/TASK-652-api-platform-people-workforce-read-surface.md`
- `docs/tasks/to-do/TASK-653-api-platform-ops-reliability-read-surface.md`
- `docs/tasks/to-do/TASK-654-api-platform-organization-workspace-facets-read-surface.md`

## Dependencies & Impact

### Depends on

- `TASK-658`
- `src/lib/api-platform/core/**`
- `src/lib/api-platform/resources/**`

### Blocks / Impacts

- MCP domain tools beyond base context/org/capabilities/readiness.
- API Platform OpenAPI stable contract.

### Files owned

- `docs/tasks/to-do/TASK-650-api-platform-domain-read-surfaces-program.md`
- child task specs listed above
- `docs/tasks/README.md`
- `Handoff.md`

## Current Repo State

### Already exists

- `TASK-648` covers ICO.
- API Platform resources exist for base ecosystem objects.

### Gap

- No coordinated sequence exists for the remaining domain read surfaces.

## Scope

### Slice 1 — Child sequencing

- Confirm blockers and recommended order for domain read tasks.
- Keep `TASK-648` as the first domain read child.

### Slice 2 — MCP dependency map

- Mark which domain surfaces can become MCP tools after completion.

## Out of Scope

- Implementing domain routes directly.
- Writes or command endpoints.

## Acceptance Criteria

- [ ] Domain read child tasks are created and linked.
- [ ] Each domain task states resource adapters, routes and auth constraints.
- [ ] MCP downstream dependency is explicit.

## Verification

- `git diff --check`
- Manual review against `TASK-649`

## Closing Protocol

- [ ] Lifecycle and folder are synchronized.
- [ ] `docs/tasks/README.md` is updated.
- [ ] `Handoff.md` is updated.

## Follow-ups

- Close this umbrella after child domain read surfaces are either completed or intentionally deferred.
