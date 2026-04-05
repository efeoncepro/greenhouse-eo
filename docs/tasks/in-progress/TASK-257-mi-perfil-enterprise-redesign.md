# TASK-257 — Mi Perfil: enterprise redesign con patron Vuexy User View

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Implementacion`
- Rank: `TBD`
- Domain: `ui`, `identity`
- Blocked by: `none`
- Branch: `task/TASK-257-mi-perfil-enterprise-redesign`
- Legacy ID: —
- GitHub Issue: —

## Summary

Mi Perfil (`/my/profile`) funciona correctamente (TASK-255 + TASK-256 + ISSUE-014 cerraron datos, avatar, identity link y person_360 v2), pero la UI es un layout flat de 3 cards sin tabs, sin stats, sin timeline y sin acciones. Vuexy full-version incluye un patron enterprise de User View (`apps/user/view`) con sidebar profile + tabs (Overview, Security, Billing, Notifications, Connections) que es directamente reutilizable. Esta task redisena Mi Perfil usando ese patron adaptado al dominio de Greenhouse.

## Why This Task Exists

1. **Mi Perfil es la puerta de entrada a "Mi Ficha"**: modulos como Mi Nomina, Mis Permisos, Mi Delivery, Mi Desempeno, Mis Asignaciones dependeran de esta vista como hub central del colaborador. El layout actual (3 cards flat) no escala para agregar secciones.

2. **El patron ya existe en Vuexy**: El full-version de Vuexy (`apps/user/view`) tiene el layout sidebar + tabs con componentes ya migrados al starter-kit (`CustomAvatar`, `CustomTabList`, `CustomTextField`, `TablePaginationComponent`, `OpenDialogOnElementClick`). No hay que inventar un patron — hay que adaptarlo.

3. **Consistencia con Person Detail View**: La vista de Personas (`/people/:slug`) ya fue rediseñada como patron enterprise (TASK-168, documentado en `GREENHOUSE_UI_PLATFORM_V1.md`). Mi Perfil debe seguir un patron coherente pero adaptado a self-service (sin admin actions, con tabs de "Mi *").

## Goal

- Mi Perfil usa layout sidebar (4 cols) + tabs (8 cols) siguiendo el patron Vuexy User View
- Sidebar muestra: avatar grande (120px), nombre, cargo, email, telefono, stats KPI (Spaces activos, Sistemas vinculados)
- Tabs: Resumen (datos profesionales + sistemas vinculados), Seguridad (proximas tasks), Mi Delivery (proximo), Mi Nomina (proximo)
- Los tabs usan `dynamic()` imports para lazy loading
- Componentes reutilizados de Vuexy/core: `CustomAvatar`, `CustomTabList`, `CustomTextField`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — patrones UI canonicos, Person Detail View pattern, componentes disponibles
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — Entra sync pipeline, canonical_source_system()
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md` — person_360 VIEW v2 con resolved fields

Reglas obligatorias:

- `person_360` es la fuente canonica para datos de perfil completo
- Fallback a sesion (`toPersonProfileSummaryFromSession`) si person_360 no tiene fila
- Avatar se sirve via `/api/media/users/{id}/avatar` (GCS proxy)
- `linked_systems` ya viene normalizado de la DB (`microsoft`, `hubspot`, `notion`) via `canonical_source_system()`
- Usar componentes de `@core` ya migrados, no crear wrappers propios

## Normative Docs

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — Delta "Vuexy User View Pattern" (nuevo, creado junto con esta task)
- `docs/tasks/complete/TASK-255-mi-perfil-identity-chain-fix.md` — route resiliente con fallback
- `docs/tasks/complete/TASK-256-entra-profile-completeness-avatar-identity-link.md` — avatar sync + identity link

## Dependencies & Impact

### Depends on

- TASK-255 completada — route Mi Perfil con fallback a sesion
- TASK-256 completada — avatar sync, identity link, person_360 v2
- `PersonProfileSummary` tipo ya existente en `src/types/person-360.ts`
- `GET /api/my/profile` ya retorna datos completos

### Blocks / Impacts

- Mi Nomina self-service — podra ser un tab de esta vista
- Mi Delivery — podra ser un tab de esta vista
- Mis Permisos — podra ser un tab de esta vista

### Files owned

- `src/views/greenhouse/my/MyProfileView.tsx` — rewrite completo
- `src/views/greenhouse/my/my-profile/` — nuevos componentes (sidebar, tabs)
- `src/app/(dashboard)/my/profile/page.tsx` — posible refactor minimo

## Current Repo State

### Already exists

- `src/views/greenhouse/my/MyProfileView.tsx` — vista actual flat (3 cards sin tabs)
- `src/app/(dashboard)/my/profile/page.tsx` — page actual
- `src/app/api/my/profile/route.ts` — API route con fallback
- `src/types/person-360.ts` — `PersonProfileSummary` tipo
- `src/lib/person-360/get-person-profile.ts` — proyecciones `toPersonProfileSummary()` y `toPersonProfileSummaryFromSession()`
- Componentes core disponibles: `CustomAvatar`, `CustomTabList`, `CustomTextField`, `CustomChip`, `OpenDialogOnElementClick`, `TablePaginationComponent`, `CardStatsSquare`
- `src/@core/styles/table.module.css` — estilos de tabla
- Patron Person Detail View documentado en GREENHOUSE_UI_PLATFORM_V1.md (horizontal header + tabs)

### Gap

