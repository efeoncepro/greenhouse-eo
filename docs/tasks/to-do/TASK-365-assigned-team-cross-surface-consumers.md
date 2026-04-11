# TASK-365 — Assigned Team Cross-Surface Consumers

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-358, TASK-359, TASK-360, TASK-361`
- Branch: `task/TASK-365-assigned-team-cross-surface-consumers`
- Legacy ID: `follow-on multi-superficie de Assigned Team`
- GitHub Issue: `none`

## Summary

Llevar `Assigned Team` a surfaces adicionales del portal: snippets premium en dashboard/home/account views y entry points hacia el módulo completo o el drawer individual.

## Why This Task Exists

La arquitectura exige que `Equipo asignado` funcione como capability reusable y no como una sola pantalla. Greenhouse ya tiene surfaces donde el cliente necesita entender rápidamente composición, capacidad o riesgos del equipo sin entrar a `/equipo`. Hoy esas surfaces usan contratos viejos o no tienen módulo de talento asignado.

## Goal

- Reusar cards y readers de `Assigned Team` en múltiples superficies cliente-facing
- Crear entry points consistentes hacia el módulo completo y el drawer
- Aumentar cohesión del portal sin duplicar lógica de datos o UI

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ASSIGNED_TEAM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

Reglas obligatorias:

- un consumer cross-surface debe reutilizar contracts shared, no traer su propia query
- los snippets deben ser legibles en poco espacio y escalar a premium cards
- cada surface debe conservar su propósito principal; `Assigned Team` entra como lens contextual

## Normative Docs

- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- `src/views/greenhouse/dashboard/AccountTeamSection.tsx`
- `src/views/greenhouse/dashboard/ClientTeamCapacitySection.tsx`
- `src/components/greenhouse/AccountTeamDossierSection.tsx`
- `src/views/greenhouse/home/HomeView.tsx`
- `src/views/greenhouse/home/components/ModuleGrid.tsx`
- `src/views/greenhouse/organizations/OrganizationView.tsx`
- `TASK-358`
- `TASK-359`
- `TASK-360`
- `TASK-361`

### Blocks / Impacts

- `TASK-366`
- `docs/changelog/CLIENT_CHANGELOG.md`

### Files owned

- `src/views/greenhouse/dashboard/*`
- `src/views/greenhouse/home/*`
- `src/views/greenhouse/organizations/*`
- `src/components/greenhouse/AccountTeamDossierSection.tsx`
- `docs/tasks/to-do/TASK-365-assigned-team-cross-surface-consumers.md`

## Current Repo State

### Already exists

- dashboard cliente ya tiene secciones de team/capacity
- account dossier y surfaces organizacionales ya renderizan información parcial de equipo
- `HomeView` ya consume módulos y quick access reutilizables

### Gap

- los consumers actuales no comparten un contrato `Assigned Team`
- no existe premium card compacta `Equipo asignado`
- no hay navegación consistente desde snippets hacia módulo/drawer

## Scope

### Slice 1 — Dashboard consumers

- reemplazar blocks legacy por snippets `Assigned Team`
- integrar cards compactas, badges de riesgo y CTA a detalle

### Slice 2 — Home / account / organization

- agregar cards modulares o sections compactas donde hagan sentido
- conectar con drawer y `/equipo`

### Slice 3 — Consistency

- unificar microcopy, entry points, loading states y empty states entre superficies
- validar policy-aware rendering

## Out of Scope

- expandir `Assigned Team` a surfaces internas de HR o Agency admin
- analítica o export enterprise final

## Acceptance Criteria

- [ ] Dashboard y al menos dos surfaces adicionales consumen `Assigned Team` shared
- [ ] Los snippets reutilizan semantic layer, access policy y UI shared sin duplicación
- [ ] La navegación hacia módulo completo y drawer es consistente en todas las surfaces

## Verification

- `pnpm lint`
- `pnpm test -- assigned-team consumers`
- validación manual en dashboard, home y al menos una vista organizacional

## Closing Protocol

- [ ] actualizar `docs/changelog/CLIENT_CHANGELOG.md` si la capability queda visible en surfaces ya productivas

## Follow-ups

- `TASK-366`
