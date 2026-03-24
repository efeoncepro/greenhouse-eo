# CODEX_TASK_Projects_Account_360_Bridge_v1

## Summary

Conectar el módulo de Projects con el modelo Account 360 a través del puente Space-Notion existente, para que cada organización tenga visibilidad de sus proyectos activos, métricas de delivery, y health operativo directamente desde su ficha — cerrando la cadena Organization → Space → Notion Projects → Delivery Metrics.

## Why This Task Exists

El módulo `projects` opera aislado sobre BigQuery (`greenhouse_conformed.delivery_projects`, `notion_ops.proyectos`, `notion_ops.tareas`) sin saber en qué organización vive cada proyecto. Al mismo tiempo, Account 360 conoce sus Spaces y el bridge Space-Notion (`space_notion_sources`) ya mapea cada Space a sus Notion databases.

La cadena de relación completa existe conceptualmente:
```
Organization → Space (via spaces.organization_id)
    → SpaceNotionSource (via space_notion_sources.space_id)
        → Notion DB de proyectos (notion_db_proyectos)
            → delivery_projects (via project_source_id = Notion page ID)
                → Tasks, Sprints, Métricas
```

Pero nadie recorre esta cadena completa. El módulo de proyectos recibe `clientId` y `projectIds[]` como input (via `getProjectsOverview(scope)`), no `organizationId` ni `spaceId`. Y la vista de organización no muestra proyectos.

Esta task cierra el gap para que:
- Desde una organización puedas ver todos sus proyectos con health
- Desde un proyecto puedas saber a qué organización pertenece
- El Organization Economics Dashboard pueda correlacionar revenue con delivery per project

## Goal

1. **Resolver la cadena Organization → Projects** de forma programática
2. **Agregar un tab/section de Projects** en la vista de detalle de organización
3. **Enriquecer `organization_360`** con proyecto counts y health summary
4. **Crear un API endpoint** que retorne proyectos por organización con métricas resumidas

## Dependencies & Impact

### Depends on
- `src/lib/space-notion/space-notion-store.ts` — `getSpaceNotionSource()`, `getSpaceNotionSourceByClientId()`
- `src/lib/projects/get-projects-overview.ts` — `getProjectsOverview(scope)`
- `src/lib/account-360/organization-store.ts` — `getOrganizationDetail()` retorna spaces con spaceId/clientId
- `scripts/setup-postgres-organization-360.sql` — vista serving
- `greenhouse_core.space_notion_sources` — bridge Space → Notion
- Task completada: `Greenhouse_Account_360_Object_Model_v1.md`

### Impacts to
- `CODEX_TASK_Organization_Economics_Dashboard_v1.md` — projects per org es input para correlación revenue × delivery
- `CODEX_TASK_ICO_Person_360_Integration_v1.md` — projects per org permite drill-down desde org economics a ICO per project
- `CODEX_TASK_Campaign_360_v2.md` — Campaign necesita object model Space → Projects; esta task establece la resolución
- `CODEX_TASK_FrameIO_BigQuery_Analytics_Pipeline_v2.md` — delivery assets per project quedan accesibles desde org context

### Files owned
- `src/lib/account-360/organization-projects.ts`
- `src/app/api/organizations/[id]/projects/route.ts`
- `src/views/greenhouse/organizations/tabs/OrganizationProjectsTab.tsx`
- `src/views/greenhouse/organizations/components/ProjectHealthCard.tsx`
- Modificación: `scripts/setup-postgres-organization-360.sql` (agregar project counts)
- Modificación: `src/views/greenhouse/organizations/OrganizationTabs.tsx` (registrar tab)

## Current Repo State

