# TASK-1070 — Design System fuera del Admin Center + acceso colaboradores

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `—`
- Status real: `Shipped a develop (2026-06-10, commit 814f770f0). Migración additive-only aplicada al Cloud SQL compartido (prod-safe). Production rollout via release train normal; único follow-up = TASK-1071 cleanup (revoke legacy post-deploy).`

## Problem

El Design System (catálogo AXIS: tokens, primitives, patrones, labs) vivía bajo
`/admin/design-system`, gateado por el viewCode `administracion.design_system`
(sembrado solo a roles internos, NUNCA `client_*`). Pero el Design System **no es
dominio del Admin Center**: es un recurso interno transversal que cualquier persona
que construye o consume UI debe poder ver (incluidos los `collaborator`, que no
tienen route group `internal` ni pasan por el menú de admin).

El operador pidió: (1) sacarlo del menú del Admin Center, (2) ubicarlo como surface
propia accesible fuera de `/admin`, y (3) **darle acceso a los colaboradores**.

## Solution

1. **Mover la ruta** `src/app/(dashboard)/admin/design-system/**` →
   `src/app/(dashboard)/design-system/**` (git mv, ~21 `page.tsx` + layout).
   Las **views** quedan en `src/views/greenhouse/admin/design-system/` (path interno,
   no afecta la URL ni el dominio funcional — solo el código fuente).
2. **Nuevo viewCode canónico** `plataforma.design_system` (sección `plataforma`,
   route_group `internal`, route_path `/design-system`) reemplaza
   `administracion.design_system`. Migración seed (View Registry Governance Pattern
   TASK-827) que lo siembra + lo concede a los **10 roles internos** (9 funcionales +
   `collaborator`). NUNCA `client_*`.
3. **Guard del layout** `design-system/layout.tsx`: autoriza por
   `plataforma.design_system` con fallback `tenantType === 'efeonce_internal'` +
   redirect defensivo si `tenantType === 'client'` → `/401`.
4. **Navegación**: removido de la sección Platform del Admin Center; agregado como
   ítem standalone `/design-system` (icono `tabler-palette`) **después de ambas ramas
   de portal** en `VerticalMenu`, porque los colaboradores (`isMyUser`) NO son
   `isInternalPortalUser` → necesitan el ítem fuera de las ramas internas/admin.
   Gateado por `canSeeView('plataforma.design_system')`.
5. **Breadcrumb root** del `DesignSystemBreadcrumbShell`: de `Admin → /admin` a
   `Greenhouse → /home`.
6. **Catálogo de gobernanza** (`view-access-catalog.ts`): nueva `GovernanceSection`
   `plataforma`; el design_system entry apunta al viewCode/section/routePath nuevos.
   Iconos de sección agregados en CommandPalette + search.

## Deploy ordering (shared Cloud SQL)

El Cloud SQL `greenhouse-pg-dev` es compartido por todos los runtimes. La migración
es **additive-only**: siembra el viewCode nuevo + grants, y **NO revoca** el legacy
`administracion.design_system` (que produciría 401 en producción —código viejo, ruta
`/admin/design-system` aún viva— hasta que deploye el código nuevo). El legacy queda
como dead-weight inofensivo; un **follow-up cleanup migration revoca el legacy DESPUÉS
de que este PR llegue a producción** (mirror TASK-991).

## Dependencies & Impact

- **Depende de:** View Registry Governance Pattern (TASK-827), viewCode model
  (TASK-1034 para el precedente `/admin/design-system/colors`).
- **Impacta a:** cualquier referencia futura a `/admin/design-system` o
  `administracion.design_system` debe usar `/design-system` /
  `plataforma.design_system`. Follow-up: cleanup migration legacy revoke post-deploy.
- **Archivos owned:**
  - `migrations/20260610095101532_task-1070-design-system-out-of-admin-collaborator-access.sql`
  - `src/app/(dashboard)/design-system/**`
  - `src/views/greenhouse/admin/design-system/DesignSystemBreadcrumbShell.tsx`
  - `src/lib/admin/view-access-catalog.ts` (sección `plataforma`)
  - `src/components/layout/vertical/VerticalMenu.tsx` (ítem standalone)
  - `src/components/greenhouse/CommandPalette/index.tsx` + `src/components/layout/shared/search/index.tsx` (icono sección)

## Verification

- `pnpm tsc --noEmit` → 0 source errors.
- `pnpm lint` (full) verde.
- `pnpm build` verde.
- `pnpm route-reachability-gate` → 0 orphans.
- Migración aplicada (anti pre-up-marker: ≥10 grants incl `collaborator`).
- GVC: colaborador (`agent-collaborator@greenhouse.efeonce.org`) ve el ítem
  `/design-system` en el nav y accede a la surface (no vía `/admin`).

## Follow-up

- **TASK-1071 (cleanup):** migración que revoca `administracion.design_system`
  (granted=FALSE + active=FALSE) DESPUÉS de que este PR llegue a producción.
- Rol `DESIGNER` futuro (operador): podrá restringir el grant de `collaborator` a
  designers — el modelo viewCode lo hace reversible flipeando un grant.
