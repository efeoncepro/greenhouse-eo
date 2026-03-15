# CODEX TASK — People Unified View v2

## Estado

Este brief **reemplazo operativamente** a `CODEX_TASK_People_Unified_View.md`, pero hoy debe leerse como referencia histórica.

Estado 2026-03-14:
- `People` sí existe en runtime y sí está alineado con arquitectura
- la `v2` ya quedó parcialmente desfasada porque desde entonces:
  - `/api/admin/team/*` sí existe y ya soporta writes reales
  - `People` ya consume acciones admin reales desde su propia UI
  - el backend 360 por colaborador siguió creciendo más allá del scope original

Brief activo vigente:
- `docs/tasks/in-progress/CODEX_TASK_People_Unified_View_v3.md`

---

## Alineación explícita con Greenhouse 360 Object Model

Esta task ya es compatible con:
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

Reglas que deben mantenerse:
- `greenhouse.team_members.member_id` es el ancla canónica del objeto `Collaborator`
- `client_users` no reemplaza la ficha de persona; sigue siendo principal de acceso
- `identity_profile_id` sigue siendo la raíz de identidad transversal
- People es una capa de lectura consolidada que enriquece al colaborador con otros dominios, no un silo alternativo

Si esta task se extiende a futuro:
- debe seguir consumiendo Finance, Payroll, Agency o Tooling como read-model enrichments del mismo objeto `Collaborator`
- no debe introducir un nuevo master de persona por módulo

---

## Resumen

Implementar **`/people`** como la vista unificada del equipo interno Efeonce dentro de Greenhouse.

El objetivo no es crear otro modulo de admin aislado, sino una surface operativa centrada en la persona:
- en que cuentas trabaja
- cuanto FTE tiene asignado
- que integraciones e identidad tiene enlazadas
- como se comporta operativamente en `notion_ops`
- y, para perfiles autorizados, cual es su compensacion y su historial de nomina

## Decision de alcance

Esta `v2` se define como **implementable ahora** bajo estas reglas:

1. `/people` se monta como modulo nuevo y no depende de que exista `/admin/team`.
2. La primera entrega es **read-first**:
   - lista consolidada
   - ficha por persona
   - tabs con lectura
3. Las acciones de edicion de assignments o perfil quedan:
   - fuera de alcance en esta fase, o
   - explicitamente behind feature flag / empty CTA hasta que exista CRUD de team
4. Los tabs HR se apoyan en el backend real de payroll ya implementado.

## Compatibilidad con Admin Team Module posterior

`People Unified View v2` debe implementarse pensando en que luego vendra `CODEX_TASK_Admin_Team_Module.md`.

### Regla de arquitectura

People en esta fase es una **capa de lectura consolidada**.

Eso implica:
- `GET /api/people`
- `GET /api/people/[memberId]`
- helpers read-only en `src/lib/people/*`

### Regla para no generar retrabajo

No introducir writes bajo `/api/people/*` en esta fase.

Cuando llegue `Admin Team Module`, el CRUD de personas y assignments debe vivir en su propio namespace admin:
- `/api/admin/team/members/*`
- `/api/admin/team/assignments/*`

People luego consumira esa misma base, pero no debe convertirse en el origen de verdad del CRUD.

### Diseno backend recomendado

Separar desde ya dos capas:

1. **Shared queries / orchestration**
   - `src/lib/people/get-people-list.ts`
   - `src/lib/people/get-person-detail.ts`
   - `src/lib/people/get-person-operational-metrics.ts`
   - futuros helpers compartidos de `team_members` y `client_team_assignments`

2. **Route adapters**
   - `GET /api/people/*` para lectura transversal por rol
   - futuro `GET/POST/PATCH/DELETE /api/admin/team/*` para administracion

Asi el `Admin Team Module` posterior podra reutilizar la capa de datos sin obligarnos a mover contratos o reescribir joins.

---

## Realidad tecnica del repo

### Existe hoy

- Auth con NextAuth y `TenantContext`
- route groups reales:
  - `client`
  - `internal`
  - `admin`
  - `agency`
  - `hr`
- roles internos reales usados por runtime:
  - `efeonce_admin`
  - `efeonce_operations`
  - `efeonce_account`
  - `hr_payroll`
- roster interno versionado en BigQuery:
  - `greenhouse.team_members`
  - `greenhouse.client_team_assignments`
- identidad canonica:
  - `team_members.identity_profile_id`
  - `greenhouse.identity_profile_source_links`
- capa de equipo ya operativa:
  - `GET /api/team/members`
  - `GET /api/team/capacity`
  - `GET /api/team/by-project/[projectId]`
  - `GET /api/team/by-sprint/[sprintId]`
