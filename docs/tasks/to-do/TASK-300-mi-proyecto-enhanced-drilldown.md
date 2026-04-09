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
- Blocked by: `TASK-286`
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
