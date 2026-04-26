# TASK-660 — API Platform OpenAPI Stable Contract

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-656`, `TASK-657`
- Branch: `task/TASK-660-api-platform-openapi-stable-contract`
- Legacy ID: `TASK-649 child`
- GitHub Issue: `—`

## Summary

Convertir el OpenAPI de API Platform desde preview manual a contrato estable validado, con schemas, operationIds, errores, headers, ejemplos, query conventions y metadata de preview/stable/deprecated.

## Why This Task Exists

El YAML actual documenta rutas, pero no es suficiente para SDKs, MCP mapping ni consumers externos. Además confunde `externalScopeType` con `greenhouseScopeType`.

## Goal

- Corregir scope params.
- Agregar schemas completos por resource/command.
- Agregar headers y errores.
- Definir validación/generación.
- Sincronizar artefactos públicos.

## Architecture Alignment

Revisar:

- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/api/GREENHOUSE_API_PLATFORM_V1.md`
- `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml`

Reglas obligatorias:

- Docs are derived from architecture/runtime.
- Do not promise anonymous/public API.
- Mark preview/stable/deprecated explicitly.

## Normative Docs

- `docs/tasks/in-progress/TASK-649-api-platform-completion-program.md`
- `docs/tasks/to-do/TASK-656-api-platform-query-conventions-foundation.md`
- `docs/tasks/to-do/TASK-657-api-platform-degraded-modes-dependency-health.md`

## Dependencies & Impact

### Depends on

- `TASK-656`
- `TASK-657`
- current API Platform routes

### Blocks / Impacts

- Developer API contract.
- MCP mapping documentation.

### Files owned

- `docs/api/GREENHOUSE_API_PLATFORM_V1.md`
- `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml`
- `public/docs/greenhouse-api-platform-v1.md`
- `public/docs/greenhouse-api-platform-v1.openapi.yaml`
- optional validation script

## Current Repo State

### Already exists

- Static preview OpenAPI with 18 paths.

### Gap

- Sparse schemas, no operationIds, incomplete errors/headers, scope mismatch.

## Scope

### Slice 1 — Contract correction

- Fix scope params and add operationIds.

### Slice 2 — Schemas and examples

- Add resource/command response schemas and examples.

### Slice 3 — Validation workflow

- Add lightweight YAML validation or schema-generation decision.

## Out of Scope

- Public anonymous API.
- SDK generation unless explicitly added as follow-up.

## Acceptance Criteria

- [ ] OpenAPI validates.
- [ ] Scope params are correct.
- [ ] Resource/command schemas and examples exist for current routes.
- [ ] Public docs artifacts match source docs.

## Verification

- YAML parse/validation
- `pnpm lint`
- `pnpm build`
- `git diff --check`

## Closing Protocol

- [ ] README/Handoff updated.
