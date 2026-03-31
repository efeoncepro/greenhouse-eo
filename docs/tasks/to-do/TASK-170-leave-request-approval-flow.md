# TASK-170 — Leave Request & Approval Flow

**Status:** to-do
**Priority:** High
**Module:** HR / People
**Depends on:** TASK-005 (work entries layer — can be built in parallel for Phases 1-2)

---

## Objetivo

Implementar el flujo completo de solicitud, aprobación y gestión de vacaciones/permisos del equipo Efeonce, desde la perspectiva del colaborador, supervisor y HR admin. Incluye UI de solicitud, flujo de aprobación multi-nivel, dashboard de saldos, y calendario visual de ausencias.

## Motivación

Actualmente:
- Las solicitudes de permiso se gestionan fuera del portal (email, Slack, verbal)
- HR registra manualmente en `greenhouse_hr.leave_requests` los permisos aprobados
- No existe visibilidad del saldo de días disponibles por colaborador
- No hay calendario visual de ausencias del equipo
- El supervisor no tiene un flujo formal de aprobación
- No hay trazabilidad de quién aprobó, cuándo, ni con qué justificación

## Alcance

### Lo que ya existe (fundación)

| Pieza | Ubicación | Estado |
|-------|-----------|--------|
| Tabla `leave_types` | `greenhouse_hr.leave_types` | 7 tipos configurados (vacaciones, médico, personal, etc.) |
| Tabla `leave_requests` | `greenhouse_hr.leave_requests` | CRUD funcional, usado por Payroll |
| Vista `member_leave_360` | `greenhouse_serving.member_leave_360` | Proyección de permisos por persona |
| API HR Leave | `src/app/api/hr/core/leave/` | Endpoints CRUD para admin |
| Payroll integration | `src/lib/payroll/fetch-attendance-for-period.ts` | Descuenta permisos aprobados |
| Sidebar "Permisos" | `GH_HR_NAV.leave` | Menú ya existe pero vista es placeholder |

### Lo que falta construir

---

## Phase 1 — Leave Balance Engine

### Objetivo
Calcular y exponer saldos de días disponibles por tipo de permiso para cada colaborador.

### Modelo de datos (PostgreSQL)

```sql
-- Políticas de acumulación por tipo de permiso
CREATE TABLE IF NOT EXISTS greenhouse_hr.leave_policies (
  policy_id TEXT PRIMARY KEY,
  leave_type_id TEXT NOT NULL REFERENCES greenhouse_hr.leave_types(leave_type_id),
  accrual_type TEXT NOT NULL DEFAULT 'annual_fixed'
    CHECK (accrual_type IN ('annual_fixed', 'monthly_accrual', 'unlimited', 'custom')),
  annual_days NUMERIC(5,1) NOT NULL DEFAULT 15,
  max_carry_over_days NUMERIC(5,1) DEFAULT 0,
  requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
  min_advance_days INTEGER DEFAULT 0,
  max_consecutive_days INTEGER,
  applicable_employment_types TEXT[] DEFAULT ARRAY['full_time', 'part_time'],
  applicable_pay_regimes TEXT[] DEFAULT ARRAY['chile', 'international'],
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Saldos por colaborador por año
CREATE TABLE IF NOT EXISTS greenhouse_hr.leave_balances (
  balance_id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES greenhouse_core.members(member_id),
  leave_type_id TEXT NOT NULL REFERENCES greenhouse_hr.leave_types(leave_type_id),
  year INTEGER NOT NULL,
  entitled_days NUMERIC(5,1) NOT NULL DEFAULT 0,
  used_days NUMERIC(5,1) NOT NULL DEFAULT 0,
  pending_days NUMERIC(5,1) NOT NULL DEFAULT 0,
  carried_over_days NUMERIC(5,1) NOT NULL DEFAULT 0,
  adjustment_days NUMERIC(5,1) NOT NULL DEFAULT 0,
  available_days NUMERIC(5,1) GENERATED ALWAYS AS (entitled_days + carried_over_days + adjustment_days - used_days - pending_days) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT leave_balances_unique UNIQUE (member_id, leave_type_id, year)
);
```

