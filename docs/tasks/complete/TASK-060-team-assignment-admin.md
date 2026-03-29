# TASK-060 — Team Assignment Admin: gestión centralizada de asignaciones desde Agency > Team

## Delta 2026-03-27

### Implementado (slices 1-5)
- API `capacity-breakdown` enriquecida con `assignments[]` por miembro
- Botón "Asignar miembro" con drawer (búsqueda, FTE slider, preview de capacidad)
- Drawer de edición (FTE, horas, rol override)
- Desasignar con confirmación
- Filas expandibles con sub-tabla de asignaciones por cliente
- Columna de acciones por fila

### Pendiente — Slice 6: Mostrar todos los miembros del equipo

La vista actual tiene dos filtros en `capacity-breakdown/route.ts` que ocultan miembros:

```
Filtro 1: externalAssignments.length === 0 → skip
Filtro 2: !snapshot || snapshot.usageKind === 'none' → skip
```

**Auditoría de los 7 miembros activos:**

| Miembro | Ext. Assign | usageKind | Visible? | Razón |
|---------|-------------|-----------|----------|-------|
| Andres Carlosama | 1 (Sky) | percent | ✓ | — |
| Daniela Ferreira | 1 (Sky) | percent | ✓ | — |
| Melkin Hernandez | 1 (Sky) | percent | ✓ | — |
| Luis Reyes | 1 (ANAM) | none | ✗ | Filtro 2: usageKind='none' lo descarta |
| Humberly Henriquez | 0 | none | ✗ | Filtro 1: sin external + Filtro 2 |
| Valentina Hoyos | 0 | percent | ✗ | Filtro 1: sin external |
| Julio Reyes | 0 | percent | ✗ | Filtro 1: sin external (admin/dueño — OK) |

**Lo que necesita el Slice 6:**

1. **Relajar filtro 1**: mostrar TODOS los miembros activos (excepto owner/admin si se desea), no solo los que tienen asignaciones externas. Los que no tienen asignaciones deben mostrarse con 0h asignadas y estado "Disponible".

2. **Relajar filtro 2**: `usageKind === 'none'` no debe ocultar al miembro — solo indica que no hay métricas operativas. El miembro sigue siendo asignable y su capacidad contratada es real.

3. **El drawer "Asignar miembro"** necesita buscar de la lista completa de miembros activos, no solo de los que ya aparecen en la tabla.

4. **Considerar**: excluir a Julio Reyes (admin/owner) con un flag configurable, o simplemente mostrarlo también y dejar que el admin decida no asignarlo.

## Estado

En progreso. Slices 1-5 implementados (CRUD completo). Falta Slice 6 (mostrar todos los miembros).
Prerequisito de TASK-038 (Staff Augmentation) y TASK-041 (HRIS Addendum).

## Problema

Hoy para gestionar asignaciones de equipo hay que:

1. Entrar a la ficha de cada persona (`/people/{memberId}`)
2. Ir al tab Memberships
3. Usar el ghost slot de "Vincular a organización"
4. Editar el membership para crear un assignment con FTE/horas

No existe una vista centralizada donde un admin pueda:
- Ver todas las personas y sus asignaciones en un solo lugar
- Asignar un miembro a un cliente directamente
- Editar FTE/horas sin navegar a cada persona
- Ver disponibilidad antes de decidir una asignación
- Gestionar asignaciones en bulk

La vista `Agency > Team` (`/agency/team`) ya muestra la capacidad por persona (contratadas, asignadas, uso operativo, disponibles) pero es **solo lectura** — no permite crear, editar ni eliminar asignaciones.

## Propuesta

Ampliar `AgencyTeamView` para convertirla en la superficie de gestión de asignaciones del equipo, manteniendo la lectura de capacidad actual y agregando capacidad de escritura.

## Lo que ya existe

### Backend (100% implementado)