- payroll ya operativo:
  - `GET /api/hr/payroll/members/[memberId]/history`
  - `compensation_versions`
  - `payroll_entries`

### No existe hoy

- `/admin/team`
- `/api/admin/team/*`
- route group `people`
- rol `operator`
- rol `hr` generico

---

## Objetivo funcional

Crear dos surfaces nuevas:

1. **`/people`**
   - lista consolidada de colaboradores internos
   - filtros, busqueda y metricas ejecutivas

2. **`/people/[memberId]`**
   - ficha de persona en layout 2 columnas
   - sidebar de identidad / contacto / integraciones
   - tabs dinamicos por permiso

---

## Modelo de acceso correcto

### Regla base

No crear un route group nuevo `people` en esta fase.

`/people` vive dentro del acceso **interno** actual:
- el sublayout valida `internal`
- la pagina y sus APIs aplican permisos por `roleCode`

### Mapeo de roles real

| Necesidad de negocio | En brief viejo | En runtime real |
| --- | --- | --- |
| Admin total | `efeonce_admin` | `efeonce_admin` |
| Operador interno | `operator` | `efeonce_operations` |
| HR | `hr` | `hr_payroll` |

### Decision para v2

| Rol real | Ve `/people` | Tabs visibles |
| --- | --- | --- |
| `efeonce_admin` | Si | Todos |
| `efeonce_operations` | Si | Perfil, Asignaciones, Actividad |
| `hr_payroll` | Si | Perfil, Compensacion, Nomina |
| `efeonce_account` | No en v2 | Fuera de alcance hasta confirmacion de negocio |

Si negocio confirma luego que `efeonce_account` necesita visibilidad de staffing, se agrega como extension controlada.

### Implementacion

- `src/app/(dashboard)/people/layout.tsx`
  - usa `requireInternalTenantContext()`
  - si el usuario no tiene rol permitido, retorna forbidden
- las APIs nuevas de `/api/people/*` validan:
  - `efeonce_admin`
  - `efeonce_operations`
  - `hr_payroll`
- la navegacion de tabs se calcula por `roleCodes`, no por labels inventados

---

## Modelo de datos correcto

### Fuente primaria de persona

La persona se modela desde `greenhouse.team_members`.

No usar `client_users` como registro canonico de la persona.
`client_users` se usa como capa de acceso y enriquecimiento de login, no como ficha laboral.

### Campos base

Usar lo que ya existe en `team_members`:
- `member_id`
- `display_name`
- `email`
- `email_aliases`
- `identity_profile_id`
- `role_title`
- `role_category`
- `avatar_url`
- `contact_channel`
- `contact_handle`
- `location_city`
- `location_country`
- `teams_user_id`
- `slack_user_id`
- `azure_oid`
- `notion_user_id`
- `hubspot_owner_id`
- `active`

### Regla importante sobre pais

No agregar `country`.

Usar `location_country`:
- para display en People
- para filtros
- como input auxiliar de UI si hace falta

Si payroll necesita defaults de regimen, esa logica vive en payroll, no en esta task.

### Integraciones e identidad

People debe priorizar:
1. `team_members.identity_profile_id`
2. `identity_profile_source_links`
3. providers legacy del member:
   - `azure_oid`
   - `notion_user_id`
   - `hubspot_owner_id`

La izquierda de la ficha debe mostrar estado de link por provider, pero sin redefinir la identidad canonica.

---

## APIs objetivo

## `GET /api/people`

Nueva API consolidada para la lista.

### Acceso

- `efeonce_admin`
- `efeonce_operations`
- `hr_payroll`

### Fuente

- `greenhouse.team_members`
- `greenhouse.client_team_assignments`
- `greenhouse.compensation_versions` solo para enriquecer `payRegime` si existe

### Response sugerida

```ts
export interface PersonListItem {
  memberId: string
  displayName: string
  publicEmail: string
  internalEmail: string | null
  roleTitle: string
  roleCategory: string
  avatarUrl: string | null
  locationCountry: string | null
  active: boolean
  totalAssignments: number
  totalFte: number
  payRegime: 'chile' | 'international' | null
}

export interface PeopleListPayload {
  items: PersonListItem[]
  summary: {
    activeMembers: number
    totalFte: number
    coveredClients: number
    chileCount: number
    internationalCount: number
  }
}
```

### Regla de implementacion

- la API lista personas aunque no tengan payroll
- `payRegime` puede venir:
  - de la compensacion vigente si existe
  - `null` si no existe
- no inferirlo automaticamente desde `location_country` en esta fase

## `GET /api/people/[memberId]`

Nueva API consolidada para la ficha.

### Acceso

- `efeonce_admin`
- `efeonce_operations`
- `hr_payroll`