### API Endpoints

- `GET /api/hr/core/leave/balances?memberId={id}&year={year}` — saldos por persona
- `GET /api/hr/core/leave/balances/team?year={year}` — saldos del equipo (supervisor/admin)
- `POST /api/hr/core/leave/balances/initialize` — inicializar saldos anuales (cron o manual)

### Lógica

- Al aprobar un request: `used_days += requested_days`, `pending_days -= requested_days`
- Al crear un request pendiente: `pending_days += requested_days`
- Al rechazar/cancelar: `pending_days -= requested_days`
- Carry-over: al inicializar año nuevo, trasladar hasta `max_carry_over_days`

---

## Phase 2 — Self-Service Leave Request UI

### Objetivo
Permitir que cualquier colaborador solicite permisos desde el portal.

### Entry points

1. **Mi Greenhouse → Mis Permisos** (`/my/leave`) — vista principal del colaborador
2. **People → [persona] → tab Perfil** — sección de permisos en el perfil (admin/HR view)
3. **Quick action** desde el sidebar: "Solicitar permiso"

### Vista "Mis Permisos" (`/my/leave`)

```
┌──────────────────────────────────────────────────────────────────┐
│ MIS PERMISOS                                    [+ Solicitar]    │
├──────────────────────────────────────────────────────────────────┤
│ SALDOS                                                           │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│ │ 10       │ │ 3        │ │ 2        │ │ 15       │            │
│ │ Disponib │ │ Usados   │ │ Pendient │ │ Total    │            │
│ │ Vacacione│ │ Vacacione│ │ aprobac. │ │ anuales  │            │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
├──────────────────────────────────────────────────────────────────┤
│ CALENDARIO                                       Mes ▼ Año ▼    │
│ ┌────────────────────────────────────────────────────────┐      │
│ │  FullCalendar (month view)                              │      │
│ │  - Mis permisos aprobados (verde)                       │      │
│ │  - Mis permisos pendientes (amarillo)                   │      │
│ │  - Feriados nacionales (gris)                           │      │
│ └────────────────────────────────────────────────────────┘      │
├──────────────────────────────────────────────────────────────────┤
│ HISTORIAL                                                        │
│ Table: Tipo | Desde | Hasta | Días | Estado | Aprobador          │
└──────────────────────────────────────────────────────────────────┘
```

### Formulario de solicitud (Drawer)

Componente: `LeaveRequestDrawer`

| Campo | Tipo | Validación |
|-------|------|------------|
| Tipo de permiso | Select (leave_types activos) | Required |
| Fecha inicio | DatePicker | Required, >= hoy + min_advance_days |
| Fecha fin | DatePicker | Required, >= fecha inicio, <= max_consecutive_days |
| Días solicitados | Auto-calculated | Excluye feriados y fines de semana |
| Motivo | TextField (optional) | Max 500 chars |
| Adjuntos | Dropzone (future) | Solo para médico — fase posterior |

**Validaciones en tiempo real:**
- Mostrar saldo disponible antes de confirmar
- Alertar si excede saldo disponible
- Alertar si hay traslape con otro permiso del mismo miembro
- Calcular días hábiles automáticamente (usando operational-calendar.ts)

### Outbox Events

```typescript
'leave_request.created'   // → notifica a supervisor
'leave_request.approved'  // → actualiza balance, notifica a solicitante
'leave_request.rejected'  // → libera pending_days, notifica a solicitante
'leave_request.cancelled' // → libera pending_days
```

---

## Phase 3 — Approval Flow

### Objetivo
Flujo de aprobación formal con notificación y trazabilidad.

### Modelo de aprobación

