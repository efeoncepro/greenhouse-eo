## Delta 2026-04-17 — implicancias si se implementa (alineación con entitlements)

Esta task tiene decisión pendiente (implementar vs eliminar). Si se implementa, aplica el contrato de capabilities de TASK-286:

- **View code existente:** `cliente.actualizaciones` (si se decide mantener y llenar con contenido).
- **Capability requerida:** declarar `client_portal.updates` en `entitlements-catalog.ts` con:
  - `module: 'client_portal'`
  - `actions: ['view']` (read-only feed)
  - `defaultScope: 'organization'`
- **Binding:** agregar `cliente.actualizaciones → client_portal.updates` en `entitlement-view-map.ts`.
- **Role defaults:** incluir en `role_entitlement_defaults` para roles cliente (default: todos los roles cliente tienen `view` del feed).
- **Guard de página:** `hasAuthorizedViewCode(tenant, 'cliente.actualizaciones')` + `can(tenant, 'client_portal.updates', 'view', 'organization')`.

Si se decide eliminar:

- Remover `cliente.actualizaciones` de `view-access-catalog.ts`.
- Remover cualquier referencia en `entitlement-view-map.ts` si existe.
- Remover item del menú.
- Documentar la decisión en el cierre.

**Ref canónica:** `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`.

# TASK-294 — Novedades: Implementar o Eliminar

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `10`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-294-novedades-implementation`

## Summary

La pagina de Novedades (`/updates`) es un placeholder vacio: icono + "No hay actualizaciones pendientes". En un portal enterprise, una pagina vacia resta credibilidad. Implementar con contenido real (comunicaciones de la agencia, hitos, cambios de equipo) o eliminar del menu.

## Why This Task Exists

Un Marketing Director de banco que entra al portal y ve "No hay actualizaciones" piensa que la herramienta esta muerta. Hoy no hay backend, no hay API, no hay modelo de datos. Es una pagina que promete algo que no existe.

## Goal

- Decidir: implementar con contenido minimo o eliminar del menu
- Si se implementa: feed de comunicaciones con tipos de contenido (hito, cambio de equipo, actualizacion de plataforma)
- Si se elimina: remover del menu y del catalogo de vistas

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` — §5.2, §14.2 M8

## Dependencies & Impact

### Depends on

- Ninguna dependency tecnica directa

### Blocks / Impacts

- Ninguno

### Files owned

- `src/app/(dashboard)/updates/page.tsx`
- `src/app/api/updates/route.ts` (si se implementa)

## Current Repo State

### Already exists

- Pagina placeholder en `/updates` con empty state
- View code `cliente.actualizaciones` registrado
- Menu item en VerticalMenu.tsx

### Gap

- No hay backend ni API
- No hay modelo de datos para updates/comunicaciones
- No hay content management

## Scope

### Slice 1 — Decision y diseno

- Evaluar: hay contenido que publicar regularmente? (hitos de cuenta, cambios de equipo, changelog)
- Si SI: disenar modelo de datos minimo (tabla `client_updates` o similar)
- Si NO: eliminar del menu y documentar la decision

### Slice 2 — Implementacion (si se decide implementar)

- Crear tabla PG: `greenhouse_core.client_updates` (id, client_id, type, title, body, created_at, author)
- API: `/api/updates/route.ts` con guard de tenant
- Feed cronologico con tipos: `milestone`, `team_change`, `platform_update`
- Capacidad de publicar updates desde Admin Center (basico)

## Out of Scope

- CMS completo
- Rich text editor
- Notificaciones push de nuevos updates

## Acceptance Criteria

- [ ] La pagina de Novedades muestra contenido real O no aparece en el menu
- [ ] Si se implementa: feed con al menos 3 tipos de contenido
- [ ] Si se elimina: view code y menu item removidos limpiamente
- [ ] `pnpm build` pasa

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`

## Closing Protocol

- [ ] Documentar la decision tomada en el doc de arquitectura

## Open Questions

- Hay contenido recurrente que justifique implementar? O mejor eliminar y enfocar esfuerzo en vistas de mayor impacto?
