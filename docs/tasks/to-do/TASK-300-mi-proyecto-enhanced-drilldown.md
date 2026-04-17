## Delta 2026-04-17 — alineación con capa de entitlements

TASK-286 fue ampliada para declarar capabilities granulares `client_portal.*` con `defaultScope: 'organization'`. Esta task toca el detalle de proyecto, que convive con dos surfaces distintas — clarificar en planning cuál es el target.

- **Surface existente:** `/proyectos/[id]` (enhancement de detalle actual).
- **Surface nueva TASK-286:** `cliente.mi_proyecto` en `/my-project` — nueva landing del cliente para SU proyecto principal.

**Clarificar en planning:** ¿esta task enriquece la surface existente, la nueva, o ambas?

- **Capability:** `client_portal.project`
- **Actions requeridas:** `view`, `comment` (si la task habilita comentarios del cliente sobre el proyecto; si no, dejar solo `view`).
- **Scope:** `organization`
- **Guard de página (si target es `cliente.mi_proyecto`):** combinar `hasAuthorizedViewCode(tenant, 'cliente.mi_proyecto')` + `can(tenant, 'client_portal.project', 'view', 'organization')`.
- **Guard de comentarios:** si hay flujo de comentarios, agregar `can(tenant, 'client_portal.project', 'comment', 'organization')`.
- **Ref canónica:** `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`.

# TASK-300 — Mi Proyecto Enhanced Drill-down

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `16`
- Domain: `delivery`
- Blocked by: `TASK-286` (view code + capability `client_portal.project` + binding + role defaults)
- Branch: `task/TASK-300-mi-proyecto-enhanced-drilldown`

## Summary

Enriquecer el detalle de proyecto con charts (throughput/RpA/OTD trend), campana vinculada, equipo inline y MetricStatCards. La pagina existe pero es basica — un specialist necesita ver todo el contexto de SU proyecto en un solo lugar.

## Why This Task Exists

La pagina de detalle de proyecto (`/proyectos/[id]`) funciona pero solo muestra una tabla de tasks y metricas raw. No tiene charts de tendencia, no muestra la campana vinculada, no integra el equipo del proyecto. Para un specialist enfocado en un proyecto, esta deberia ser su vista principal.

## Goal

- Charts de tendencia por proyecto: throughput, RpA, OTD
- Campana vinculada visible
- Equipo del proyecto integrado en la misma pagina
- KPIs en formato MetricStatCard

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` — §14.1 V10

## Dependencies & Impact

### Depends on

- `src/views/greenhouse/GreenhouseProjectDetail.tsx` — vista existente
- `/api/projects/[id]`, `/api/projects/[id]/tasks`, `/api/team/by-project/[id]`
- `MetricStatCard`, `ExecutiveMiniStatCard` — componentes reutilizables

### Files owned

- `src/views/greenhouse/GreenhouseProjectDetail.tsx` (modificar)
- `src/app/(dashboard)/proyectos/[id]/page.tsx` (modificar)

## Current Repo State

### Already exists

- Project detail page funcional con task table
- APIs completas: project, tasks, team by project
- `canAccessProject()` auth guard
- Metricas: avg_rpa, total_tasks, completed_tasks, open_review_items
- Charts libraries (Recharts, ApexCharts)
- `MetricStatCard`, `ExecutiveMiniStatCard`

### Gap

- No hay charts de tendencia por proyecto
- No hay campana vinculada
- Equipo no integrado (API separada)
- KPIs son datos raw, no MetricStatCards

## Scope

### Slice 1 — KPI cards y equipo inline

- Reemplazar metricas raw con MetricStatCards: OTD%, RpA, throughput, open reviews
- Integrar team data inline (fetch `/api/team/by-project/[id]` en la misma pagina)
- Campana vinculada (badge con nombre y link si existe)

### Slice 2 — Charts de tendencia

- Throughput por semana/mes (bar chart)
- RpA trend (line chart)
- OTD% trend (line chart)
- Requiere query de metricas historicas a nivel de proyecto

## Out of Scope

- Timeline/Gantt de tasks
- Edicion de proyecto
- Reasignacion de equipo

## Acceptance Criteria

- [ ] KPIs del proyecto en MetricStatCards
- [ ] Equipo del proyecto visible en la misma pagina
- [ ] Al menos 2 charts de tendencia (throughput + RpA o OTD)
- [ ] Campana vinculada visible si existe
- [ ] `pnpm build` pasa

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