```
Colaborador → Solicita → Supervisor → Aprueba/Rechaza
                              ↓ (opcional)
                         HR Admin → Override / Aprueba sin supervisor
```

### Campos nuevos en `leave_requests`

```sql
ALTER TABLE greenhouse_hr.leave_requests
  ADD COLUMN IF NOT EXISTS requested_by_member_id TEXT REFERENCES greenhouse_core.members(member_id),
  ADD COLUMN IF NOT EXISTS approver_member_id TEXT REFERENCES greenhouse_core.members(member_id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
```

### API Endpoints

- `POST /api/hr/core/leave/requests` — crear solicitud (self-service)
- `PATCH /api/hr/core/leave/requests/{id}/approve` — aprobar (supervisor/admin)
- `PATCH /api/hr/core/leave/requests/{id}/reject` — rechazar con motivo
- `PATCH /api/hr/core/leave/requests/{id}/cancel` — cancelar (solicitante o admin)
- `GET /api/hr/core/leave/requests/pending` — solicitudes pendientes de aprobación

### Vista de aprobación (Supervisor)

Accesible desde:
- **Notificación in-app** → link directo a la solicitud
- **People → [persona]** → badge en el tab con count de pendientes
- **HR → Permisos** → lista de solicitudes pendientes del equipo

```
┌──────────────────────────────────────────────────────────────────┐
│ SOLICITUDES PENDIENTES                            Filtrar ▼      │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ 🟡 Daniela Ferreira — Vacaciones                          │  │
│ │    5 días · 15 abr → 19 abr 2026                          │  │
│ │    Saldo restante: 10 → 5 días                             │  │
│ │                                [Rechazar]  [✓ Aprobar]     │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ 🟡 Felipe Soto — Permiso médico                            │  │
│ │    1 día · 10 abr 2026                                     │  │
│ │    Saldo restante: 5 → 4 días                              │  │
│ │                                [Rechazar]  [✓ Aprobar]     │  │
│ └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Notifications

| Evento | Destinatario | Canal |
|--------|-------------|-------|
| Request creado | Supervisor | In-app + email |
| Request aprobado | Solicitante | In-app + email |
| Request rechazado | Solicitante | In-app + email (incluye motivo) |
| Request cancelado | Supervisor + HR | In-app |
| Saldo bajo (< 3 días) | Colaborador | In-app |

---

## Phase 4 — Team Absence Calendar

### Objetivo
Vista de calendario de ausencias del equipo completo para supervisores y HR.

### Entry point
- **HR → Permisos** → tab "Calendario"
- **Equipo → Capacidad** → widget de ausencias próximas

### Implementación

Usar `FullCalendar` (ya instalado, 6 paquetes) con:
- Vista month + list
- Cada permiso aprobado como evento
- Color por tipo de permiso
- Feriados nacionales como background events (desde `nager-date-holidays.ts`)
- Click en evento → drawer con detalle del permiso

### API

- `GET /api/hr/core/leave/calendar?from={date}&to={date}` — eventos de ausencia del equipo

---

## Phase 5 — Payroll Integration Hardening

### Objetivo
Conectar el flujo de aprobación con Payroll vía outbox events.

### Flujo

```
leave_request.approved
  → outbox event
    → reactive handler: update leave_balances
    → reactive handler: if payroll period is draft/calculated, flag for recalculation
    → reactive handler: if payroll period is exported, create deferred_adjustment
