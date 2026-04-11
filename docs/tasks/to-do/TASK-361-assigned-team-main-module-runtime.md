# TASK-361 — Assigned Team Main Module Runtime

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `TASK-358, TASK-359, TASK-360, TASK-363`
- Branch: `task/TASK-361-assigned-team-main-module-runtime`
- Legacy ID: `evolucion de /equipo`
- GitHub Issue: `none`

## Summary

Reemplazar la vista actual de `/equipo` por el módulo enterprise `Equipo asignado`: hero, KPI strip, roster inteligente, filtros, agrupaciones y estados premium listos para cliente enterprise.

## Why This Task Exists

La surface actual `GreenhouseClientTeam` cumple como primer paso, pero sigue leyendo dos endpoints por separado y resolviendo una experiencia más cercana a roster que a portfolio operativo. La arquitectura ya define un shape mucho más fuerte y reusable.

## Goal

- Materializar la página principal `Equipo asignado` sobre el semantic layer nuevo
- Hacer visible composición, cobertura, seniority, skills e indicadores en lenguaje cliente-safe
- Dejar la surface lista para multi-space, multi-account y premium variants

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ASSIGNED_TEAM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

Reglas obligatorias:

- la página debe consumir un único portfolio reader siempre que sea posible
- el primer fold debe priorizar composición, coverage y health, no cards decorativas
- la UI debe degradar elegantemente cuando un cliente no tenga premium entitlements

## Normative Docs

- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- `src/app/(dashboard)/equipo/page.tsx`
- `src/views/greenhouse/GreenhouseClientTeam.tsx`
- `TASK-358`
- `TASK-359`
- `TASK-360`
- `TASK-363`

### Blocks / Impacts

- `TASK-362`
- `TASK-365`
- `docs/changelog/CLIENT_CHANGELOG.md`

### Files owned

- `src/app/(dashboard)/equipo/page.tsx`
- `src/views/greenhouse/GreenhouseClientTeam.tsx`
- `src/views/greenhouse/assigned-team/*`
- `docs/tasks/to-do/TASK-361-assigned-team-main-module-runtime.md`

## Current Repo State

### Already exists

- `/equipo` ya existe y consume `capacity` + `profiles`
- `GreenhouseClientTeam` ya muestra cards básicas y lista de miembros

### Gap

- no hay hero enterprise ni summary strip
- no hay grouping por `space`, seniority, rol, idioma o health
- no hay premium cards, freshness ni attention lane

## Scope

### Slice 1 — Page shell

- montar hero, KPI strip y filtros superiores
- conectar la página al portfolio reader nuevo

### Slice 2 — Smart roster

- construir lista/grilla inteligente con sorting, grouping y coverage states
- integrar empty, loading, error y no-entitlement states

### Slice 3 — UX polish

- instrumentar microinteracciones, placeholders, optimistic filter changes y skeletons
- validar responsive desktop/tablet/mobile

## Out of Scope

- drawer profundo por persona
- export, telemetry y hardening enterprise final

## Acceptance Criteria

- [ ] `/equipo` resuelve como `Equipo asignado` sobre portfolio canónico
- [ ] La página muestra composición, FTE, saturation, skills y health en lenguaje cliente-safe
- [ ] La surface soporta variantes con y sin premium entitlements sin romper layout

## Verification

- `pnpm lint`
- `pnpm test -- assigned-team main`
- validación manual en desktop y mobile

## Closing Protocol

- [ ] actualizar `docs/changelog/CLIENT_CHANGELOG.md` cuando la surface quede visible para clientes

## Follow-ups

- `TASK-362`
- `TASK-365`
- `TASK-366`
