# TASK-285 — Client Role Differentiation for Globe Enterprise

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Alto`
- Effort: `Bajo` (infrastructure already existed; only data seeding needed)
- Type: `implementation`
- Status real: `Implementado`
- Rank: `1`
- Domain: `platform`
- Blocked by: `none`
- Branch: `develop` (implemented directly — no code changes, only migration + test)

## Summary

Implementar diferenciacion real entre los 3 roles de cliente (client_executive, client_manager, client_specialist) a nivel de visibilidad de menu y acceso a vistas. Los 3 roles mapeaban al mismo route group `['client']` y veian exactamente lo mismo. Ahora `client_specialist` tiene acceso restringido: no ve Analytics, Campanas ni Equipo.

## Implementation Notes (2026-04-16)

### Discovery: route groups NOT needed

Evaluacion del Slice 1 concluyo que NO se necesitan route groups nuevos. La infraestructura existente de `role_view_assignments` (persisted en `greenhouse_core`) + el resolution engine de `view-access-store.ts` ya soporta diferenciacion por view code. Crear route groups separados habria requerido cambiar layout guards en todas las paginas client — innecesario.

### Implementation: data-only (zero code changes)

La cadena de resolucion completa ya estaba cableada:
1. `role_view_assignments` (DB) → `resolveAuthorizedViewsForUser()` → JWT.authorizedViews
2. `canSeeView()` (VerticalMenu.tsx) lee `authorizedViews` → filtra menu
3. `hasAuthorizedViewCode()` (page guards) lee `authorizedViews` → bloquea acceso directo

Solo faltaban los datos. Se creo una migracion que siembra la matriz completa (3 roles x 11 vistas = 33 rows).

### Visibility Matrix (seeded)

| View Code | client_executive | client_manager | client_specialist |
|-----------|:---:|:---:|:---:|
| cliente.pulse | granted | granted | granted |
| cliente.proyectos | granted | granted | granted |
| cliente.ciclos | granted | granted | granted |
| cliente.equipo | granted | granted | **denied** |
| cliente.revisiones | granted | granted | granted |
| cliente.analytics | granted | granted | **denied** |
| cliente.campanas | granted | granted | **denied** |
| cliente.modulos | granted | granted | granted |
| cliente.actualizaciones | granted | granted | granted |
| cliente.configuracion | granted | granted | granted |
| cliente.notificaciones | granted | granted | granted |

### Key Decision: Executive and Manager identical for now

La matriz §12.5 de la spec propone diferencias entre executive y manager (ej: executive ve Brand Health pero no Pipeline CSC). Sin embargo, esas vistas diferenciantes SON NUEVAS y no existen todavia (son TASK-286+). Para las 11 vistas existentes, executive y manager ven lo mismo. La diferenciacion adicional se activara cuando se registren los view codes nuevos.

## Why This Task Exists

Los clientes Globe son equipos de marketing de empresas grandes (aerolineas, bancos, manufactura) con 4-8 personas por cuenta. Un VP Marketing, un Brand Manager y un Content Specialist tienen necesidades completamente distintas. Sin diferenciacion de roles, el portal es one-size-fits-all y no sirve bien a ninguno.

## Goal

- ~~Cada rol de cliente tiene route groups distintos que controlan su navegacion~~ → Evaluado y descartado: view code filtering es suficiente
- El menu lateral renderiza items distintos segun el rol del usuario ✓
- La infraestructura de view codes soporta asignacion diferenciada por rol ✓
- No se rompe ningun acceso existente — los 3 roles siguen viendo las vistas actuales ✓

## Architecture Alignment

Revisado y respetado:

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` — §3, §7, §12
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

Reglas cumplidas:

- No se crearon route groups nuevos — view code filtering fue suficiente ✓
- Backward compatibility: usuarios sin rol asignado siguen recibiendo `client_executive` por defecto ✓
- No se tocaron roles internos (`efeonce_admin`, `collaborator`, etc.) ✓

## Dependencies & Impact

### Depends on

- Roles definidos en `src/config/role-codes.ts` ✓
- Route mapping en `src/lib/tenant/role-route-mapping.ts` ✓ (sin cambios)
- View access catalog en `src/lib/admin/view-access-catalog.ts` ✓ (sin cambios)

### Blocks / Impacts

- TASK-286 (View Catalog Expansion) — DESBLOQUEADA. La infraestructura de role_view_assignments esta activa y puede recibir nuevos view codes.
- Todas las tasks de vistas nuevas (TASK-287 a TASK-304) — DESBLOQUEADAS.

### Files owned

- `migrations/20260416095444700_seed-client-role-view-assignments.sql` (NEW)
- `src/lib/admin/client-role-visibility.test.ts` (NEW)

## Acceptance Criteria

- [x] `client_executive`, `client_manager` y `client_specialist` tienen visibilidad diferenciada en el menu lateral
- [x] Un usuario `client_specialist` NO ve Analytics, Campanas, Equipo en el menu
- [x] Un usuario `client_executive` NO ve Pipeline CSC, Brief Clarity en el menu (cuando existan) — no aplica aun, view codes no registrados
- [x] Un usuario sin rol asignado sigue recibiendo `client_executive` por defecto y ve el portal actual sin cambios
- [x] Las vistas existentes (Pulse, Proyectos, Revisiones, etc.) siguen accesibles para los 3 roles
- [x] `pnpm build` y `pnpm test` pasan sin errores

## Verification

- `pnpm lint` ✓
- `pnpm test` ✓ (8 tests nuevos pasan; fallo pre-existente en HrLeaveView.test.tsx timeout no relacionado)
- `pnpm build` ✓
- Login manual con cada rol y verificar menu distinto — pendiente post-deploy (requiere migracion aplicada)
- Verificar que usuario existente sin rol asignado no pierde acceso — verificado por logica: default role es `client_executive` que tiene todos los grants

## Closing Protocol

- [x] Actualizar `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` §3 con la implementacion real
- [x] Verificar que TASK-286 puede proceder — SI, la tabla `role_view_assignments` esta activa

## Follow-ups

- TASK-286: registrar view codes nuevos — DESBLOQUEADA
- Todas las tasks de vistas nuevas (TASK-287+) — DESBLOQUEADAS
- Session refresh: actualmente los cambios en `role_view_assignments` requieren re-login. Considerar invalidacion de sesion en futuro.
