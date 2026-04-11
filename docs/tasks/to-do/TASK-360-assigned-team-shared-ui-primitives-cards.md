# TASK-360 — Assigned Team Shared UI Primitives & Cards

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-358`
- Branch: `task/TASK-360-assigned-team-shared-ui-primitives-cards`
- Legacy ID: `follow-on de GREENHOUSE_ASSIGNED_TEAM_ARCHITECTURE_V1`
- GitHub Issue: `none`

## Summary

Construir la capa shared de UI para `Assigned Team`: primitives, cards y shells reusables que soporten la página principal, el drawer, dashboard snippets y otras surfaces cliente-facing.

## Why This Task Exists

La spec ya separó primitives, building blocks y composites para evitar que `Equipo asignado` nazca como una pantalla monolítica imposible de reutilizar. Hoy Greenhouse sí tiene piezas potentes (`ExecutiveHeroCard`, `ExecutiveMiniStatCard`, `ClientSafeTalentCard`), pero no un set coherente para coverage, freshness, verification, saturation y attention.

## Goal

- Crear primitives y cards con contrato enterprise y nomenclatura Greenhouse
- Reutilizar patrones Vuexy/Greenhouse en vez de inventar una librería paralela
- Dejar lista la base para `TASK-361`, `TASK-362` y `TASK-365`

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ASSIGNED_TEAM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md`
- `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`

Reglas obligatorias:

- priorizar composición sobre componentes enormes de un solo uso
- mantener motion sobria, enterprise y desacoplada de lógica de negocio
- no degradar accesibilidad por animación o densidad

## Normative Docs

- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- `src/components/greenhouse/ExecutiveHeroCard.tsx`
- `src/components/greenhouse/ExecutiveMiniStatCard.tsx`
- `src/components/greenhouse/ExecutiveCardShell.tsx`
- `src/components/greenhouse/MetricStatCard.tsx`
- `src/components/greenhouse/AnimatedCounter.tsx`
- `src/components/greenhouse/ClientSafeTalentCard.tsx`
- `src/components/greenhouse/TeamSignalChip.tsx`
- `TASK-358`

### Blocks / Impacts

- `TASK-361`
- `TASK-362`
- `TASK-365`
- `src/components/greenhouse/index.ts`

### Files owned

- `src/components/greenhouse/assigned-team/*`
- `src/components/greenhouse/index.ts`
- `docs/tasks/to-do/TASK-360-assigned-team-shared-ui-primitives-cards.md`

## Current Repo State

### Already exists

- hero/stat cards enterprise en `src/components/greenhouse/*`
- patrón dossier individual en `ClientSafeTalentCard`
- chips y bars de team ya presentes en otros módulos

### Gap

- no existe set shared para `FreshnessChip`, `CapacityCoverageBar`, `VerificationConfidenceStack`, `AttentionListCard`
- no hay package local de cards preparado para surfaces múltiples

## Scope

### Slice 1 — Primitives

- construir badges, chips, bars y stacks de verification/freshness/capacity
- definir props y variants estables

### Slice 2 — Shared cards

- construir stat cards, health cards, capability coverage y attention cards
- consolidar shells y empty/loading states compartidos

### Slice 3 — Packaging

- exportar componentes desde barrel shared
- dejar examples/story fixtures o test harnesses básicos

## Out of Scope

- wiring del módulo `/equipo`
- policy de permisos o field masking

## Acceptance Criteria

- [ ] Existe una librería local `assigned-team` reusable desde varias surfaces
- [ ] Los componentes reutilizan patrones Vuexy/Greenhouse ya existentes
- [ ] Hay tests o fixtures para estados loading, empty, normal y degraded

## Verification

- `pnpm lint`
- `pnpm test -- assigned-team ui`
- validación manual de responsive y accesibilidad

## Closing Protocol

- [ ] actualizar `src/components/greenhouse/index.ts` sin romper exports existentes

## Follow-ups

- `TASK-361`
- `TASK-362`
- `TASK-365`
