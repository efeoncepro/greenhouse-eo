# TASK-285 — Client Role Differentiation for Globe Enterprise

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `1`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-285-client-role-differentiation`

## Summary

Implementar diferenciacion real entre los 3 roles de cliente (client_executive, client_manager, client_specialist) a nivel de route groups y visibilidad de menu. Hoy los 3 roles mapean al mismo route group `['client']` y ven exactamente lo mismo. Esta task habilita que cada rol vea un portal distinto por densidad de informacion.

## Why This Task Exists

Los clientes Globe son equipos de marketing de empresas grandes (aerolineas, bancos, manufactura) con 4-8 personas por cuenta. Un VP Marketing, un Brand Manager y un Content Specialist tienen necesidades completamente distintas. Sin diferenciacion de roles, el portal es one-size-fits-all y no sirve bien a ninguno.

## Goal

- Cada rol de cliente tiene route groups distintos que controlan su navegacion
- El menu lateral renderiza items distintos segun el rol del usuario
- La infraestructura de view codes soporta asignacion diferenciada por rol
- No se rompe ningun acceso existente — los 3 roles siguen viendo las vistas actuales

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` — §3, §7, §12
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

Reglas obligatorias:

- No crear route groups nuevos si se puede resolver con view code filtering — evaluar durante Discovery
- Mantener backward compatibility: usuarios sin rol asignado siguen recibiendo `client_executive` por defecto
- No tocar roles internos (`efeonce_admin`, `collaborator`, etc.)

## Dependencies & Impact

### Depends on

- Roles definidos en `src/config/role-codes.ts`
- Route mapping en `src/lib/tenant/role-route-mapping.ts`
- View access catalog en `src/lib/admin/view-access-catalog.ts`

### Blocks / Impacts

- TASK-286 (View Catalog Expansion) — depende de que los route groups esten diferenciados
- Todas las tasks de vistas nuevas (TASK-287 a TASK-304) dependen de esta infraestructura

### Files owned

- `src/lib/tenant/role-route-mapping.ts`
- `src/components/layout/vertical/VerticalMenu.tsx` (seccion client)

## Current Repo State

### Already exists

- 3 roles definidos en `src/config/role-codes.ts`: `client_executive`, `client_manager`, `client_specialist`
- Route group `'client'` asignado a los 3 roles en `src/lib/tenant/role-route-mapping.ts`
- Menu rendering con `canSeeView()` checks en `VerticalMenu.tsx` (L390-470)
- View access resolution con fallback por route group en `src/lib/admin/view-access-store.ts`
- `deriveRouteGroupsFromRoles()` y `deriveRouteGroupsForSingleRole()` funcionales

### Gap

- Los 3 roles mapean a `['client']` — no hay diferenciacion
- El menu no filtra por rol, solo por view code (que es el mismo para todos)
- No hay route groups especificos para executive/manager/specialist
- La matriz de visibilidad de §12.5 no esta implementada

## Scope

### Slice 1 — Route group differentiation

- Evaluar si se necesitan route groups nuevos (`client_executive`, `client_manager`, `client_specialist`) o si basta con diferenciar via view code assignments
- Actualizar `ROLE_ROUTE_GROUPS` en `role-route-mapping.ts`
- Asegurar que `deriveRouteGroupsFromRoles()` resuelve correctamente

### Slice 2 — Menu rendering por rol

- Actualizar `VerticalMenu.tsx` para renderizar items distintos segun `primaryRoleCode` o `routeGroups`
- Implementar la logica de §12.5: Executive ve 12 vistas, Manager ve 14, Specialist ve 9
- Mantener fallback: si un view code nuevo no existe aun, el item no se muestra (graceful degradation)

### Slice 3 — View code assignments por rol

- Configurar en `view-access-store.ts` las asignaciones por defecto de cada rol
- Asegurar que el fallback existente sigue funcionando para vistas actuales

## Out of Scope

- Crear las paginas de las vistas nuevas (eso es TASK-287+)
- Registrar los view codes nuevos en el catalogo (eso es TASK-286)
- Cambiar el modelo de datos de roles o crear roles nuevos
- Tocar la session/JWT — solo se modifica la resolucion de route groups y view access

## Acceptance Criteria

- [ ] `client_executive`, `client_manager` y `client_specialist` tienen visibilidad diferenciada en el menu lateral
- [ ] Un usuario `client_specialist` NO ve Analytics, Campanas, Equipo en el menu
- [ ] Un usuario `client_executive` NO ve Pipeline CSC, Brief Clarity en el menu (cuando existan)
- [ ] Un usuario sin rol asignado sigue recibiendo `client_executive` por defecto y ve el portal actual sin cambios
- [ ] Las vistas existentes (Pulse, Proyectos, Revisiones, etc.) siguen accesibles para los 3 roles
- [ ] `pnpm build` y `pnpm test` pasan sin errores

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- Login manual con cada rol y verificar menu distinto
- Verificar que usuario existente sin rol asignado no pierde acceso

## Closing Protocol

- [ ] Actualizar `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` §3 con la implementacion real
- [ ] Verificar que TASK-286 puede proceder

## Follow-ups

- TASK-286: registrar view codes nuevos
- Todas las tasks de vistas nuevas (TASK-287+)
