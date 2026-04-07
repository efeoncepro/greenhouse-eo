# TASK-272 — Mi Perfil: vista rica basada en Vuexy user-profile

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Complete`
- Rank: `TBD`
- Domain: `my`, `people`, `ui`
- Blocked by: `none`
- Branch: `task/TASK-272-my-profile-vuexy-rich-view`
- Legacy ID: —
- GitHub Issue: —

## Summary

Reemplazar la vista minimalista de `/my/profile` (sidebar + 2 tabs basicos) con la vista rica de Vuexy user-profile: header con banner + avatar overlapping, 4 tabs (Profile, Teams, Projects, Connections), tabla de proyectos con TanStack, timeline de actividad, cards de equipos y colegas. Los componentes de Vuexy en `full-version/src/views/pages/user-profile/` se copian y adaptan con datos reales de Greenhouse — no se recrean desde cero.

## Why This Task Exists

La vista actual de "Mi Perfil" es funcional pero visualmente pobre comparada con el resto del portal. Solo muestra datos basicos del usuario en un sidebar + una tab Overview con datos profesionales y una tab Security placeholder. Vuexy incluye una vista de perfil completa y rica que ya esta disponible en `full-version/` — copiarla y alimentarla con datos reales es mas eficiente que disenar desde cero y mantiene consistencia visual con el design system.

## Goal

- El usuario ve su perfil completo con header rico (banner + avatar + cargo + departamento + fecha ingreso)
- Tab Profile muestra: About (datos personales), Contacts, Activity Timeline, Teams/Connections, Projects Table
- Tab Teams muestra: grid de espacios/clientes donde el usuario esta asignado
- Tab Projects muestra: grid de proyectos del usuario con progreso, deadline, equipo
- Tab Connections muestra: grid de colegas del mismo departamento/espacio
- Todos los datos son reales, consultados desde PostgreSQL (person_360, assignments, proyectos, colegas)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` — arquitectura general
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` — modelo person-org, poblaciones, grafos
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — modelo canonico 360

Reglas obligatorias:

- Datos del usuario autenticado via `person_360` view — no crear queries ad-hoc fuera del modelo canonico
- Auth: view code `mi_ficha.mi_perfil` con fallback a route group `my` (ya implementado en page.tsx)
- Componentes Vuexy se copian de `full-version/` y se adaptan — no se reescriben desde cero
- Labels en espanol (portal es en espanol)

## Normative Docs

- `full-version/src/views/pages/user-profile/` — componentes Vuexy de referencia (copiar y adaptar)
- `full-version/src/types/pages/profileTypes.ts` — tipos Vuexy de referencia
- `src/views/greenhouse/my/MyProfileView.tsx` — vista actual a reemplazar
- `src/app/api/my/profile/route.ts` — API actual que retorna `PersonProfileSummary`

## Dependencies & Impact

### Depends on

- `greenhouse_serving.person_360` — vista PostgreSQL con datos del usuario (ya existe)
- `greenhouse_core.client_team_assignments` — asignaciones del usuario a clientes/espacios
- `greenhouse_core.members` — colegas del mismo departamento
- Proyectos del usuario — via `project_scopes` en `client_users` o Notion sync

### Blocks / Impacts

- TASK-257 (Mi Perfil enterprise redesign) — esta task la subsume/reemplaza
- Vista `/my/profile` — reemplazo completo
- `PersonProfileSummary` type — se extiende (no se rompe, backward compatible)

### Files owned

- `src/views/greenhouse/my/MyProfileView.tsx` — reescribir completo
- `src/views/greenhouse/my/my-profile/` — reemplazar contenido con componentes adaptados de Vuexy
- `src/app/api/my/profile/route.ts` — extender respuesta con datos adicionales
- `src/types/person-360.ts` — extender `PersonProfileSummary` o crear tipo nuevo

## Current Repo State

### Already exists

- `GET /api/my/profile` retorna `PersonProfileSummary` con 14 campos — `src/app/api/my/profile/route.ts`
- `PersonProfileSummary` type — `src/types/person-360.ts`
- `person_360` view en PostgreSQL con 80+ columnas (member + user + CRM facets)
- `MyProfileView.tsx` con sidebar + 2 tabs — `src/views/greenhouse/my/MyProfileView.tsx`
- Componentes Vuexy completos en `full-version/src/views/pages/user-profile/` (10 archivos)
- Tipos Vuexy en `full-version/src/types/pages/profileTypes.ts`
- Banner gradient pattern ya usado en `UserDetailHeader.tsx` (admin user detail)
- `client_team_assignments` tabla con asignaciones equipo→cliente
- APIs de people con memberships, delivery, ico-profile — `src/app/api/people/[memberId]/`
- TanStack React Table ya configurado en el proyecto

### Gap

- API `/api/my/profile` solo retorna datos basicos — no incluye proyectos, equipos, colegas, actividad
- No existe endpoint `/api/my/teams` ni `/api/my/projects` ni `/api/my/connections`
- No existe ActivityTimeline con datos reales del usuario
- Vista actual no usa el patron header con banner de Vuexy
- No hay mapping de tipos Vuexy → Greenhouse definido

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — API: extender GET /api/my/profile con datos enriquecidos

- Extender la respuesta de `GET /api/my/profile` con secciones adicionales:
  - `teams`: espacios/clientes asignados al usuario (de `client_team_assignments` + `clients`)
  - `projects`: proyectos del usuario (de `project_scopes` o delivery data)
  - `connections`: colegas del mismo departamento (de `members` WHERE `department_id` = mismo)
  - `activity`: ultimas acciones del usuario (leave requests recientes, ultimo login, etc.)
- Mantener la respuesta actual como base (backward compatible) — los nuevos campos son adicionales
- Cada seccion es un array con la estructura que los componentes Vuexy esperan (adaptada a Greenhouse)

### Slice 2 — Types: definir interfaces Greenhouse que mapeen a los componentes Vuexy

- Crear `MyProfileFullData` interface que extienda `PersonProfileSummary` con:
  - `teams: MyProfileTeam[]` — titulo, descripcion, miembros, chips
  - `projects: MyProfileProject[]` — titulo, cliente, progreso, deadline, equipo
  - `connections: MyProfileConnection[]` — nombre, cargo, avatar, departamento, tareas
  - `activity: MyProfileActivity[]` — tipo, descripcion, fecha, actor
  - `profileHeader: MyProfileHeader` — datos del header (nombre, avatar, cargo, departamento, fecha ingreso)
  - `about: MyProfileAboutItem[]` — icon + property + value para la card About
  - `contacts: MyProfileContactItem[]` — icon + property + value para la card Contacts

### Slice 3 — Header: copiar y adaptar UserProfileHeader de Vuexy

- Copiar `full-version/src/views/pages/user-profile/UserProfileHeader.tsx`
- Adaptar a `src/views/greenhouse/my/my-profile/MyProfileHeader.tsx`
- Cambios: banner gradient en vez de imagen, datos de `MyProfileHeader`, labels en espanol
- Mantener: avatar overlapping, layout, typography, stats pattern

### Slice 4 — Tab Profile: copiar y adaptar AboutOverview + ActivityTimeline + ConnectionsTeams + ProjectsTable

- Copiar los 4 componentes de `full-version/src/views/pages/user-profile/profile/`
- Adaptar a `src/views/greenhouse/my/my-profile/tabs/ProfileTab.tsx` (o sub-componentes)
- **AboutOverview**: alimentar con datos reales (About: job level, employment type, department; Contacts: email, phone, linked systems; Teams: equipos asignados; Overview: stats del usuario)
- **ActivityTimeline**: reemplazar datos hardcodeados con actividad real (leave requests, logins, role changes)
- **ConnectionsTeams**: alimentar con colegas reales + equipos reales
- **ProjectsTable**: alimentar con proyectos reales del usuario (TanStack table con progress, team avatars, leader)

### Slice 5 — Tab Teams: copiar y adaptar vista de equipos

- Copiar `full-version/src/views/pages/user-profile/teams/index.tsx`
- Adaptar con espacios/clientes asignados al usuario
- Cada card muestra: nombre del espacio/cliente, descripcion, miembros del equipo, chips de servicios activos

### Slice 6 — Tab Projects: copiar y adaptar vista de proyectos

- Copiar `full-version/src/views/pages/user-profile/projects/index.tsx`
- Adaptar con proyectos reales del usuario
- Cada card muestra: nombre del proyecto, cliente, progreso, deadline, equipo, tareas completadas

### Slice 7 — Tab Connections: copiar y adaptar vista de colegas

- Copiar `full-version/src/views/pages/user-profile/connections/index.tsx`
- Adaptar con colegas del mismo departamento/espacio
- Cada card muestra: nombre, cargo, avatar, departamento, stats (proyectos, tareas, conexiones)

### Slice 8 — Ensamblar: reescribir MyProfileView con estructura Vuexy

- Reescribir `MyProfileView.tsx` usando el patron de `full-version/src/views/pages/user-profile/index.tsx`
- Header + 4 tabs (Profile, Teams, Projects, Connections)
- Mantener tab Security como 5to tab (ya existe como placeholder)
- Data fetching: un solo `GET /api/my/profile` que retorna todo (enriquecido en Slice 1)

## Out of Scope

- Edicion de perfil (el perfil sigue siendo read-only)
- Upload de avatar desde esta vista (ya existe en admin user detail)
- Funcionalidad "Connect/Disconnect" entre colegas (solo visualizacion)
- Mensajeria directa entre colegas
- Crear nuevos endpoints para proyectos individuales o detalle de equipo
- Reemplazar el admin user detail (`/admin/users/[id]`) — esa vista se mantiene separada
- i18n (labels en espanol, sin toggle de idioma)

## Detailed Spec

### Mapping de datos Vuexy → Greenhouse

| Dato Vuexy | Tipo Vuexy | Fuente Greenhouse | Tabla/Vista |
|------------|-----------|-------------------|-------------|
| `fullName` | `ProfileHeaderType.fullName` | `person360.resolved_display_name` | `person_360` |
| `profileImg` | `ProfileHeaderType.profileImg` | `person360.resolved_avatar_url` → proxy | `person_360` |
| `coverImg` | `ProfileHeaderType.coverImg` | Banner gradient CSS (no imagen) | — |
| `designation` | `ProfileHeaderType.designation` | `person360.resolved_job_title` | `person_360` |
| `location` | `ProfileHeaderType.location` | `person360.member_department_name` | `person_360` |
| `joiningDate` | `ProfileHeaderType.joiningDate` | `person360.member_hire_date` | `person_360` |
| About items | `ProfileCommonType[]` | job level, employment type, email, phone, department | `person_360` |
| Contacts items | `ProfileCommonType[]` | email, phone, linked systems | `person_360` |
| Teams items | `ProfileTeamsTechType[]` | espacios asignados con miembros | `client_team_assignments` + `clients` |
| Projects table | `ProjectTableRowType[]` | proyectos con progreso | `project_scopes` / delivery data |
| Activity timeline | hardcoded → real | leave requests, logins, role changes | `leave_requests` + `audit_events` |
| Connections | `ProfileConnectionsType[]` | colegas mismo departamento | `members` |
| Teams tab | `TeamsTabType[]` | espacios/clientes asignados | `client_team_assignments` |
| Projects tab | `ProjectsTabType[]` | proyectos del usuario | delivery data |
| Connections tab | `ConnectionsTabType[]` | colegas | `members` |

### Estrategia de componentes

**Copiar y adaptar** — no recrear. Para cada componente Vuexy:

1. Copiar el archivo de `full-version/src/views/pages/user-profile/` a `src/views/greenhouse/my/my-profile/`
2. Cambiar los imports de tipos por los tipos Greenhouse equivalentes
3. Cambiar props hardcodeados por datos reales
4. Traducir labels al espanol
5. Ajustar colores/tokens si es necesario (usar `GH_COLORS` o theme tokens)
6. Mantener la estructura visual, layout, y patrones de MUI intactos

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `/my/profile` muestra header con banner gradient + avatar overlapping + nombre + cargo + departamento + fecha ingreso
- [ ] Tab Profile muestra card About con datos reales del usuario (job level, employment type, department, email, phone)
- [ ] Tab Profile muestra Activity Timeline con al menos las ultimas 5 acciones del usuario
- [ ] Tab Profile muestra Connections/Teams cards con datos reales
- [ ] Tab Profile muestra Projects Table con TanStack (paginacion, busqueda, progress bars)
- [ ] Tab Teams muestra grid de espacios/clientes asignados al usuario
- [ ] Tab Projects muestra grid de proyectos del usuario con progreso y deadline
- [ ] Tab Connections muestra grid de colegas del mismo departamento
- [ ] `GET /api/my/profile` retorna datos enriquecidos (teams, projects, connections, activity)
- [ ] La vista es responsive (mobile + desktop)
- [ ] `pnpm build`, `pnpm lint` pasan sin errores
- [ ] Vista actual de `/my/profile` reemplazada completamente

## Verification

- `pnpm build`
- `pnpm lint`
- `npx tsc --noEmit`
- Verificacion visual: navegar a `/my/profile` como usuario interno, verificar header, 4 tabs, datos reales
- Verificacion mobile: verificar que la vista es responsive en viewport movil

## Closing Protocol

- [ ] Actualizar `docs/documentation/` si existe documentacion funcional de Mi Perfil
- [ ] Marcar TASK-257 como subsumida por TASK-272 si corresponde

## Follow-ups

- Edicion de perfil inline (modificar datos personales desde Mi Perfil)
- Upload de avatar desde Mi Perfil
- Tab Security con datos reales (sesiones activas, historial de login, 2FA)
- Funcionalidad "Connect" entre colegas (no solo visualizacion)
- Notificaciones de actividad en tiempo real en el timeline

## Open Questions

- Proyectos: usar `project_scopes` de `client_users` o datos de delivery/Notion? Decidir durante Discovery segun disponibilidad de datos.
- Activity Timeline: que acciones mostrar? Propuesta: leave requests (ultimas 3), ultimo login, ultimos role changes. Confirmar con el equipo.
- Connections: mostrar solo colegas del mismo departamento, o tambien del mismo espacio/cliente? Propuesta: ambos, priorizando departamento.