- Mi Perfil no tiene tabs — es un layout flat de 3 cards
- No hay estructura `my-profile/` con componentes separados (sidebar, tabs)
- No hay stats KPI en el profile card (Spaces activos, etc.)
- No se usa `CustomTabList` con pill style
- No se usa `dynamic()` para lazy loading de tabs
- No hay preparacion para tabs futuros (Mi Nomina, Mi Delivery)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Layout sidebar + tabs con contenido actual

- Refactorizar `MyProfileView.tsx` al patron Vuexy: `Grid lg={4}/lg={8}`
- Sidebar izquierdo: avatar 120px con `CustomAvatar variant='rounded'`, nombre, cargo, email, telefono, stats KPI
- Panel derecho: `CustomTabList pill='true'` con tabs
- Tab "Resumen": migrar contenido actual (datos profesionales + sistemas vinculados) a este tab
- Usar `dynamic()` para lazy loading de cada tab

### Slice 2 — Componentes del sidebar

- `MyProfileSidebar.tsx`: card con avatar, datos de identidad, stats (Spaces activos, Sistemas vinculados count), chip de estado
- Stats usando `CustomAvatar variant='rounded' color='primary' skin='light'` + Typography (patron Vuexy UserDetails)
- Datos del sidebar vienen del mismo `PersonProfileSummary` — no requiere API adicional

### Slice 3 — Tabs placeholder para futuros modulos

- Tab "Seguridad": placeholder con mensaje "Proximamente" (no implementar contenido)
- Tab "Mi Nomina": placeholder (bloqueado hasta que el modulo self-service exista)
- Tab "Mi Delivery": placeholder (bloqueado hasta que el modulo self-service exista)
- El objetivo es que la estructura de tabs exista para que agregar un tab sea solo crear el componente e importarlo

## Out of Scope

- Implementar contenido de tabs de Seguridad, Mi Nomina, Mi Delivery — solo placeholders
- Edicion de perfil (Mi Perfil es read-only por ahora)
- Cambios a la API `/api/my/profile` — ya retorna todo lo necesario
- Cambios a `person_360` o al Entra sync
- Responsive mobile-first — seguir el patron Vuexy que ya es responsive (`xs: 12, lg: 4`)

## Detailed Spec

### Referencia Vuexy (full-version)

El patron completo vive en:

```
# Vuexy full-version (NO copiar, adaptar)
src/app/[lang]/(dashboard)/(private)/apps/user/view/
  page.tsx                        ← Grid 4/8 + dynamic() tabs

src/views/apps/user/view/
  user-left-overview/
    UserDetails.tsx               ← profile card (avatar, stats, details)
    UserPlan.tsx                  ← plan card (no aplica a Greenhouse)
  user-right/
    index.tsx                     ← TabContext + CustomTabList pill
    overview/
      ProjectListTable.tsx        ← @tanstack/react-table
      UserActivityTimeline.tsx    ← MUI Timeline
```

### Estructura target en Greenhouse

```
src/views/greenhouse/my/
  MyProfileView.tsx               ← rewrite: Grid 4/8 + lazy tabs
  my-profile/
    MyProfileSidebar.tsx          ← avatar, identity, stats
    tabs/
      OverviewTab.tsx             ← datos profesionales + sistemas vinculados
      SecurityTab.tsx             ← placeholder
```

### Componentes core a reutilizar

| Componente | Import | Uso |
|---|---|---|
| `CustomAvatar` | `@core/components/mui/Avatar` | Avatar 120px rounded en sidebar |
| `CustomTabList` | `@core/components/mui/TabList` | Tabs con pill style |
| `CustomChip` | `@core/components/mui/Chip` | Chip de estado en sidebar |
| `CardStatsSquare` | `@/components/card-statistics/CardStatsSquare` | KPIs en sidebar |

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Mi Perfil usa layout Grid 4/8 (sidebar + tabs)
- [ ] Sidebar muestra avatar 120px, nombre, cargo, email, telefono, al menos 1 stat KPI
- [ ] Panel derecho usa `CustomTabList` con pill style y al menos 2 tabs
- [ ] Tab "Resumen" muestra datos profesionales y sistemas vinculados (funcionalidad actual preservada)
- [ ] Tabs usan `dynamic()` para lazy loading
- [ ] La vista sigue funcionando con el fallback de sesion (usuario sin person_360)
- [ ] `pnpm lint` y `npx tsc --noEmit` pasan sin errores
- [ ] Responsive: en mobile (`xs: 12`) sidebar y tabs stackean verticalmente

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- Validacion manual en staging: verificar layout sidebar + tabs, datos completos, avatar, responsive

## Closing Protocol

- [ ] Actualizar `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` si se agregan componentes nuevos
- [ ] Verificar que la vista funciona con session fallback (deslinkeando identity_profile_id temporalmente)

## Follow-ups

- Implementar tab "Mi Nomina" con datos de compensacion del colaborador
- Implementar tab "Mi Delivery" con metricas ICO del colaborador
- Implementar tab "Seguridad" con historial de login y configuracion de 2FA
- Considerar tab "Mis Asignaciones" con spaces y proyectos activos
- Considerar "Edit Profile" dialog (actualmente read-only)

## Open Questions

- Que stats KPI mostrar en el sidebar: Spaces activos? Sistemas vinculados count? Antigüedad? Verificar que datos estan disponibles en `PersonProfileSummary` o si se necesita extender el tipo
- Los tabs futuros (Mi Nomina, Mi Delivery) requieren APIs self-service que aun no existen — los placeholders deben indicar "Proximamente" o simplemente no renderizar el tab?
