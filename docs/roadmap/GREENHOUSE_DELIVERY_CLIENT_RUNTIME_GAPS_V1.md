# GREENHOUSE Delivery Client Runtime Gaps v1

## Objetivo

Documentar las brechas reales del runtime client-facing de Delivery a partir del codebase actual, separando con claridad:

- qué partes de Delivery ya son una superficie usable
- qué partes siguen apoyadas en métricas, joins o contratos de lectura frágiles
- qué lanes concretas deben abrirse para cerrar esos gaps sin mezclar producto, data model y refactor en una sola task

Este documento no redefine la arquitectura general del portal. Su propósito es fijar un backlog ejecutable y coherente para la capa que hoy ve el cliente en `/dashboard`, `/proyectos` y `/sprints`.

## Contexto validado en runtime

El codebase ya tiene una superficie Delivery real y visible para clientes:

- `src/views/greenhouse/GreenhouseProjects.tsx`
- `src/views/greenhouse/GreenhouseProjectDetail.tsx`
- `src/views/greenhouse/GreenhouseSprints.tsx`
- `src/views/greenhouse/GreenhouseSprintDetail.tsx`
- `src/lib/projects/get-projects-overview.ts`
- `src/lib/projects/get-project-detail.ts`
- `src/lib/dashboard/get-dashboard-overview.ts`
- `src/lib/team-queries.ts`

También existe una capa madura para métricas de performance operativa en ICO:

- `src/lib/ico-engine/read-metrics.ts`
- `src/lib/ico-engine/schema.ts`
- `src/app/api/ico-engine/metrics/project/route.ts`

Conclusión: el problema de Delivery no es ausencia de producto, sino que la superficie client-facing todavía mezcla métricas de performance, señales workflow y contratos de lectura con niveles de madurez distintos.

## Metodología

Brechas derivadas de revisar:

- vistas client-facing en `src/views/greenhouse/**`
- rutas API activas en `src/app/api/projects/**` y `src/app/api/team/**`
- stores Delivery e ICO en `src/lib/**`
- reglas de scope tenant/client ya implementadas
- comportamiento observable de KPIs, conteos y placeholders a nivel de UX

## Matriz de brechas

| Gap                                                     | Evidencia en repo                                                                                                                                                             | Riesgo operativo                                                                                      | Cierre propuesto                                                                       |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Métricas de performance Delivery no cortadas a ICO      | `src/lib/team-queries.ts` calcula `avg_rpa` desde `frame_versions`; `/projects`, `/team`, `/sprints` no consumen de forma uniforme `metrics_by_project` o `metrics_by_member` | el cliente ve KPIs mal etiquetados o inconsistentes entre superficies                                 | cortar performance Delivery a ICO y fijar frontera `performance` vs `workflow`         |
| Visibilidad de proyectos ligada a presencia de tareas   | `src/lib/projects/get-projects-overview.ts` deriva `items` desde `task_summary` y devuelve `projectCount = items.length`                                                      | proyectos autorizados pueden desaparecer de `/proyectos` si aún no tienen tareas o actividad reciente | corregir el contrato de scope para que el inventario de proyectos no dependa de tareas |
| Sprint runtime incompleto para superficie client-facing | `src/views/greenhouse/GreenhouseSprints.tsx` depende de dashboard data y mantiene múltiples `EmptyState`; `GreenhouseSprintDetail.tsx` es demasiado delgado                   | la vista de sprint parece producto terminado pero opera como surface parcial                          | crear read model y contrato dedicados para sprints client-facing                       |
| Delivery client runtime sigue demasiado fragmentado     | `GreenhouseProjectDetail` hace fan-out a detalle, tasks y team; dashboard, projects y sprints usan stores heterogéneos                                                        | latencia variable, contratos inconsistentes y mayor costo para evolucionar UX                         | consolidar stores y APIs client-facing sobre contratos reutilizables                   |

## Gap 1 - Performance Delivery todavía no tiene una fuente única

### Evidencia