### Ya existe
- **Space-Notion bridge:** `space_notion_sources` tabla con `space_id, notion_db_proyectos, notion_db_tareas, notion_db_sprints, notion_db_revisiones, notion_workspace_id`. Store en `src/lib/space-notion/space-notion-store.ts` con funciones `getSpaceNotionSource(spaceId)` y `getSpaceNotionSourceByClientId(clientId)`.
- **Organization → Spaces:** `getOrganizationDetail()` retorna `spaces[]` con `spaceId, spaceName, spaceType, clientId, status`.
- **Projects overview:** `getProjectsOverview(scope)` en `src/lib/projects/get-projects-overview.ts` (líneas 102-209). Acepta `clientId` y `projectIds[]`. Retorna proyectos con name, status, totalTasks, activeTasks, completedTasks, avgRpa, openReviewItems, pageUrl.
- **Projects detail:** `getProjectDetail()` en `src/lib/projects/get-project-detail.ts` con sprint breakdown, task RPA, review load.
- **Organization tabs:** 5 tabs actuales en `OrganizationTabs.tsx`: overview, people, finance, ico, integrations. No hay tab de projects.
- **Organization 360 view:** Agrega spaces y people pero no projects.

### No existe aún
- Función que resuelva Organization → Spaces → SpaceNotionSources → Projects (cadena completa)
- API endpoint `/api/organizations/[id]/projects` que retorne proyectos por org
- Tab de Projects en la vista de organización
- Project counts en `organization_360` serving view
- Breadcrumb de pertenencia (project → space → organization) en vista de proyecto individual

## Implementation Plan

### Slice 1 — Resolución Organization → Projects (Backend)

1. **Crear `src/lib/account-360/organization-projects.ts`:**
   ```typescript
   export async function getOrganizationProjects(
     organizationId: string,
     options?: { year?: number; month?: number }
   ): Promise<OrganizationProjectsSummary> {
     // 1. Get org spaces: SELECT space_id, client_id FROM spaces WHERE organization_id = $1
     // 2. For each space: getSpaceNotionSource(spaceId) → notion_db_proyectos
     // 3. Resolve project IDs from delivery_projects WHERE source matches
     // 4. getProjectsOverview({ clientId, projectIds }) for each space
     // 5. Aggregate: totalProjects, activeProjects, avgRpa, avgOtd, health score
     return { spaces: [...], totals: { ... } }
   }
   ```

2. **Tipo de retorno:**
   ```typescript
   type OrganizationProjectsSummary = {
     spaces: Array<{
       spaceId: string;
       spaceName: string;
       projects: ProjectOverview[];
       healthScore: number; // 0-100 composite
     }>;
     totals: {
       totalProjects: number;
       activeProjects: number;
       totalTasks: number;
       activeTasks: number;
       avgRpa: number;
       avgOtd: number;
       overallHealth: 'green' | 'yellow' | 'red';
     };
   }
   ```

3. **API route:** `GET /api/organizations/[id]/projects?year=&month=`

### Slice 2 — Serving View Enhancement

1. **Agregar project counts a `organization_360`** via subquery lateral:
   ```sql
   -- Count projects per space via space_notion_sources + delivery_projects
   LATERAL (
     SELECT COUNT(*) as project_count,
            COUNT(*) FILTER (WHERE status = 'active') as active_project_count
     FROM greenhouse_delivery.projects p
     JOIN greenhouse_core.space_notion_sources sns ON ...
     WHERE sns.space_id = s.space_id
   ) proj ON TRUE
   ```

2. **Agregar a output de organization_360:** `total_projects, active_projects`

### Slice 3 — UI

1. **Crear `OrganizationProjectsTab.tsx`:**
   - Tabla de proyectos agrupados por Space
   - Por proyecto: nombre, status, # tasks activos, RPA promedio, health badge
   - Summary row por space con totals

2. **Crear `ProjectHealthCard.tsx`:**
   - Mini-card reutilizable: nombre, progress bar, RPA gauge, task count

3. **Registrar tab** en `OrganizationTabs.tsx` entre Finance e ICO.

## Acceptance Criteria

- [ ] Cadena Organization → Space → SpaceNotionSource → Projects resuelta programáticamente
- [ ] API retorna proyectos por organización agrupados por space
- [ ] Tab de Projects visible en ficha de organización
- [ ] `organization_360` incluye project counts
- [ ] Funciona para organizaciones con múltiples spaces
- [ ] Funciona para spaces sin Notion source (muestra "sin proyectos configurados")
- [ ] `pnpm lint` pasa sin nuevos errores
- [ ] Al menos 3 tests unitarios para la resolución de cadena
