# TASK-048 - Delivery Sprint Runtime Completion

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `36`
- Domain: `delivery`
- GitHub Project: `Greenhouse Delivery`

## Summary

Completar la superficie client-facing de Sprints con un contrato de lectura dedicado, KPIs coherentes y vistas que dejen de depender de placeholders o de agregados del dashboard como fuente indirecta.

La meta no es convertir Sprints en un gestor de trabajo, sino cerrar el drilldown ejecutivo que ya forma parte del producto visible al cliente.

## Why This Task Exists

Hoy `/sprints` y `/sprints/[id]` existen, pero su madurez no es equivalente a la de `/proyectos`:

- la lista reutiliza data del dashboard en vez de un store dedicado
- varias secciones quedan en `EmptyState`
- el detalle de sprint es demasiado delgado para sostener la promesa de una vista específica

Eso deja una experiencia ambigua: la ruta existe como producto formal, pero opera más como preview parcial que como surface vertical cerrada.

## Goal

- Crear un read contract dedicado para sprints client-facing
- Alinear métricas de sprint con la frontera `performance = ICO`, `workflow = Delivery`
- Completar las vistas de lista y detalle con datos consistentes, no placeholders estructurales
- Dejar sprints como drilldown confiable desde dashboard y proyectos

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/roadmap/GREENHOUSE_DELIVERY_CLIENT_RUNTIME_GAPS_V1.md`

Reglas obligatorias:

- la vista de sprint sigue siendo una superficie de lectura y contexto, no un workspace de edición operativa
- performance de sprint debe apoyarse en `ICO` cuando la dimensión aplique o en un adapter claramente derivado
- los placeholders permanentes deben reemplazarse por datos reales o por una decisión explícita de no soportar esa sección

## Dependencies & Impact

### Depends on

- `src/views/greenhouse/GreenhouseSprints.tsx`
- `src/views/greenhouse/GreenhouseSprintDetail.tsx`
- `src/components/greenhouse/SprintTeamVelocitySection.tsx`
- `src/lib/dashboard/get-dashboard-overview.ts`
- `src/lib/team-queries.ts`
- `TASK-046 - Delivery Performance Metrics ICO Cutover`
- `docs/roadmap/GREENHOUSE_DELIVERY_CLIENT_RUNTIME_GAPS_V1.md`

### Impacts to

- `TASK-008 - Team Identity Capacity System`
- `TASK-009 - Greenhouse Home Nexa`
- `TASK-020 - FrameIO BigQuery Analytics Pipeline`
- `TASK-049 - Delivery Client Runtime Consolidation`
- drilldowns desde dashboard, project detail y team surfaces

### Files owned

- `src/views/greenhouse/GreenhouseSprints.tsx`
- `src/views/greenhouse/GreenhouseSprintDetail.tsx`
- `src/components/greenhouse/SprintTeamVelocitySection.tsx`
- `src/app/api/sprints/**`
- `src/lib/sprints/**`
- `src/lib/dashboard/get-dashboard-overview.ts`
- `docs/roadmap/GREENHOUSE_DELIVERY_CLIENT_RUNTIME_GAPS_V1.md`

## Current Repo State

### Ya existe

- rutas client-facing para lista y detalle de sprints
- datos operativos de sprint accesibles vía Delivery + dashboard
- componentes base reutilizables para cards, tablas y team slices

### Gap actual

- no hay un contrato de lectura de sprint con entidad propia y semántica clara
- parte de la experiencia depende de placeholders o data derivada indirectamente
- el detalle de sprint no expresa todavía un drilldown suficientemente rico para cliente

## Scope

### Slice 1 - Store y API de sprint

- definir store dedicado para listado y detalle de sprints
- crear endpoints específicos si hoy la data viene solo del dashboard
- incorporar scope tenant/client y navegación consistente con proyectos

### Slice 2 - KPIs y secciones de sprint

- alinear velocity, throughput, stuck work y team context con métricas correctas
- reemplazar placeholders estructurales por datos reales o decisiones explícitas de soporte
- consolidar secciones mínimas de resumen, equipo, carga y health

### Slice 3 - UX de drilldown

- hacer que sprint list y sprint detail compartan semántica de filtros, empty states y navegación
- asegurar que la ruta detalle entregue más valor que un simple wrapper de una sección aislada
- agregar pruebas sobre estados sin datos, sprint activo y sprint cerrado

## Out of Scope

- crear tablero Kanban o edición de sprint dentro del portal
- rehacer la taxonomía completa de estados de tarea
- reemplazar proyectos como principal inventario Delivery
- introducir analytics exploratorios fuera del caso client-facing

## Acceptance Criteria

- [ ] existe un store o read contract dedicado para sprints client-facing
- [ ] `/sprints` deja de depender estructuralmente de dashboard data como fuente principal
- [ ] `/sprints/[id]` expone un drilldown real de sprint, no solo una sección aislada
- [ ] placeholders estructurales se reemplazan por datos reales o secciones explícitamente descartadas
- [ ] métricas de sprint respetan la frontera `ICO` vs `workflow`
- [ ] `pnpm lint` pasa sin nuevos errores
- [ ] `pnpm test` cubre listado y detalle de sprint en al menos dos estados relevantes
- [ ] `npx tsc --noEmit` no introduce errores nuevos

## Verification

- `pnpm lint`
- `pnpm test`
- `npx tsc --noEmit`
- smoke manual sobre `/sprints` y `/sprints/[id]` validando lista, drilldown y estados sin datos
