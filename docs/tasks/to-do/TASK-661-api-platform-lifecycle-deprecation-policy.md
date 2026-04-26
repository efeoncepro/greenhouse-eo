# TASK-661 — API Platform Lifecycle & Deprecation Policy

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `policy`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-661-api-platform-lifecycle-deprecation-policy`
- Legacy ID: `TASK-649 child`
- GitHub Issue: `—`

## Summary

Definir la política canónica de lifecycle para API Platform: `preview`, `stable`, `deprecated`, convivencia con rutas legacy/product API, versionado y ventanas de deprecación.

## Why This Task Exists

La API Platform ya convive con `integrations/v1` y muchas rutas product API. Sin política de lifecycle, cada nuevo contrato puede prometer estabilidad distinta o dejar rutas legacy vivas sin plan.

## Goal

- Definir estados de endpoint/resource.
- Definir criterios de promoción `preview -> stable`.
- Definir headers/docs de deprecación.
- Crear checklist para nuevos domains.

## Architecture Alignment

Revisar:

- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/operations/RELEASE_CHANNELS_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- No romper consumers existentes sin transición documentada.
- Legacy routes can coexist, but not become new external contract.

## Normative Docs

- `docs/tasks/in-progress/TASK-649-api-platform-completion-program.md`

## Dependencies & Impact

### Depends on

- Current API Platform architecture/docs

### Blocks / Impacts

- OpenAPI stable contract.
- Domain read surface promotion.
- Developer communication.

### Files owned

- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/api/GREENHOUSE_API_PLATFORM_V1.md`
- `docs/documentation/plataforma/api-platform-ecosystem.md`
- `changelog.md`
- `Handoff.md`

## Current Repo State

### Already exists

- Platform OpenAPI is marked preview.
- Legacy `integrations/v1` remains supported.

### Gap

- No explicit lifecycle/deprecation policy exists for platform resources.

## Scope

### Slice 1 — Policy

- Define lifecycle states and promotion criteria.

### Slice 2 — Deprecation headers/docs

- Define documentation and optional headers.

### Slice 3 — Checklist

- Add new-domain checklist: resource adapter -> API Platform -> docs/tests -> MCP downstream.

## Out of Scope

- Deprecating specific routes in this policy task.
- Runtime implementation unless required for headers.

## Acceptance Criteria

- [ ] Lifecycle policy exists in architecture/docs.
- [ ] `preview` vs `stable` criteria are explicit.
- [ ] Legacy convergence checklist exists.

## Verification

- Manual review against architecture
- `git diff --check`

## Closing Protocol

- [ ] README/Handoff updated.
