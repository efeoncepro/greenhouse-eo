# TASK-656 — API Platform Query Conventions Foundation

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
- Blocked by: `none`
- Branch: `task/TASK-656-api-platform-query-conventions-foundation`
- Legacy ID: `TASK-649 child`
- GitHub Issue: `—`

## Summary

Estandarizar convenciones de query para API Platform: paginación/cursor, filtros, sort, fields, include, límites máximos y errores, evitando dumps grandes en API y MCP.

## Why This Task Exists

API Platform tiene `page/pageSize`, pero filtros y ordenamientos son ad hoc. Antes de sumar dominios grandes se necesita una política común para listas y payload shaping.

## Goal

- Extender helpers de query params bajo `src/lib/api-platform/core/**`.
- Definir política `page/pageSize` vs cursor.
- Documentar `filter`, `sort`, `fields`, `include`.
- Agregar tests y docs.

## Architecture Alignment

Revisar:

- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/api/GREENHOUSE_API_PLATFORM_V1.md`

Reglas obligatorias:

- Defaults conservadores.
- Máximos explícitos por resource.
- No ocultar dumps grandes detrás de MCP tools.

## Normative Docs

- `docs/tasks/in-progress/TASK-649-api-platform-completion-program.md`

## Dependencies & Impact

### Depends on

- `src/lib/api-platform/core/pagination.ts`
- current resource adapters

### Blocks / Impacts

- Domain read surfaces.
- OpenAPI stable contract.
- MCP tool ergonomics.

### Files owned

- `src/lib/api-platform/core/query.ts`
- `src/lib/api-platform/core/query.test.ts`
- `src/lib/api-platform/core/pagination.ts`
- docs/OpenAPI updates

## Current Repo State

### Already exists

- `parseApiPlatformPaginationParams`
- `buildApiPlatformPaginationMeta`
- `buildApiPlatformPaginationLinkHeader`

### Gap

- No shared sort/filter/fields/include/cursor convention.

## Scope

### Slice 1 — Query helper contract

- Add shared parsing and validation helpers.

### Slice 2 — Pilot adoption

- Adopt in one or two existing safe resources.

### Slice 3 — Docs/tests

- Document conventions and add OpenAPI parameters.

## Out of Scope

- Refactoring every resource in one pass.

## Acceptance Criteria

- [ ] Shared query helper exists and is tested.
- [ ] Query convention docs exist.
- [ ] At least one resource adopts the convention.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- focused tests
- `git diff --check`

## Closing Protocol

- [ ] README/Handoff updated.
