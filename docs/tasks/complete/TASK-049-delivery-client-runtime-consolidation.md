# TASK-049 - Delivery Client Runtime Consolidation

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `37`
- Domain: `delivery`
- GitHub Project: `Greenhouse Delivery`

## Summary

Consolidar el read path client-facing de Delivery para reducir fan-out, contratos heterogéneos y fetches paralelos innecesarios entre dashboard, project detail, sprint detail y team slices.

La tarea no busca migrar Delivery completo a PostgreSQL ni reescribir todo el módulo. Busca que la experiencia visible del cliente consuma contratos más compactos, coherentes y reusables sobre las fuentes analíticas correctas.

## Why This Task Exists

El runtime actual ya funciona, pero está demasiado repartido:

- `GreenhouseProjectDetail` resuelve detalle, tareas y equipo en fetches separados
- dashboard, projects y sprints comparten semántica de health, activity y team context sin compartir un contrato estable
- evolucionar una surface visible suele implicar tocar demasiados stores en paralelo

El resultado es un client runtime funcional pero costoso de mantener, sensible a divergencias de payload y más lento de endurecer para nuevas superficies ejecutivas.

## Goal

- Reducir fan-out y duplicación en el read path client-facing de Delivery
- Consolidar contratos reutilizables para proyecto, sprint y dashboard drilldowns
- Mejorar consistencia de payloads, counts, KPI naming y empty states entre surfaces
- Dejar base preparada para refresh reactivo y surfaces ejecutivas futuras sin volver a abrir el mismo refactor

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/roadmap/GREENHOUSE_DELIVERY_CLIENT_RUNTIME_GAPS_V1.md`
- `docs/roadmap/GREENHOUSE_RUNTIME_SYNERGY_GAPS_V1.md`

Reglas obligatorias:

- la consolidación del read path no debe degradar el scope tenant/client ni duplicar lógica de autorización en el navegador
- `BigQuery` puede seguir siendo fuente analítica válida para Delivery; el objetivo es consolidar contratos de lectura, no forzar una migración arquitectónica incorrecta
- cualquier snapshot o adapter nuevo debe poder participar después en `Reactive Projection Refresh`

## Dependencies & Impact

### Depends on

- `src/views/greenhouse/GreenhouseProjectDetail.tsx`
- `src/views/greenhouse/GreenhouseProjects.tsx`
- `src/views/greenhouse/GreenhouseSprints.tsx`
- `src/lib/projects/get-project-detail.ts`
- `src/lib/projects/get-projects-overview.ts`
- `src/lib/dashboard/get-dashboard-overview.ts`
- `TASK-046 - Delivery Performance Metrics ICO Cutover`
- `TASK-047 - Delivery Project Scope Visibility Correction`
- `TASK-048 - Delivery Sprint Runtime Completion`
- `TASK-045 - Reactive Projection Refresh`
- `docs/roadmap/GREENHOUSE_DELIVERY_CLIENT_RUNTIME_GAPS_V1.md`

### Impacts to

- `TASK-009 - Greenhouse Home Nexa`
- `TASK-014 - Projects Account 360 Bridge`
- `TASK-020 - FrameIO BigQuery Analytics Pipeline`
- futuras surfaces ejecutivas que reutilicen contracts Delivery
- latencia y mantenimiento del módulo client-facing

### Files owned

- `src/views/greenhouse/GreenhouseProjectDetail.tsx`
- `src/views/greenhouse/GreenhouseProjects.tsx`
- `src/views/greenhouse/GreenhouseSprints.tsx`
- `src/views/greenhouse/GreenhouseSprintDetail.tsx`
- `src/lib/projects/get-project-detail.ts`
- `src/lib/projects/get-projects-overview.ts`
- `src/lib/dashboard/get-dashboard-overview.ts`
- `src/lib/delivery/**`
- `src/app/api/projects/**`
- `src/app/api/sprints/**`
- `docs/roadmap/GREENHOUSE_DELIVERY_CLIENT_RUNTIME_GAPS_V1.md`

## Current Repo State

### Ya existe

- una superficie Delivery client-facing utilizable con projects, sprints y dashboard
- stores separados que ya exponen buena parte del contexto visible al cliente
- componentes UI reutilizables para cards, tablas y mini-secciones ejecutivas

### Gap actual

- el detalle de proyecto y sprint depende de múltiples fetches y contratos heterogéneos
- nombres de KPI, conteos y estados vacíos pueden divergir entre surfaces
- falta un backbone reusable de lectura Delivery que permita evolucionar UX sin reabrir fan-out cada vez

## Scope

### Slice 1 - Contratos y stores reutilizables

- identificar payloads comunes entre dashboard, projects y sprints
- crear adapters o stores compartidos para project summary, team slice y sprint context
- unificar naming de KPIs, counts y metadata de scope

### Slice 2 - API consolidation

- reducir fetches paralelos innecesarios en views client-facing críticas
- exponer endpoints más compactos cuando hoy un caso de uso necesita varias llamadas
- asegurar coherencia entre responses de detalle y listados relacionados

### Slice 3 - Preparación para evolución futura

- dejar el read path apto para refresh reactivo o serving snapshots cuando aplique
- documentar qué contratos quedan estabilizados para nuevos consumers
- agregar pruebas sobre consistencia de payload entre surfaces clave

## Out of Scope

- migrar el sistema de trabajo operativo fuera de Notion
- rehacer completamente la UI Delivery
- introducir edición de tareas o sprints en el portal
- reemplazar los pipelines analíticos existentes por una nueva plataforma

## Acceptance Criteria

- [ ] existe una capa reutilizable de contratos o adapters para Delivery client-facing
- [ ] project detail y sprint detail reducen su fan-out o lo encapsulan detrás de contratos más compactos
- [ ] dashboard, projects y sprints comparten naming y metadata coherentes para KPIs y counts comunes
- [ ] el read path consolidado sigue respetando scope tenant/client y autorizaciones existentes
- [ ] la nueva capa queda preparada para integrarse con refresh reactivo cuando corresponda
- [ ] `pnpm lint` pasa sin nuevos errores
- [ ] `pnpm test` cubre coherencia de payload o adapters compartidos
- [ ] `npx tsc --noEmit` no introduce errores nuevos

## Verification

- `pnpm lint`
- `pnpm test`
- `npx tsc --noEmit`
- smoke manual sobre `/dashboard`, `/proyectos/[id]` y `/sprints/[id]` validando consistencia de payload visible y reducción de fetch fan-out