| Endpoint | Método | Función |
|----------|--------|---------|
| `/api/admin/team/assignments` | GET | Listar assignments con filtros (memberId, clientId, activeOnly) |
| `/api/admin/team/assignments` | POST | Crear assignment (memberId, clientId, fteAllocation, hoursPerMonth) |
| `/api/admin/team/assignments/[id]` | PATCH | Editar assignment (FTE, horas, rol, fechas) |
| `/api/admin/team/assignments/[id]` | DELETE | Soft-delete assignment |
| `/api/team/capacity-breakdown` | GET | Lectura de snapshots por período (ya consumido por la vista) |

### Sync (100% implementado)

- `assignment.created/updated/removed` → outbox events
- `assignment_membership_sync` → crea/desactiva person_memberships vía spaces bridge
- `member_capacity_economics` → recalcula snapshot de capacidad on-event

### UI actual (read-only)

- 4 stat cards: Contratadas, Asignadas, Uso operativo, Disponible comercial
- Chips de estado: Disponible, Balanceado, Alta carga, Sobrecargado
- Tabla con: Nombre, Rol, FTE, Contratadas, Asignadas, Uso operativo, Disponibles, Estado
- Filtro por nombre/rol
- Alerta de sobrecomprometidos

## Scope

### Slice 1 — Row actions: editar y desasignar

Agregar acciones por fila en la tabla existente:

- **Columna de acciones** con botón de menú o iconos:
  - **Editar asignación**: abre drawer con slider de FTE + horas/mes + rol override
  - **Desasignar**: confirma y soft-deletes el assignment
- El drawer reutiliza el patrón de `EditPersonMembershipDrawer` pero simplificado (solo FTE/horas/rol)
- Al guardar: `PATCH /api/admin/team/assignments/{id}` → evento refresh snapshot

### Slice 2 — Botón "Asignar miembro"

Agregar botón en el header de la tabla:

- **"+ Asignar miembro"**: abre drawer con:
  - Search de miembro (autocomplete desde `/api/admin/team/members` o members activos)
  - Search de cliente/espacio (autocomplete desde clients/spaces activos)
  - Slider de FTE (0.1–1.0, step 0.05)
  - Horas/mes (auto-calculado, override manual)
  - Fecha inicio (default: hoy)
  - Preview: "Disponibilidad actual: Xh → después de asignar: Yh"
- Al guardar: `POST /api/admin/team/assignments` → sync projection crea membership + recalcula snapshot
- La tabla se refresca automáticamente

### Slice 3 — Expandable row: detalle de asignaciones por persona

Un miembro puede tener múltiples asignaciones a distintos clientes. Agregar row expansion:

- Click en fila → expande y muestra sub-tabla de assignments activos:
  - Cliente | FTE | Horas/mes | Desde | Hasta | Acciones
- Permite ver la distribución de capacidad por cliente
- Cada sub-fila tiene editar/desasignar individual

### Slice 4 — Filtros avanzados

- Filtro por cliente (dropdown)
- Filtro por estado de salud (Disponible, Balanceado, Alta carga, Sobrecargado)
- Filtro por rol/categoría
- Toggle: "Mostrar miembros sin asignación externa" (hoy se filtran)

## Diseño UX

La vista mantiene su estructura actual de 4 cards + tabla, pero agrega:

```
┌──────────────────────────────────────────────────┐
│ Equipo · 7 personas · Capacidad 4 tipos          │
├──────────────────────────────────────────────────┤
│ [Contratadas] [Asignadas] [Uso operativo] [Disp] │
├──────────────────────────────────────────────────┤
│ [Estado chips: Disponible:2 Balanceado:3 ...]    │
├──────────────────────────────────────────────────┤
│ Detalle por persona            [+ Asignar miembro]│
│ [Buscar...] [Filtro cliente ▼] [Filtro estado ▼] │
│ ┌─────────────────────────────────────────────┐  │
│ │ Nombre  │ Rol │FTE│Contr│Asig│Uso│Disp│Estado│⋮│
│ │ Andres  │ ... │1.0│160h │160h│86%│ 0h │ Alto │⋮│
│ │  └→ Sky Airline │ 1.0 │ 160h │ 2026-01 │ — │ │
│ │ Daniela │ ... │1.0│160h │160h│86%│ 0h │ Alto │⋮│
│ │ Melkin  │ ... │1.0│160h │160h│86%│ 0h │ Alto │⋮│
│ │ Luis    │ ... │0.1│160h │ 10h│ —%│150h│ Disp │⋮│
│ └─────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

## Acceptance Criteria

- [ ] Admin puede crear una asignación desde Agency > Team sin navegar a la ficha de la persona
- [ ] Admin puede editar FTE/horas de una asignación desde Agency > Team
- [ ] Admin puede desasignar un miembro desde Agency > Team
- [ ] Al crear asignación: se dispara evento → sync crea membership + recalcula snapshot → tabla refleja cambio
- [ ] Row expandible muestra distribución de assignments por persona
- [ ] Preview de disponibilidad al crear asignación
- [ ] Filtro por cliente y estado de salud
- [ ] `tsc --noEmit` limpio
- [ ] `pnpm build` limpio

## Auditoría de consumers y cadena reactiva

### Cadena reactiva al crear/editar/eliminar un assignment

Cuando el admin crea, edita o elimina un assignment desde Agency > Team, esta es la cascada completa:

```
POST/PATCH/DELETE /api/admin/team/assignments
  → mutate-team.ts (PostgreSQL + BigQuery dual-write)
  → publishOutboxEvent('assignment.created/updated/removed')
  │
  ├── assignment_membership_sync          → UPSERT person_memberships (vía spaces bridge)
  │     └── publishOutboxEvent('membership.created')
  │           ├── organization_360         → invalidar cache org (updated_at)
  │           └── organization_executive   → invalidar cache executive
  │
  ├── member_capacity_economics           → recalcular snapshot (FTE, horas, overhead, bill rate)
  │     └── person_intelligence           → actualizar serving de inteligencia por persona
  │
  ├── organization_360                    → invalidar cache org
  ├── organization_executive              → invalidar cache executive
  ├── client_economics                    → recomputar economics del cliente
  └── person_operational_metrics          → actualizar métricas operativas