### Regla de filtrado por rol

El server omite bloques segun permisos:
- `assignments` y `operationalMetrics` solo para `efeonce_admin` y `efeonce_operations`
- `currentCompensation` y `recentPayroll` solo para `efeonce_admin` y `hr_payroll`

### Response sugerida

```ts
import type { CompensationVersion, PayrollEntry } from '@/types/payroll'
import type { TeamMemberProfile } from '@/types/team'

export interface PersonDetail {
  member: {
    memberId: string
    displayName: string
    publicEmail: string
    internalEmail: string | null
    avatarUrl: string | null
    roleTitle: string
    roleCategory: string
    active: boolean
    profile: TeamMemberProfile
    identityProfileId: string | null
    notionUserId: string | null
    azureOid: string | null
    hubspotOwnerId: string | null
  }
  integrations: {
    microsoftLinked: boolean
    notionLinked: boolean
    hubspotLinked: boolean
    linkedProviders: string[]
  }
  assignments?: Array<{
    assignmentId: string
    clientId: string
    clientName: string
    fteAllocation: number
    hoursPerMonth: number | null
    roleTitleOverride: string | null
    startDate: string | null
    endDate: string | null
    active: boolean
  }>
  operationalMetrics?: {
    rpaAvg30d: number | null
    otdPercent30d: number | null
    tasksCompleted30d: number
    tasksActiveNow: number
    projectBreakdown: Array<{
      projectId: string | null
      projectName: string
      assetCount: number
    }>
  } | null
  currentCompensation?: CompensationVersion | null
  recentPayroll?: PayrollEntry[]
}
```

### Regla de origen por bloque

- `member`: `team_members`
- `integrations`: `identity_profile_source_links` + columnas existentes del member
- `assignments`: `client_team_assignments`
- `operationalMetrics`: query nueva sobre `notion_ops.tareas`
- `currentCompensation`: helper de payroll por member
- `recentPayroll`: historial por member desde payroll

## APIs reutilizables reales

Estas si existen hoy:

| API | Uso en People v2 |
| --- | --- |
| `GET /api/hr/payroll/members/[memberId]/history` | Tab Nomina |
| `GET /api/team/members` | Referencia funcional para roster e identidad |
| `GET /api/team/capacity` | Referencia funcional para KPIs y joins de operacion |

## Fuera de alcance en esta fase

No prometer aun estas rutas porque no existen:
- `POST /api/admin/team/assignments`
- `PATCH /api/admin/team/assignments/[id]`
- `GET /api/admin/team/members/[id]`

Si luego se construye CRUD de team, People podra absorberlo sin reescribir el modulo.

---

## Vistas

## `/people`

Patron base:
- `full-version/src/views/apps/user/list/`
- reutilizar patrones ya presentes en `src/views/greenhouse/admin/users/*`

### Contenido

- header: `Equipo`
- stats row:
  - activos
  - FTE asignado
  - spaces cubiertos
  - distribucion Chile / Intl
- filtros:
  - rol
  - pais
  - estado
  - busqueda
- tabla:
  - avatar
  - nombre + email
  - cargo
  - pais
  - spaces
  - FTE
  - estado
  - acciones

### Regla de UX

En `v2`, el CTA de agregar o editar debe depender de backend existente:
- si no existe CRUD, mostrar solo acciones de lectura
- no dejar botones falsos que prometan drawers no implementados

## `/people/[memberId]`

Patron base:
- `full-version/src/views/apps/user/view/`
- referencia util ya implementada:
  - `src/views/greenhouse/payroll/MemberPayrollHistory.tsx`

### Columna izquierda

- avatar
- nombre
- cargo
- badge de categoria
- pais / ciudad
- contacto
- metricas de resumen:
  - FTE total
  - horas/mes
  - spaces
- integraciones:
  - Microsoft
  - Notion
  - HubSpot

### Tabs

```ts
export type PersonTab = 'assignments' | 'activity' | 'compensation' | 'payroll'

export const TAB_PERMISSIONS: Record<PersonTab, string[]> = {
  assignments: ['efeonce_admin', 'efeonce_operations'],
  activity: ['efeonce_admin', 'efeonce_operations'],
  compensation: ['efeonce_admin', 'hr_payroll'],
  payroll: ['efeonce_admin', 'hr_payroll']
}
```

### Tab Asignaciones

Fuente:
- `greenhouse.client_team_assignments`

Contenido:
- tabla por assignment
- FTE total consolidado
- estado activo / cerrado

En `v2` este tab es **read-only**.

### Tab Actividad

Fuente:
- `notion_ops.tareas`