- `src/lib/team-queries.ts` publica `avg_rpa` calculado a partir de `frame_versions`
- `src/components/greenhouse/ProjectTeamSection.tsx` y `src/components/greenhouse/SprintTeamVelocitySection.tsx` renderizan ese valor como si fuera `RpA`
- `ICO Engine` ya expone `rpa`, `otd_pct`, `ftr_pct`, `cycle_time`, `throughput`, `pipeline_velocity` y `stuck_assets` a nivel proyecto y miembro

### Diagnóstico

Hoy Delivery mezcla dos familias de señales:

- performance operativa real: debe venir de ICO
- workflow/seguimiento: puede seguir viniendo de `delivery_tasks`, revisiones y presión operativa

Mientras esa frontera no quede cerrada, la capa client-facing seguirá mostrando números válidos en apariencia pero semánticamente incorrectos.

### Task derivada

- `TASK-046 - Delivery Performance Metrics ICO Cutover`

## Gap 2 - El inventario de proyectos no representa el scope real del cliente

### Evidencia

- `getProjectsOverview()` construye el listado a partir de resúmenes de tareas
- `scope.projectCount` depende de `items.length`
- otras superficies ya compensan mejor el conteo de proyectos usando scope explícito

### Diagnóstico

El problema no es de autorización sino de modelado del listado. Un proyecto puede estar dentro del subset visible del cliente y aun así no aparecer en `/proyectos` por falta de tareas recientes.

### Task derivada

- `TASK-047 - Delivery Project Scope Visibility Correction`

## Gap 3 - Sprints todavía no son una superficie vertical completa

### Evidencia

- la lista de sprints reutiliza data del dashboard en vez de un store dedicado
- la vista actual deja placeholders en burndown, historial y velocity context
- el detalle de sprint depende casi por completo de un solo bloque de equipo

### Diagnóstico

La experiencia actual sirve como vista preliminar, no como runtime maduro para una superficie que el cliente ya percibe como producto formal.

### Task derivada

- `TASK-048 - Delivery Sprint Runtime Completion`

## Gap 4 - Delivery client runtime sigue fragmentado entre stores y fetches

### Evidencia

- `GreenhouseProjectDetail` dispara varios fetches para un mismo caso de uso
- dashboard, projects y sprints usan contratos distintos aunque comparten semántica de project health, sprint context y team slices
- la evolución de UX exige coordinar demasiados stores en paralelo

### Diagnóstico

Aunque BigQuery siga siendo una parte válida del backend analítico de Delivery, la experiencia client-facing necesita contratos más compactos y reusables. El objetivo no es mover todo a Postgres, sino consolidar el read path visible al cliente.

### Task derivada

- `TASK-049 - Delivery Client Runtime Consolidation`

## Orden recomendado de cierre

1. `TASK-046` — fijar primero la semántica correcta de performance
2. `TASK-047` — corregir después el inventario visible del cliente
3. `TASK-048` — completar la superficie sprint sobre métricas y scope ya saneados
4. `TASK-049` — consolidar contracts, fan-out y fetch path con las reglas anteriores ya estabilizadas

## Relación con backlog existente

Estas brechas no reabren la arquitectura de `ICO`, `Projects Account 360 Bridge` o `Reactive Projection Refresh`, pero sí les agregan consumers client-facing más estrictos.

Las tasks derivadas interactúan especialmente con:

- `TASK-008 - Team Identity Capacity System`
- `TASK-009 - Greenhouse Home Nexa`
- `TASK-011 - ICO Person 360 Integration`
- `TASK-014 - Projects Account 360 Bridge`
- `TASK-020 - FrameIO BigQuery Analytics Pipeline`
- `TASK-045 - Reactive Projection Refresh`

## Regla operativa derivada

Para Delivery client-facing se debe respetar esta frontera:

- métricas de performance operativa: `ICO Engine`
- señales workflow y seguimiento: stores Delivery sobre tareas, revisiones, comentarios y bloqueos
- inventario de entidades visibles: scope canónico del tenant, no actividad accidental de tareas

Si una nueva surface Delivery mezcla esas tres capas sin declararlo explícitamente, el runtime vuelve a quedar ambiguo.
