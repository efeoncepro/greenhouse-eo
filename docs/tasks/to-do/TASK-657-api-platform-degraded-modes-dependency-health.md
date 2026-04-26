# TASK-657 — API Platform Degraded Modes & Dependency Health

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
- Branch: `task/TASK-657-api-platform-degraded-modes-dependency-health`
- Legacy ID: `TASK-649 child`
- GitHub Issue: `—`

## Summary

Crear una taxonomía compartida para estados `fresh`, `stale`, `partial`, `degraded` y `unavailable` en API Platform, con metadata de dependencias por resource.

## Why This Task Exists

API Platform tiene freshness/ETag, pero no un contrato común para responder parcialmente cuando BigQuery, Postgres, HubSpot, Notion u otros backends fallan. Sin esto los recursos nuevos tienden a 500 opacos.

## Goal

- Definir degraded taxonomy.
- Crear helpers de dependency/freshness metadata.
- Aplicar piloto en resources existentes.
- Documentar respuesta parcial y errores.

## Architecture Alignment

Revisar:

- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`

Reglas obligatorias:

- Degraded state must not hide authorization failures.
- Partial data must label missing dependencies.

## Normative Docs

- `docs/tasks/in-progress/TASK-649-api-platform-completion-program.md`

## Dependencies & Impact

### Depends on

- `src/lib/api-platform/core/freshness.ts`
- `src/lib/api-platform/core/responses.ts`

### Blocks / Impacts

- Domain read surfaces that depend on BigQuery/HubSpot/Notion.
- OpenAPI stable contract.

### Files owned

- `src/lib/api-platform/core/degraded.ts`
- `src/lib/api-platform/core/degraded.test.ts`
- resource pilot updates
- docs/OpenAPI updates

## Current Repo State

### Already exists

- Freshness helpers and ETags.

### Gap

- No shared degraded/dependency health contract.

## Scope

### Slice 1 — Taxonomy

- Define status enum and metadata shape.

### Slice 2 — Runtime helpers

- Add helper for dependency reports and partial metadata.

### Slice 3 — Pilot/docs

- Apply to safe existing resource and document.

## Out of Scope

- Building a full monitoring plane.

## Acceptance Criteria

- [ ] Degraded metadata helper exists.
- [ ] At least one resource returns dependency/freshness metadata.
- [ ] Docs define statuses and client behavior.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- focused tests
- `git diff --check`

## Closing Protocol

- [ ] README/Handoff updated.
