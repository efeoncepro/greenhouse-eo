# TASK-047 - Delivery Project Scope Visibility Correction

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Diseño`
- Rank: `35`
- Domain: `delivery`
- GitHub Project: `Greenhouse Delivery`

## Summary

Corregir el contrato de listado de proyectos client-facing para que `/proyectos` represente el subset autorizado del cliente aunque existan proyectos sin tareas recientes, sin actividad visible todavía o con backlog vacío.

La task ataca un bug de inventario, no de autorización: hoy el proyecto puede ser visible según scope, pero desaparecer del listado porque el store arranca desde `task_summary` en vez de arrancar desde la entidad proyecto.

## Why This Task Exists

`src/lib/projects/get-projects-overview.ts` construye `items` a partir de resúmenes de tareas. Luego devuelve `scope.projectCount = items.length`.

Ese diseño introduce una distorsión visible:

- proyectos en scope pero sin tareas recientes no aparecen
- el conteo visible del cliente queda atado a actividad, no a inventario real
- `/proyectos` y otras superficies del portal pueden dar lecturas distintas del mismo subset autorizado

Esto erosiona la confianza de una de las superficies más sensibles del producto: el cliente asume que el inventario de proyectos refleja su espacio, no solo el trabajo activo de esta semana.

## Goal

- Separar inventario de proyectos autorizados de actividad de tareas
- Garantizar que `/proyectos` muestre proyectos en scope aunque no tengan tareas activas
- Alinear `projectCount`, filtros y empty states con el scope canónico del tenant
- Dejar base reusable para surfaces que dependan del mismo inventario

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/roadmap/GREENHOUSE_DELIVERY_CLIENT_RUNTIME_GAPS_V1.md`

Reglas obligatorias:

- el inventario visible de entidades debe salir del scope canónico del tenant, no de actividad accidental
- tareas, comentarios o review pressure pueden enriquecer una fila de proyecto, pero no decidir su existencia en el listado
- la corrección no debe debilitar las guardas actuales de autorización por proyecto

## Dependencies & Impact

### Depends on

- `src/lib/projects/get-projects-overview.ts`
- `src/app/api/projects/route.ts`
- `src/views/greenhouse/GreenhouseProjects.tsx`
- `src/lib/auth/require-client-tenant-context.ts`
- `src/lib/projects/can-access-project.ts`
- `docs/roadmap/GREENHOUSE_DELIVERY_CLIENT_RUNTIME_GAPS_V1.md`

### Impacts to

- `TASK-009 - Greenhouse Home Nexa`
- `TASK-014 - Projects Account 360 Bridge`
- `TASK-048 - Delivery Sprint Runtime Completion`
- `TASK-049 - Delivery Client Runtime Consolidation`
- inventario visible en dashboard y surfaces client-facing que consuman project subsets

### Files owned

- `src/lib/projects/get-projects-overview.ts`
- `src/app/api/projects/route.ts`
- `src/views/greenhouse/GreenhouseProjects.tsx`
- `src/lib/dashboard/get-dashboard-overview.ts`
- `src/lib/projects/get-project-detail.ts`
- `docs/roadmap/GREENHOUSE_DELIVERY_CLIENT_RUNTIME_GAPS_V1.md`

## Current Repo State

### Ya existe

- el tenant context ya resuelve `clientId` y subset de proyectos
- hay guardas para validar acceso por proyecto
- existe un overview usable de proyectos para la UI client-facing

### Gap actual

- el listado depende de resúmenes de tareas para decidir qué proyecto existe
- el conteo visible puede subrepresentar el scope real del cliente
- faltan empty states y estados de proyecto sin actividad que representen correctamente la situación

## Scope

### Slice 1 - Contrato de inventario y conteo

- rediseñar `getProjectsOverview()` para arrancar desde el subset de proyectos autorizados
- separar campos de inventario de campos de actividad
- corregir `projectCount` y metadatos de scope

### Slice 2 - Enrichment de actividad sin borrar entidades

- mantener tareas, review pressure y salud operativa como enrichments opcionales
- definir fallbacks para proyectos con cero actividad reciente
- revisar ordenamiento y filtros para evitar que esos proyectos queden ocultos por defecto

### Slice 3 - UX y consistencia inter-superficie

- actualizar empty states y mensajes de `/proyectos`
- alinear conteos y subset visible con dashboard y detalle de organización cuando aplique
- cubrir el caso explícito de proyecto en scope sin tareas

## Out of Scope

- rediseñar todo el detalle de proyecto
- introducir edición de proyectos dentro del portal
- rehacer el bridge Organization -> Projects existente
- cambiar el modelo de autorización tenant/client

## Acceptance Criteria

- [ ] `/proyectos` lista proyectos en scope aunque no tengan tareas recientes
- [ ] `projectCount` deja de depender de `items.length` basados en activity-only
- [ ] los proyectos sin actividad tienen estado o empty state explícito, no desaparición silenciosa
- [ ] dashboard y demás surfaces no contradicen el conteo básico del subset visible
- [ ] `pnpm lint` pasa sin nuevos errores
- [ ] `pnpm test` cubre al menos el caso de proyecto visible sin tareas
- [ ] `npx tsc --noEmit` no introduce errores nuevos

## Verification

- `pnpm lint`
- `pnpm test`
- `npx tsc --noEmit`
- smoke manual sobre `/proyectos` con un tenant que tenga al menos un proyecto visible sin actividad reciente
