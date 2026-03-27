# TASK-060 — Team Assignment Admin: gestión centralizada de asignaciones desde Agency > Team

## Estado

Pendiente. Prerequisito de TASK-038 (Staff Augmentation) y TASK-041 (HRIS Addendum).

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

## Dependencies & Impact

### Depende de

- **TASK-056** (complete) — `member_capacity_economics` snapshot, helpers puros, AgencyTeamView
- **TASK-057** (complete) — direct overhead en la cadena de loaded cost
- **Assignment → Membership sync** (implemented) — proyección que crea memberships automáticamente
- APIs de admin ya existentes: `POST/PATCH/DELETE /api/admin/team/assignments`

### Impacta a

- **TASK-038** (Staff Augmentation) — esta task crea la base de gestión de assignments que Staff Aug extiende con `assignment_type = 'staff_augmentation'`, billing rates, compliance, SLA
- **TASK-041** (HRIS Addendum) — los campos HRIS se snapshotean al crear un placement/assignment; esta task provee la UI de creación que HRIS enriquece

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