Match prioritario:
1. `notion_user_id`
2. señales canonicas del `identity_profile_id`
3. fallback controlado por aliases si el runtime ya lo soporta

Contenido:
- KPI cards:
  - RpA promedio 30d
  - tasks completadas 30d
  - OTD% 30d
- breakdown por proyecto
- tabla de activos si el query lo permite

### Tab Compensacion

Fuente:
- `greenhouse.compensation_versions`

Regla:
- mostrar compensacion vigente si existe
- mostrar historial resumido
- no inventar defaults desde People

### Tab Nomina

Fuente:
- `GET /api/hr/payroll/members/[memberId]/history`

Regla:
- mostrar ultimos periodos
- reusar la UI ya existente de historial donde sea posible

---

## Tipos TypeScript

Crear:
- `src/types/people.ts`

Reusar tipos reales del repo:

```ts
export type { TeamMemberProfile } from '@/types/team'
export type { CompensationVersion, PayrollEntry } from '@/types/payroll'
```

No referenciar `./team-admin`.

---

## Estructura sugerida

```txt
src/
├── app/
│   ├── (dashboard)/
│   │   └── people/
│   │       ├── layout.tsx
│   │       ├── page.tsx
│   │       └── [memberId]/
│   │           └── page.tsx
│   └── api/
│       └── people/
│           ├── route.ts
│           └── [memberId]/
│               └── route.ts
├── lib/
│   └── people/
│       ├── get-people-list.ts
│       ├── get-person-detail.ts
│       ├── get-person-operational-metrics.ts
│       └── shared.ts
├── types/
│   └── people.ts
├── views/
│   └── greenhouse/
│       └── people/
│           ├── PeopleList.tsx
│           ├── PeopleListFilters.tsx
│           ├── PeopleListStats.tsx
│           ├── PeopleListTable.tsx
│           ├── PersonView.tsx
│           ├── PersonLeftSidebar.tsx
│           ├── PersonTabs.tsx
│           ├── tabs/
│           │   ├── PersonAssignmentsTab.tsx
│           │   ├── PersonActivityTab.tsx
│           │   ├── PersonCompensationTab.tsx
│           │   └── PersonPayrollTab.tsx
│           └── components/
│               ├── CountryFlag.tsx
│               └── IntegrationStatus.tsx
```

---

## Sidebar

Agregar item nuevo:

- seccion: `EQUIPO`
- item: `Personas`
- path: `/people`

### Regla de visibilidad

Visible solo para usuarios internos con al menos uno de estos roles:
- `efeonce_admin`
- `efeonce_operations`
- `hr_payroll`

No depender de `routeGroups.includes('people')`.

---

## Orden de ejecucion recomendado

### Fase 1

1. Crear `src/types/people.ts`
2. Crear guard reusable de People sobre `internal` + `roleCodes`
3. Implementar `GET /api/people`
4. Implementar `GET /api/people/[memberId]`

### Fase 2

5. Implementar `/people`
6. Implementar filtros y tabla
7. Conectar summary cards

### Fase 3

8. Implementar `/people/[memberId]`
9. Conectar sidebar izquierda
10. Conectar tabs por rol

### Fase 4

11. Reusar historial de payroll
12. Conectar actividad desde `notion_ops`
13. Agregar item de sidebar

### Fase 5

14. Validar preview Vercel con usuarios:
  - `efeonce_admin`
  - `efeonce_operations`
  - `hr_payroll`

---

## Criterios de aceptacion

- `/people` renderiza solo para roles permitidos
- la lista sale de `team_members` + `client_team_assignments`
- no se agrega columna redundante `country`
- la ficha prioriza `identity_profile_id` como identidad canonica
- los tabs se ocultan segun `roleCodes` reales
- HR puede ver compensacion y nomina
- operaciones puede ver asignaciones y actividad
- admin puede ver todo
- si no existe payroll para una persona, los tabs HR muestran empty state valido
- si no existe match operativo de Notion, el tab Actividad muestra estado vacio, no error

---

## Riesgos y decisiones abiertas

### `efeonce_account`

Pendiente de negocio:
- confirmar si este rol debe ver People en lectura
- no incluirlo por defecto en `v2`

### Write actions

Pendiente tecnico:
- si se quiere editar assignments desde People, hace falta CRUD nuevo o task separada

### Match operativo

Pendiente de validacion:
- definir si el tab Actividad puede reutilizar 100% del criterio de payroll
- o si necesita una query propia orientada a ventana de 30 dias

---

## Verificacion minima esperada

- `pnpm build`
- smoke manual en preview:
  - `/people`
  - `/people/[memberId]`
  - visibilidad de tabs por rol
- smoke de APIs:
  - `GET /api/people`
  - `GET /api/people/[memberId]`
