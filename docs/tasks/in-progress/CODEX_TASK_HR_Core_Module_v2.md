# CODEX TASK — HR Core: Runtime Backend Foundation (v2)

## Resumen

`HR Core` no partía sobre un runtime previo sólido como Payroll. Esta `v2` toma el brief original, lo contrasta con arquitectura y aterriza la primera capa backend real del dominio sin invadir ownerships ya existentes.

Objetivo de esta v2:
- formalizar la extensión HR del colaborador sin duplicar identidad
- sembrar backend real para estructura organizacional, permisos, asistencia y perfil HR
- dejar contratos claros para que Claude implemente frontend después

## Resultado del contraste con arquitectura

Esta task fue contrastada contra:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V1.md`
- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md`

Conclusiones obligatorias:
- `Collaborator` sigue anclado a `greenhouse.team_members.member_id`
- `HR Core` no debe crear un `employee_master_id` paralelo
- `Admin Team` mantiene ownership del roster base y asignaciones
- `People` sigue siendo la vista read-first 360 del colaborador
- `Payroll` mantiene ownership de compensaciones, períodos y entries
- `HR Core` puede crear tablas de dominio para:
  - estructura org
  - perfil HR sensible/profesional
  - permisos
  - asistencia
  - historial de aprobaciones

## Decisiones de modelado de esta v2

### Qué sigue viviendo en `team_members`

Se agregan como extensión controlada del colaborador:
- `department_id`
- `reports_to`
- `job_level`
- `hire_date`
- `contract_end_date`
- `daily_required`

Estas columnas viven en `team_members` porque son atributos estructurales del colaborador y deben poder recomponerse desde `People`, `Admin Team`, `Payroll` y HR.

### Qué vive en tabla HR propia

Se crea `greenhouse.member_profiles` para la capa HR sensible/profesional:
- identidad documental
- contacto de emergencia
- previsión
- bancarios
- CV / LinkedIn / portfolio
- skills / tools / AI suites
- fortalezas / oportunidades de mejora / tipos de piezas
- snapshots de performance profesional

Esto evita cargar toda la semántica HR sensible dentro de `team_members` y mantiene a `HR Core` como extensión del colaborador, no como identidad paralela.

### Route group `employee`

Se agrega la foundation backend para `employee`:
- rol `employee` seed en `greenhouse.roles`
- `route_group_scope = ['internal', 'employee']`
- `tenant/access.ts` y `tenant/authorization.ts` ahora reconocen `employee`

Esto no implica que el frontend de autoservicio ya exista, pero deja listo el backend para futuras superficies `my leave` y `my attendance`.

## Backend activo cerrado en esta v2

### Infraestructura runtime

Se agregó:
- `src/lib/hr-core/schema.ts`
- `scripts/setup-hr-core-tables.sql`

Bootstrap on-demand:
- extiende `greenhouse.team_members`
- crea `greenhouse.departments`
- crea `greenhouse.member_profiles`
- crea `greenhouse.leave_types`
- crea `greenhouse.leave_balances`
- crea `greenhouse.leave_requests`
- crea `greenhouse.leave_request_actions`
- crea `greenhouse.attendance_daily`
- seed de rol `employee`
- seed de leave types base

### Capa de servicio

Se agregó:
- `src/types/hr-core.ts`
- `src/lib/hr-core/shared.ts`
- `src/lib/hr-core/service.ts`

Responsabilidades ya cubiertas:
- metadata y enums server-side
- resolución del colaborador actual a partir de `client_users` + `identity_profile_id` / email aliases
- listado y CRUD base de departamentos
- perfil HR por colaborador
- leave balances por año
- leave requests con workflow:
  - `pending_supervisor`
  - `pending_hr`
  - `approved`
  - `rejected`
  - `cancelled`
- journal de acciones de leave request
- attendance read model
- ingestión webhook de attendance con shared secret

## Endpoints activos

### Lectura compartida `employee` / `hr` / `admin`

- `GET /api/hr/core/meta`
- `GET /api/hr/core/departments`
- `GET /api/hr/core/members/[memberId]/profile`
- `GET /api/hr/core/leave/balances`
- `GET /api/hr/core/leave/requests`
- `GET /api/hr/core/leave/requests/[requestId]`
- `GET /api/hr/core/attendance`

### Gestión HR / admin

- `POST /api/hr/core/departments`
- `PATCH /api/hr/core/departments/[departmentId]`
- `PATCH /api/hr/core/members/[memberId]/profile`

### Workflow de permisos

- `POST /api/hr/core/leave/requests`
- `POST /api/hr/core/leave/requests/[requestId]/review`

### Attendance webhook

- `POST /api/hr/core/attendance/webhook/teams`

Autorización:
- requiere header `Authorization: Bearer <HR_CORE_TEAMS_WEBHOOK_SECRET>`
  o `x-hr-core-webhook-secret`

## Contrato operativo por audiencia

### Employee

Puede:
- ver departamentos
- ver metadata útil para formularios
- ver su propio perfil HR
- ver sus balances
- crear permisos
- ver sus solicitudes
- cancelar o responder sobre sus solicitudes vía review `action = cancel`
- ver su propia asistencia

