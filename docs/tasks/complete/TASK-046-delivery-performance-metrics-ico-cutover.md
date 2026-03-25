# TASK-046 - Delivery Performance Metrics ICO Cutover

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `34`
- Domain: `delivery`
- GitHub Project: `Greenhouse Delivery`

## Summary

Cortar la capa client-facing de Delivery a métricas de performance provenientes de `ICO Engine`, dejando explícito que `RpA`, `OTD`, `FTR`, `cycle time`, `throughput` y `pipeline velocity` no deben volver a calcularse ad hoc en stores de proyectos, sprints o team views.

La tarea cierra primero el bug semántico más grave del audit: hoy el cliente puede ver un supuesto `RpA` que en realidad se calcula desde `frame_versions`.

## Why This Task Exists

El runtime actual mezcla señales operativas de distinta naturaleza:

- performance operativa real, ya materializada en `ICO Engine`
- señales workflow, derivadas de tareas, revisiones y comentarios

Ese cruce hoy no está bien delimitado. En particular, `src/lib/team-queries.ts` calcula `avg_rpa` a partir de `frame_versions`, y luego componentes client-facing lo muestran como `RpA`.

Eso genera tres problemas:

- el KPI está mal etiquetado y puede inducir decisiones erróneas
- la misma entidad puede mostrar números distintos según la vista
- Delivery client-facing no respeta la regla arquitectónica de Greenhouse: la semántica KPI debe vivir en una capa reusable y no recomputarse por endpoint

## Goal

- Reemplazar KPIs de performance Delivery por lecturas ICO canónicas
- Fijar una frontera explícita entre performance (`ICO`) y workflow (`delivery_tasks`, review pressure, comments, blocked state)
- Eliminar el falso `RpA` derivado de `frame_versions` del path visible al cliente
- Dejar contratos reutilizables para proyecto, sprint y miembro sin duplicar fórmulas

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/roadmap/GREENHOUSE_DELIVERY_CLIENT_RUNTIME_GAPS_V1.md`

Reglas obligatorias:

- la semántica de performance Delivery debe provenir de `ICO Engine`, no de fórmulas duplicadas en views o endpoints
- `workflow` y `performance` deben seguir existiendo como capas distintas aunque se presenten juntas en una misma UI
- si una dimensión todavía no está materializada en ICO, el fallback debe ser explícito, observable y temporal; no puede quedar como path silencioso permanente

## Dependencies & Impact

### Depends on

- `src/lib/team-queries.ts`
- `src/lib/projects/get-project-detail.ts`
- `src/lib/dashboard/get-dashboard-overview.ts`
- `src/lib/ico-engine/read-metrics.ts`
- `src/lib/ico-engine/schema.ts`
- `src/app/api/ico-engine/metrics/project/route.ts`
- `docs/roadmap/GREENHOUSE_DELIVERY_CLIENT_RUNTIME_GAPS_V1.md`

### Impacts to

- `TASK-008 - Team Identity Capacity System`
- `TASK-009 - Greenhouse Home Nexa`
- `TASK-011 - ICO Person 360 Integration`
- `TASK-048 - Delivery Sprint Runtime Completion`
- `TASK-049 - Delivery Client Runtime Consolidation`
- componentes client-facing de team, projects, dashboard y sprints

### Files owned

- `src/lib/team-queries.ts`
- `src/lib/projects/get-project-detail.ts`
- `src/lib/dashboard/get-dashboard-overview.ts`
- `src/lib/ico-engine/read-metrics.ts`
- `src/app/api/team/by-project/[projectId]/route.ts`
- `src/app/api/team/by-sprint/[sprintId]/route.ts`
- `src/components/greenhouse/ProjectTeamSection.tsx`
- `src/components/greenhouse/SprintTeamVelocitySection.tsx`
- `docs/roadmap/GREENHOUSE_DELIVERY_CLIENT_RUNTIME_GAPS_V1.md`

## Current Repo State

### Ya existe

- `ICO Engine` ya materializa métricas por proyecto y miembro
- existe API project-level para consultar métricas ICO
- Delivery ya tiene stores y superficies visibles para proyectos, sprints y equipo

### Gap actual

- el runtime de team views calcula un supuesto `RpA` desde `frame_versions`
- no existe una frontera uniforme entre KPIs de performance y señales workflow
- la misma experiencia Delivery puede combinar métricas de distinta semántica sin declararlo

## Scope

### Slice 1 - Contrato semántico de métricas Delivery

- definir qué KPIs client-facing pasan obligatoriamente a `ICO`
- distinguir cuáles señales siguen viviendo en stores operativos de tareas y revisión
- documentar fallback permitido y métricas aún no materializadas por dimensión

### Slice 2 - Cutover de stores y endpoints

- refactorizar project/sprint/member team queries para leer performance desde `ICO`
- eliminar el cálculo incorrecto de `avg_rpa` basado en `frame_versions`
- alinear APIs client-facing con nombres y payloads coherentes con la semántica real

### Slice 3 - UI y observabilidad

- actualizar componentes que hoy etiquetan mal métricas de performance
- dejar visible cuándo un KPI es workflow versus performance si conviven en la misma tarjeta o sección
- agregar tests que impidan reintroducir fórmulas KPI ad hoc en Delivery

## Out of Scope

- rediseñar visualmente todo el módulo Delivery
- rehacer el pipeline ICO
- mover todo Delivery a PostgreSQL
- resolver analítica histórica avanzada no visible al cliente

## Acceptance Criteria

- [ ] ninguna surface client-facing de Delivery muestra `RpA` calculado desde `frame_versions`
- [ ] proyecto, sprint y team views consumen KPIs de performance desde `ICO` o un adapter explícito sobre `ICO`
- [ ] las señales workflow siguen disponibles pero separadas semánticamente de performance
- [ ] existen tests o guards que impiden reintroducir fórmulas KPI ad hoc en Delivery
- [ ] `pnpm lint` pasa sin nuevos errores
- [ ] `pnpm test` cubre el cutover de al menos project y team views
- [ ] `npx tsc --noEmit` no introduce errores nuevos

## Verification

- `pnpm lint`
- `pnpm test`
- `npx tsc --noEmit`
- smoke manual sobre `/proyectos/[id]` y `/sprints/[id]` validando que los KPIs visibles coinciden con `ICO`
