# TASK-140 - Admin Views Person-First Preview Cutover

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Diseño`
- Rank: `56`
- Domain: `admin / identity / access / ui`

## Summary

Migrar el selector y preview de `/admin/views` para que consuman identidad `person-first`, alineándose con el contrato canónico más amplio de `TASK-141`.

Esta task ya no define la política institucional completa. Toma esa política y la aterriza en el consumer concreto de `Admin Center > Vistas y acceso`.

## Why This Task Exists

Ya apareció una señal visible del problema en `/admin/views`:

- el selector de preview todavía nace desde una base `client_user-first`

Eso deja tres gaps:

- gap conceptual:
  - la pantalla sigue hablando de “usuario” donde el modelo real ya piensa en persona
- gap operativo:
  - una persona válida puede quedar fuera del preview aunque exista canónicamente
- gap de UX:
  - la lectura del panel no explica bien la diferencia entre persona y acceso portal

La task existe para corregir ese consumer sin reabrir `TASK-136`.

## Goal

- hacer que `/admin/views` previewee acceso desde persona canónica y no desde `client_users` como lista base
- distinguir claramente:
  - identidad humana
  - capacidad de acceso portal
  - faceta operativa (`member`, memberships, etc.)
- dejar explícito qué personas deben entrar al universo de preview y por qué
- mantener compatibilidad con `authorizedViews`, overrides y auditoría ya implementados

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

Reglas obligatorias:

- no tratar `client_user` como identidad humana raíz si ya existe modelo canónico de persona
- el preview de acceso debe representar una persona con acceso, no solo un principal técnico legado
- no duplicar identidad en tablas nuevas si el objeto ya existe
- el consumer debe seguir siendo compatible con `authorizedViews`, `view_code`, overrides y expiración

## Dependencies & Impact

### Depends on

- `TASK-141` - canonical person identity consumption
- `TASK-136` - gobernanza de vistas cerrada
- `TASK-134` - notification identity model hardening
- arquitectura de identidad y 360 ya vigente

### Impacts to

- `/admin/views`
- `Admin Center`
- helpers de access preview

### Files owned

- `src/lib/admin/get-admin-view-access-governance.ts`
- `src/lib/admin/get-admin-access-overview.ts`
- `src/lib/admin/view-access-store.ts`
- `src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx`
- `src/app/(dashboard)/admin/views/page.tsx`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `project_context.md`

## Current Repo State

### Ya existe

- `/admin/views` ya resuelve:
  - matrix por rol
  - overrides por usuario
  - expiración
  - auditoría
  - preview efectivo
- `authorizedViews` ya vive en sesión y runtime
- la arquitectura ya formaliza `view_code` como capa fina de acceso
- la arquitectura 360 ya deja claro que `client_users` no debe ser la identidad humana canónica
- la policy institucional transversal queda abierta en `TASK-141`

### Gap actual

- el selector de preview sigue naciendo desde `client_users`
- no está explicitado qué universo debe entrar al preview:
  - toda persona activa
  - toda persona con acceso portal
  - toda persona con membership relevante
- el copy y el modelo de la UI siguen hablando de “usuario” cuando el producto ya piensa en “persona”

## Scope

### Slice 1 - Contrato de persona previewable

- definir la regla canónica de quién entra al preview de acceso
- documentar si el universo es:
  - persona con acceso portal efectivo
  - persona con auth principal resoluble
  - persona activa con memberships y capacidad portal
- dejar explícito qué casos quedan fuera y por qué

### Slice 2 - Serving y resolución

- crear o ajustar un resolver de `previewable persons`
- desacoplar la lista base del preview respecto de `greenhouse.client_users`
- mantener resolución de:
  - `userId` cuando exista
  - `identityProfileId`
  - `memberId` / membership cuando aplique
  - `roleCodes`
  - `routeGroups`
  - `authorizedViews`

### Slice 3 - UI y UX

- actualizar `/admin/views` para que la superficie se entienda como preview de persona
- corregir labels/copy donde “usuario” ya no sea la entidad principal correcta
- mostrar con honestidad cuando una persona:
  - tiene acceso portal
  - no tiene principal activo
  - tiene memberships relevantes pero acceso incompleto

### Slice 4 - Compatibilidad y migración

- no romper overrides ya persistidos por `userId`
- mantener backward compatibility mientras exista capa híbrida
- documentar cómo conviven:
  - persona canónica
  - principal de acceso
  - overrides user-scoped

## Out of Scope

- rediseñar todo el modelo de auth del portal
- cambiar la semántica de `authorizedViews`
- reabrir `TASK-136`
- institucionalizar en esta misma task el contrato transversal completo de identidad
- introducir una nueva tabla de identidad si el modelo actual ya permite resolver la persona

## Acceptance Criteria

- [ ] existe una definición explícita y documentada de “persona previewable” para `/admin/views`
- [ ] `/admin/views` deja de depender conceptualmente de `client_users` como identidad raíz del preview
- [ ] el preview resuelve acceso efectivo sin perder compatibilidad con overrides user-scoped
- [ ] la UI distingue correctamente persona vs acceso portal cuando haga falta
- [ ] el copy de la superficie deja de inducir una lectura `client_user-first`

## Verification

- `pnpm exec eslint src/lib/admin/get-admin-view-access-governance.ts src/lib/admin/get-admin-access-overview.ts src/lib/admin/view-access-store.ts src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`
- validación manual en `/admin/views` con al menos:
  - una persona interna con acceso
  - una persona cliente con acceso
  - un caso borde donde la persona exista pero el principal portal esté incompleto o degradado

## Open Questions

- cuál es el universo correcto de preview:
  - todas las personas activas
  - todas las personas con acceso efectivo
  - todas las personas con principal resoluble
- si una persona existe canónicamente pero no tiene principal activo, ¿debe aparecer como previewable con estado degradado o quedar fuera?
- qué identificador debe ser la clave principal de la UI:
  - `identityProfileId`
  - `memberId`
  - `userId` con bridge hacia persona

## Follow-ups

- depender de `TASK-141` para cualquier extensión transversal adicional de la policy canónica
- evaluar si los overrides deben evolucionar en algún momento de `userId` a una capa más explícita de “persona con principal portal asociado”