```

**5 projections se disparan** por cada cambio de assignment. Todas ya están implementadas y registradas.

### Consumers directos de `client_team_assignments` (read path)

| Consumer | Archivo | Qué lee |
|----------|---------|---------|
| Agency Team view | `src/app/api/team/capacity-breakdown/route.ts` | Assignments activos + snapshots de capacity economics |
| My Assignments | `src/app/api/my/assignments/route.ts` | Assignments del usuario + snapshot personal |
| Team Capacity | `src/app/api/team/capacity/route.ts` | Agregados de capacidad por cliente/proyecto |
| Person Detail | `src/lib/people/get-person-detail.ts` | Assignments activos del miembro |
| Person Finance | `src/lib/person-360/get-person-finance.ts` | FTE allocation para overview financiero |
| Payroll Cost Allocation | `src/lib/finance/payroll-cost-allocation.ts` | FTE weights para prorrateo de costos |
| Organization Economics | `src/lib/account-360/organization-economics.ts` | Vía `client_labor_cost_allocation` |
| Agency Queries | `src/lib/agency/agency-queries.ts` | Health de espacios, FTE por cliente |
| Client Team | `src/views/greenhouse/GreenhouseClientTeam.tsx` | Equipo por cliente con capacidad |

### Consumers de `person_memberships` (downstream del sync)

| Consumer | Archivo | Qué lee |
|----------|---------|---------|
| Organization People Tab | `src/app/api/organizations/[id]/memberships/route.ts` | Memberships por org |
| Person Memberships Tab | `src/app/api/people/[memberId]/memberships/route.ts` | Memberships del miembro |
| My Organization | `src/app/api/my/organization/members/route.ts` | Miembros de la org del usuario |
| HubSpot Sync | `src/app/api/organizations/[id]/hubspot-sync/route.ts` | Contactos como memberships |
| Ensure Client Membership | `src/lib/my/ensure-client-membership.ts` | Lazy creation on login |

### Tablas materializadas afectadas

| Tabla | Quién la escribe | Trigger |
|-------|-----------------|---------|
| `greenhouse_core.person_memberships` | `assignment_membership_sync` | assignment.created/updated/removed |
| `greenhouse_serving.member_capacity_economics` | `member_capacity_economics` projection | assignment + compensation + payroll events |
| `greenhouse_serving.person_intelligence` | `person_intelligence` projection | cascada desde capacity economics |
| `greenhouse_serving.ico_member_metrics` | `ico_member` projection | assignment + ICO events |
| `greenhouse_core.organizations.updated_at` | `organization_360` + `organization_executive` | membership + assignment events |

### Conclusión: ¿Necesita TASK-060 infraestructura nueva?

**No.** Toda la infraestructura reactiva ya está implementada:

- **Eventos outbox**: `assignment.created/updated/removed` ya se publican desde `mutate-team.ts`
- **Projections**: Las 5 projections reactivas ya procesan estos eventos
- **Sync membership**: La proyección `assignment_membership_sync` ya crea/desactiva memberships
- **Tablas**: No se necesitan tablas nuevas — todo opera sobre `client_team_assignments` + `person_memberships` existentes
- **APIs de escritura**: `POST/PATCH/DELETE /api/admin/team/assignments` ya existen
- **Cron**: `/api/cron/outbox-react-people` ya procesa los eventos del dominio people

**TASK-060 es 100% trabajo de frontend** — ampliar `AgencyTeamView` para exponer las capacidades de escritura que el backend ya tiene.

La única pieza backend que podría necesitar ajuste menor es:
- Enriquecer `GET /api/team/capacity-breakdown` para incluir el `assignmentId` y `clientId` por miembro (hoy no los devuelve, y los necesita el drawer de edición)
- O crear un endpoint ligero `GET /api/admin/team/assignments?memberId=X` para cargar assignments al expandir una fila

## Dependencies & Impact

### Depende de

- **TASK-056** (complete) — `member_capacity_economics` snapshot, helpers puros, AgencyTeamView
- **TASK-057** (complete) — direct overhead en la cadena de loaded cost
- **Assignment → Membership sync** (implemented) — proyección que crea memberships automáticamente
- APIs de admin ya existentes: `POST/PATCH/DELETE /api/admin/team/assignments`

### Impacta a

- **TASK-038** (Staff Augmentation) — esta task crea la base de gestión de assignments que Staff Aug extiende con `assignment_type = 'staff_augmentation'`, billing rates, compliance, SLA
- **TASK-041** (HRIS Addendum) — los campos HRIS se snapshotean al crear un placement/assignment; esta task provee la UI de creación que HRIS enriquece
- **9 consumers de lectura** (ver tabla arriba) — todos se benefician de datos más frescos si el admin gestiona desde Agency > Team
- **5 projections reactivas** — ya implementadas, no necesitan cambios
- **6 tablas materializadas** — ya se actualizan reactivamente

### Archivos owned

- `src/views/agency/AgencyTeamView.tsx`
- `src/views/agency/drawers/AssignMemberDrawer.tsx` (nuevo)
- `src/views/agency/drawers/EditAssignmentDrawer.tsx` (nuevo)
- `src/app/api/team/capacity-breakdown/route.ts` (enriquecer con assignment detail)

## Relación con TASK-038 y TASK-041

### TASK-038 (Staff Augmentation)

TASK-060 es **prerequisito** de TASK-038. La cadena es:

```
TASK-060 (Team Assignment Admin)
  → Admin puede crear/editar assignments desde Agency > Team
  → TASK-038 extiende con:
    → assignment_type = 'staff_augmentation'
    → satellite table: staff_aug_placements
    → billing rate, SLA, compliance, onboarding checklist
    → dashboard propio de Staff Aug
```

Sin TASK-060, TASK-038 tendría que construir el CRUD de assignments desde cero en su propio módulo. Con TASK-060, Staff Aug solo agrega su capa comercial sobre la gestión base que ya existe.

### TASK-041 (HRIS Addendum)

TASK-060 no bloquea TASK-041 directamente, pero la enriquece:

- Cuando TASK-060 permite crear assignments desde Agency > Team, TASK-041 puede agregar pre-fill de datos HRIS (contract_type, cost_rate) al drawer de creación
- El formulario de "Asignar miembro" que TASK-060 construye es el que TASK-041 luego enriquece con campos de compliance