No puede:
- leer perfiles HR de otros
- editar perfiles HR de otros
- crear o modificar departamentos
- ver balances globales

### Supervisor

Sin route group nuevo adicional todavía. La capacidad sale del mismo backend:
- si el colaborador actual aparece como `reports_to` de otros, `GET /api/hr/core/leave/requests` le devuelve solicitudes donde es `supervisor_member_id`
- puede revisar vía `POST /api/hr/core/leave/requests/[requestId]/review`

### HR / Admin

Pueden:
- ver y editar perfiles HR
- crear/editar departamentos
- ver balances y solicitudes globales
- aprobar/rechazar solicitudes en fase HR
- consumir attendance y webhook tooling

## Payloads ejemplo

### 1. Crear departamento

`POST /api/hr/core/departments`

```json
{
  "departmentId": "globe-operations",
  "name": "Globe Operations",
  "businessUnit": "globe",
  "description": "Operaciones y gestión de producción",
  "sortOrder": 20
}
```

### 2. Actualizar perfil HR de colaborador

`PATCH /api/hr/core/members/member-daniela-ferreira/profile`

```json
{
  "departmentId": "globe-operations",
  "reportsTo": "julio-reyes",
  "jobLevel": "lead",
  "hireDate": "2024-03-01",
  "employmentType": "full_time",
  "healthSystem": "none",
  "cvUrl": "https://drive.google.com/...",
  "skills": ["project management", "creative ops"],
  "tools": ["notion", "figma", "chatgpt-team"],
  "aiSuites": ["chatgpt-team", "claude-opus"],
  "strengths": ["stakeholder management", "delivery rigor"],
  "improvementAreas": ["delegation"],
  "avgMonthlyVolume": 42
}
```

### 3. Solicitar permiso

`POST /api/hr/core/leave/requests`

```json
{
  "leaveTypeCode": "vacation",
  "startDate": "2026-04-06",
  "endDate": "2026-04-10",
  "requestedDays": 5,
  "reason": "Vacaciones planificadas",
  "notes": "Cobertura coordinada con el equipo"
}
```

### 4. Aprobar o rechazar solicitud

`POST /api/hr/core/leave/requests/[requestId]/review`

```json
{
  "action": "approve",
  "notes": "Aprobado por supervisor"
}
```

### 5. Ingestar attendance desde Teams

`POST /api/hr/core/attendance/webhook/teams`

```json
{
  "entries": [
    {
      "participantEmail": "camila@efeoncepro.com",
      "attendanceDate": "2026-03-14",
      "attendanceStatus": "present",
      "sourceSystem": "teams",
      "sourceReference": "daily-2026-03-14",
      "meetingJoinedAt": "2026-03-14T12:01:00.000Z",
      "meetingLeftAt": "2026-03-14T12:17:00.000Z",
      "minutesPresent": 16
    }
  ]
}
```

## Reglas para Claude frontend

- no crear un CRUD paralelo de colaboradores dentro de HR Core; el roster base sigue viniendo de `Admin Team`
- no inferir supervisor localmente; usar las respuestas ya filtradas del backend
- no recalcular balances disponibles si el backend ya entrega `availableDays`
- no exponer campos sensibles de identidad o bancarios fuera de vistas HR/admin
- usar `GET /api/hr/core/meta` como fuente de enums y catálogos

## Variables de entorno nuevas

- `HR_CORE_TEAMS_WEBHOOK_SECRET`
  - propósito: proteger la ingestión externa de asistencia
  - entornos: `Development`, `Preview`, `Staging`, `Production`

## QA runtime 2026-03-15 — flujos activos

### Flujos mapeados

- dashboard HR:
  - permisos pendientes
  - departamentos
  - asistencia reciente
- departamentos:
  - lista
  - alta
  - edición
- permisos:
  - metadata
  - creación de solicitud
  - revisión
  - balances
- asistencia:
  - listado y filtros

### Fix aplicado en esta pasada QA

- `src/views/greenhouse/hr-core/HrLeaveView.tsx`
  - la UI de revisión solo permitía `approve` / `reject`
  - backend ya soportaba `cancel`, por lo que faltaba el camino operativo para cancelar solicitudes pendientes desde pantalla
  - ahora el diálogo expone `Cancelar solicitud` y usa el endpoint backend real

### Estado después del QA

- `HR Core` queda con sus flujos principales visibles y operables desde frontend
- no apareció en esta pasada otro bloqueo de flujo equivalente en departamentos o asistencia
- falta validación runtime autenticada sobre permisos reales por rol `employee` vs `hr`

## Fuera de alcance de esta v2

- UI completa de `employee` route group
- calendario visual de ausencias
- writeback automático hacia Payroll por ausencias aprobadas
- integración real con Microsoft Graph o Teams subscriptions
- analytics avanzados de performance histórica dentro de HR Core

## Próximo paso para Claude

Claude ya puede construir frontend sobre:

1. HR dashboard/base module
- departamentos
- perfil HR por colaborador
- cola de permisos
- attendance list

2. Employee self-service
- mis permisos
- mis balances
- mi asistencia

3. Supervisor review
- lista de solicitudes pendientes
- flujo approve/reject sobre `review`
