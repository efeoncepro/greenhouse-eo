# TASK-299 — Sprints Completion: Burndown & Team Velocity

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `15`
- Domain: `delivery`
- Blocked by: `none`
- Branch: `task/TASK-299-sprints-completion`

## Summary

Implementar Burndown y Team Velocity en la vista de Ciclos/Sprints — hoy son empty states. Empty states en portal enterprise restan credibilidad. Implementar o eliminar.

## Why This Task Exists

La pagina de Sprints tiene el ciclo activo y el historial funcionando, pero Burndown y Team Velocity muestran "Sin datos". Un Marketing Manager que ve promesas vacias asume que la herramienta esta incompleta.

## Goal

- Burndown chart: trabajo restante vs tiempo en el ciclo activo
- Team Velocity chart: throughput por ciclo (ultimos 3-6 ciclos)
- Eliminar empty states

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` — §5.2, §14.2 M5

## Dependencies & Impact

### Depends on

- Datos de sprints/ciclos existentes
- Delivery tasks con timestamps de completado

### Files owned

- `src/app/(dashboard)/sprints/page.tsx` (modificar)
- `src/views/greenhouse/` (componentes de sprints)

## Current Repo State

### Already exists

- Ciclo activo con progress bar y metricas
- Historial de 3 meses con OTD%, completion count
- Datos de tasks con `created_time`, `fecha_de_completado`, `estado`

### Gap

- Burndown no calculado (requiere serie temporal de tasks restantes por dia)
- Team Velocity no calculado (requiere throughput por ciclo historico)
- Empty states en UI

## Scope

### Slice 1 — Burndown

- Calcular serie temporal: tasks restantes por dia del ciclo activo
- Linea ideal (lineal de total a 0) vs linea real
- Chart con Recharts

### Slice 2 — Team Velocity

- Query: throughput (tasks completadas) por ciclo, ultimos 3-6 ciclos
- Bar chart con promedio movil
- Mostrar tendencia (mejorando/estable/degradando)

## Out of Scope

- Sprint planning
- Story points (no existen en el modelo)

## Acceptance Criteria

- [ ] Burndown chart muestra trabajo restante vs tiempo
- [ ] Team Velocity chart muestra throughput por ciclo
- [ ] No hay empty states visibles
- [ ] `pnpm build` pasa

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
