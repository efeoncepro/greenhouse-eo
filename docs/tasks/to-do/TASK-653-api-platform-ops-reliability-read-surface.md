# TASK-653 — API Platform Ops / Reliability Read Surface

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
- Blocked by: `TASK-658`
- Branch: `task/TASK-653-api-platform-ops-reliability-read-surface`
- Legacy ID: `TASK-649 child`
- GitHub Issue: `—`

## Summary

Exponer estado operativo y confiabilidad de módulos por API Platform para consumers autorizados, reutilizando Reliability Control Plane, Ops Health y señales existentes sin filtrar detalles internos inseguros.

## Why This Task Exists

Reliability y Ops ya concentran señales útiles para agentes y operadores, pero hoy viven en admin/product routes. MCP necesita lecturas gobernadas para responder preguntas operativas sin permisos admin implícitos.

## Goal

- Crear resources Ops/Reliability read-only.
- Clasificar señales por sensibilidad.
- Exponer summaries scope-safe con degraded metadata.

## Architecture Alignment

Revisar:

- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`

Reglas obligatorias:

- No exponer secrets, stack traces crudos ni payloads internos sensibles.
- Preferir summaries y evidence curada.

## Normative Docs

- `docs/tasks/to-do/TASK-650-api-platform-domain-read-surfaces-program.md`
- `docs/tasks/to-do/TASK-658-api-platform-resource-authorization-bridge.md`

## Dependencies & Impact

### Depends on

- `TASK-658`
- `src/lib/reliability/**`
- `src/lib/operations/**`
- `src/app/api/admin/reliability/route.ts`

### Blocks / Impacts

- MCP ops/reliability tools.
- Operator consoles.

### Files owned

- `src/lib/api-platform/resources/reliability.ts`
- `src/app/api/platform/ecosystem/reliability/**`
- docs/OpenAPI updates

## Current Repo State

### Already exists

- Reliability Control Plane readers and admin routes.

### Gap

- No ecosystem-facing Ops/Reliability resource exists.

## Scope

### Slice 1 — Signal classification

- Decide what can be exposed externally.

### Slice 2 — Read resources

- Add safe overview/detail resources.

### Slice 3 — Docs/tests

- Add OpenAPI and route tests.

## Out of Scope

- Mutating ops commands, requeues or incident actions.
- Secret/credential visibility.

## Acceptance Criteria

- [ ] Ops/Reliability resources expose safe, scoped summaries.
- [ ] Sensitive internals are redacted.
- [ ] Tests cover scope and payload shape.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- focused tests
- `git diff --check`

## Closing Protocol

- [ ] Lifecycle and folder synchronized.
- [ ] README/Handoff updated.
