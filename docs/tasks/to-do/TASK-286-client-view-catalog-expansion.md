# TASK-286 — Client View Catalog Expansion

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `2`
- Domain: `platform`
- Blocked by: `TASK-285`
- Branch: `task/TASK-286-client-view-catalog-expansion`

## Summary

Registrar los 10 view codes nuevos del portal cliente enterprise en el catalogo de vistas y configurar las asignaciones por rol. Hoy hay 11 view codes `cliente.*`. Despues de esta task habra 21.

## Why This Task Exists

Las vistas nuevas propuestas en §13.1 del doc de arquitectura necesitan view codes registrados para que el sistema de autorizacion y el menu las reconozcan. Sin esto, las paginas no pueden protegerse por rol ni aparecer en el menu.

## Goal

- 10 view codes nuevos registrados en `view-access-catalog.ts`
- Cada view code asignado a los roles correctos segun la matriz de §12.5
- Menu items nuevos configurados (con graceful degradation si la pagina no existe aun)

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` — §4, §12.5, §13.1
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

Reglas obligatorias:

- Usar la seccion `cliente` existente en `GOVERNANCE_SECTIONS`
- Mantener el accent color `success` (verde) para la seccion cliente
- Cada view code debe tener: viewCode, section, label, description, routePath, routeGroup

## Dependencies & Impact

### Depends on

- TASK-285 (role differentiation) — los route groups deben estar diferenciados
- View catalog en `src/lib/admin/view-access-catalog.ts`

### Blocks / Impacts

- Todas las tasks de vistas nuevas (TASK-287 a TASK-304) — necesitan el view code registrado

### Files owned

- `src/lib/admin/view-access-catalog.ts` (seccion cliente)

## Current Repo State

### Already exists

- 11 view codes `cliente.*` registrados (L451-537 de view-access-catalog.ts)
- Seccion `cliente` en `GOVERNANCE_SECTIONS`
- Pattern de registro establecido

### Gap

- Faltan 10 view codes: `cliente.revenue_enabled`, `cliente.brand_health`, `cliente.qbr`, `cliente.pipeline`, `cliente.brief_clarity`, `cliente.sla`, `cliente.reportes`, `cliente.mis_revisiones`, `cliente.asset_tracker`, `cliente.mi_proyecto`

## Scope

### Slice 1 — Registrar view codes

Agregar al array `VIEW_REGISTRY` los 10 view codes nuevos:

| View Code | Label | Ruta | Route Group |
|-----------|-------|------|-------------|
| `cliente.revenue_enabled` | Revenue Enabled | `/revenue-enabled` | `client` |
| `cliente.brand_health` | Brand Health | `/brand-health` | `client` |
| `cliente.qbr` | Executive Summary | `/qbr` | `client` |
| `cliente.pipeline` | Pipeline | `/pipeline` | `client` |
| `cliente.brief_clarity` | Brief Clarity | `/brief-clarity` | `client` |
| `cliente.sla` | SLA & Performance | `/sla` | `client` |
| `cliente.reportes` | Reportes | `/reports` | `client` |
| `cliente.mis_revisiones` | Mis Revisiones | `/my-reviews` | `client` |
| `cliente.asset_tracker` | Asset Tracker | `/asset-tracker` | `client` |
| `cliente.mi_proyecto` | Mi Proyecto | `/my-project` | `client` |

### Slice 2 — Configurar role-view assignments

Configurar en view-access-store o via fallback que cada rol vea los view codes correctos segun §12.5.

### Slice 3 — Agregar menu items

Agregar los items nuevos al menu lateral en `VerticalMenu.tsx` con `canSeeView()` checks. Las paginas no existen aun — el menu solo mostrara items cuya pagina este implementada (graceful degradation via check de ruta existente o feature flag).

## Out of Scope

- Crear las paginas de las vistas (cada una es una task separada TASK-287+)
- Crear APIs nuevas
- Cambiar el modelo de datos de view access

## Acceptance Criteria

- [ ] 21 view codes `cliente.*` registrados en `view-access-catalog.ts`
- [ ] Cada view code tiene label, description, routePath y routeGroup correctos
- [ ] `pnpm build` pasa sin errores
- [ ] View codes nuevos aparecen en Admin Center > Governance > View Access (si existe la UI)

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`

## Closing Protocol

- [ ] Actualizar §4 del doc de arquitectura con los 21 view codes

## Follow-ups

- Cada task de vista nueva (TASK-287 a TASK-304) implementa la pagina del view code