```

### Dependencia
Esta fase se complementa con **TASK-005** (work entries layer). Si TASK-005 se implementa primero, esta fase se reduce a emitir eventos. Si no, esta fase debe incluir la actualización directa de `leave_balances` y el flag de recálculo.

---

## Dependencies & Impact

### Depende de
- `greenhouse_hr.leave_types` — ya existe
- `greenhouse_hr.leave_requests` — ya existe, se extiende
- `greenhouse_core.members` — member_id, reports_to_member_id (supervisor chain)
- `src/lib/calendar/operational-calendar.ts` — cálculo de días hábiles
- `src/lib/calendar/nager-date-holidays.ts` — feriados nacionales
- Notification system (TASK-129, complete) — in-app notifications via webhook bus
- FullCalendar (instalado, no activado — TASK-137 ya lo activó como GreenhouseCalendar)

### Impacta a
- **TASK-005** — work entries layer puede consumir leave_requests aprobados
- **TASK-001** — payroll hardening: descuento de permisos se vuelve event-driven
- **GH_HR_NAV.leave** — vista placeholder se reemplaza con UI funcional
- **GH_MY_NAV.leave** — nueva vista self-service para el colaborador
- Person Detail → Perfil tab → potencial sección de "Permisos recientes"
- Capacidad del equipo → ausencias impactan disponibilidad

### Archivos owned
- `scripts/setup-postgres-leave-policies.sql` → **nuevo**
- `src/lib/hr-core/leave-balance.ts` → **nuevo**
- `src/app/api/hr/core/leave/balances/route.ts` → **nuevo**
- `src/app/api/hr/core/leave/requests/route.ts` → **extender** (self-service POST)
- `src/app/api/hr/core/leave/requests/[id]/approve/route.ts` → **nuevo**
- `src/app/api/hr/core/leave/requests/[id]/reject/route.ts` → **nuevo**
- `src/app/api/hr/core/leave/calendar/route.ts` → **nuevo**
- `src/views/greenhouse/my/MyLeaveView.tsx` → **nuevo**
- `src/views/greenhouse/hr-core/LeaveManagementView.tsx` → **nuevo**
- `src/views/greenhouse/hr-core/LeaveApprovalQueue.tsx` → **nuevo**
- `src/views/greenhouse/hr-core/LeaveCalendar.tsx` → **nuevo**
- `src/components/greenhouse/LeaveRequestDrawer.tsx` → **nuevo**
- `src/app/(dashboard)/my/leave/page.tsx` → **nuevo**
- `src/app/(dashboard)/hr/leave/page.tsx` → **extender**

---

## Acceptance Criteria

- [ ] Colaborador puede solicitar vacaciones/permisos desde el portal (self-service)
- [ ] Saldo de días se calcula correctamente (entitled - used - pending + carry_over + adjustment)
- [ ] Días solicitados excluyen feriados y fines de semana automáticamente
- [ ] Solicitud valida saldo disponible, traslape, y advance mínimo
- [ ] Supervisor recibe notificación y puede aprobar/rechazar con un click
- [ ] Aprobación actualiza saldo y emite outbox event para Payroll
- [ ] Rechazo incluye motivo y notifica al solicitante
- [ ] Colaborador puede cancelar solicitud pendiente
- [ ] Calendario FullCalendar muestra ausencias aprobadas + feriados
- [ ] HR admin puede ver y gestionar todas las solicitudes del equipo
- [ ] Historial de solicitudes con estado, fechas, aprobador
- [ ] Late approval (después de cálculo de nómina) genera flag o deferred adjustment
- [ ] Mobile responsive (solicitud y aprobación funcionan en mobile)

---

## Recomendación de ejecución

| Orden | Fase | Esfuerzo | Valor |
|-------|------|----------|-------|
| 1 | Phase 1 — Balance Engine | Medio | Foundation para todo lo demás |
| 2 | Phase 2 — Self-Service UI | Alto | Valor usuario directo, elimina proceso manual |
| 3 | Phase 3 — Approval Flow | Alto | Completa el circuito solicitud → aprobación |
| 4 | Phase 4 — Team Calendar | Medio | Visibilidad operativa para supervisores |
| 5 | Phase 5 — Payroll Integration | Bajo | Event-driven, complementa TASK-005 |

Phase 1 y 2 pueden ejecutarse juntas. Phase 3 requiere que Phase 1 esté completa (para validar saldos al aprobar). Phase 4 es independiente y puede hacerse en paralelo con Phase 3.
