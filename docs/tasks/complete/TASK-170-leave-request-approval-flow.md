# TASK-170 - Leave Request, Approval, Calendar And Cross-Module Impact

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Status real: `Cerrada`
- Rank: `TBD`
- Domain: `hr`

## Delta 2026-03-31

- La task ya no debe leerse como “crear Permisos desde cero”.
- El runtime real ya existe en PostgreSQL y UI:
  - `greenhouse_hr.leave_types`
  - `greenhouse_hr.leave_balances`
  - `greenhouse_hr.leave_requests`
  - `greenhouse_hr.leave_request_actions`
  - `greenhouse_serving.member_leave_360`
  - `greenhouse_serving.person_hr_360`
  - `GET /api/hr/core/leave/balances`
  - `GET/POST /api/hr/core/leave/requests`
  - `POST /api/hr/core/leave/requests/[requestId]/review`
  - `/hr/leave`
  - `/my/leave`
- La brecha real ya no es CRUD básico:
  - faltan policies y validación legal-operativa canónica
  - faltan calendario de ausencias y request UX self-service más completo
  - faltan eventos granulares y consumers reactivos explícitos para notifications y payroll impact
  - falta dejar documentada la sinergia real con `Payroll`, `Finance`, `Cost Intelligence`, `Providers` y `AI Tooling`
- Regla nueva de lectura:
  - el impacto hacia costos, finanzas, providers y tooling no nace directo desde leave
  - el carril canónico es `leave -> payroll period/entry impact -> projections existentes`
  - no crear modelos paralelos de costo o vendor dentro de `HR`

## Delta 2026-03-31 — implementación aplicada

- Quedó implementado el cálculo canónico de días hábiles desde la capa hija `leave-domain`, sin confiar en `requestedDays` del caller.
- Se agregó `leave_policies` + semántica de balances con `progressive_extra_days`, `adjustment_days` y `accumulated_periods`.
- `/hr/leave` y `/my/leave` ya consumen calendario derivado desde el runtime canónico.
- El outbox ahora emite eventos granulares:
  - `leave_request.created`
  - `leave_request.escalated_to_hr`
  - `leave_request.approved`
  - `leave_request.rejected`
  - `leave_request.cancelled`
  - `leave_request.payroll_impact_detected`
- `notification_dispatch` ya cubre revisión, estado del solicitante y alertas payroll/finance.
- `leave_request.payroll_impact_detected` ahora puede recalcular nómina oficial para períodos no exportados antes de que se refresquen consumers de costo.
- `Staff Augmentation` vuelve a refrescar snapshots al materializarse `commercial_cost_attribution`, cerrando mejor la sinergia indirecta con leave vía payroll.

## Delta 2026-03-31 — aplicación real en GCP

- El setup canónico quedó aplicado en `greenhouse-pg-dev / greenhouse_app` usando Cloud SQL Connector.
- Validaciones efectivas:
  - `pg:doctor --profile=runtime`
  - `pg:doctor --profile=migrator`
  - `pg:doctor --profile=admin`
  - `setup:postgres:hr-leave`
  - `setup:postgres:person-360-contextual`
- Se corrigió drift de ownership en objetos `greenhouse_hr.leave_*` para que `setup:postgres:hr-leave` vuelva a ser reproducible con `migrator`.
- Lectura runtime posterior validada:
  - `leave_policies = 10`
  - `leave_types = 10`
  - `leave_balances = 4`

## Summary

Cerrar la lane operativa de permisos sobre el baseline ya existente de HR Core, endureciendo:

- cálculo y validación de solicitudes según policy y calendario operativo
- aprobación/cancelación con eventos de outbox semánticos
- calendario de ausencias para HR/supervisores
- notificaciones y señal reactiva hacia Payroll cuando una licencia altera un período ya calculado o cerrado

El objetivo no es duplicar módulos de `Finance`, `Providers` o `AI Tooling`, sino conectar `leave` al grafo canónico que ya existe en el repo.

## Why This Task Exists

Hoy el módulo está a medio camino:

- sí existe request flow y approval flow básico
- sí existen balances básicos y serving views
- sí existe integración de permisos aprobados en `Payroll`
- sí existe outbox para leave

Pero todavía hay drift importante:

1. La task asumía rutas, tablas y vistas “nuevas” que ya están implementadas.
2. El cálculo de días sigue dependiendo de `requestedDays` entregado por el caller en vez de una semántica canónica de calendario.
3. No existe `leave_policies` como capa explícita para reglas de negocio y compliance Chile.
4. El outbox actual publica eventos demasiado genéricos (`created`, `reviewed`) para consumers downstream.
5. No existe una vista/calendario de ausencias alineada al baseline `GreenhouseCalendar`.
6. La sinergia real con `Payroll`, `Cost Intelligence`, `Finance`, `Providers` y `AI Tooling` no está documentada ni señalizada correctamente para futuros agentes.

## Goal

- Convertir `leave` en un dominio HR consistente con policy, calendario, balances y trazabilidad.
- Emitir eventos granulares que permitan notificar y detectar impacto en nómina sin inventar carriles alternos.
- Exponer calendario y UX self-service compatibles con el runtime existente.
- Dejar explícito que los impactos económicos y de tooling viajan por `Payroll` y las projections existentes, no por tablas nuevas en HR.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/operations/GREENHOUSE_DATA_MODEL_DOCUMENT_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- `greenhouse_core.members` sigue siendo la ancla canónica del colaborador.
- `leave` vive en `greenhouse_hr`; no crea identidad, costo ni provider paralelos.
- `Payroll` sigue siendo owner de `payroll_periods` y `payroll_entries`.
- `Finance`, `Cost Intelligence`, `Providers` y `AI Tooling` consumen impactos derivados a través de carriles ya existentes (`payroll_entry`, `member_capacity_economics`, `commercial_cost_attribution`, `provider_tooling`), no desde `leave_requests` directo salvo alertas operativas explícitas.
- La lógica de días hábiles debe depender de `src/lib/calendar/operational-calendar.ts` y `src/lib/calendar/nager-date-holidays.ts`.
- Los eventos deben publicarse en `greenhouse_sync.outbox_events` y disparar projections/notifications usando el bus reactivo existente.

## Dependencies & Impact

### Depends on

- `greenhouse_hr.leave_types`
- `greenhouse_hr.leave_balances`
- `greenhouse_hr.leave_requests`
- `greenhouse_hr.leave_request_actions`
- `greenhouse_serving.member_leave_360`
- `greenhouse_serving.person_hr_360`
- `src/lib/calendar/operational-calendar.ts`
- `src/lib/calendar/nager-date-holidays.ts`
- `TASK-005` como follow-on del carril `work entries`, no como prerequisito para cerrar esta lane
- `TASK-129` notificaciones in-app via webhook bus
- projections y consumers ya vigentes:
  - `notification_dispatch`
  - `person_intelligence`
  - `member_capacity_economics`
  - `provider_tooling`
  - `commercial_cost_attribution`
  - `operational_pl`

### Impacts to

- `/hr/leave`
- `/my/leave`
- `People 360` vía `person_hr_360`
- `Payroll` al detectar períodos afectados por licencias aprobadas/canceladas/rechazadas
- `TASK-005` porque la futura capa `work_entries` debe consumir este contrato semántico actualizado
- `TASK-028` y futuras lanes de approvals porque `leave_request_actions` sigue siendo el patrón

### Files owned

- `scripts/setup-postgres-hr-leave.sql`
- `src/lib/hr-core/postgres-leave-store.ts`
- `src/lib/hr-core/service.ts`
- `src/lib/hr-core/shared.ts`
- `src/types/hr-core.ts`
- `src/app/api/hr/core/leave/balances/route.ts`
- `src/app/api/hr/core/leave/requests/route.ts`
- `src/app/api/hr/core/leave/requests/[requestId]/review/route.ts`
- `src/app/api/hr/core/leave/calendar/route.ts`
- `src/app/api/my/leave/route.ts`
- `src/views/greenhouse/hr-core/HrLeaveView.tsx`
- `src/views/greenhouse/my/MyLeaveView.tsx`
- `src/lib/sync/event-catalog.ts`
- `src/lib/sync/projections/notifications.ts`
- `src/lib/sync/projections/index.ts`
- `docs/tasks/README.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Ya existe

- Store Postgres-first para leave con create/review/list.
- Balances básicos autoinicializados por año.
- Workflow de estados:
  - `pending_supervisor`
  - `pending_hr`
  - `approved`
  - `rejected`
  - `cancelled`
- Integración actual con `Payroll`:
  - `fetchAttendanceForPeriod()` ya consume `leave_requests` aprobados
- Contexto serving:
  - `member_leave_360`
  - `person_hr_360`
- UX base:
  - `/hr/leave`
  - `/my/leave`

### Gap actual

- No hay `leave_policies` ni semántica legal explícita para vacaciones Chile.
- El request usa `requestedDays` como input del cliente y no lo deriva canónicamente.
- Falta calendario de ausencias y surface centrada en eventos de ausencia.
- Los eventos de outbox son demasiado genéricos para consumers downstream.
- Falta detección formal de impacto en períodos de nómina ya creados/calculados/aprobados/exportados.
- La task seguía describiendo `member_leave_360` como si fuera la única view relevante y omitía `person_hr_360`.
- La task no explicaba el puente real hacia costos/finanzas/providers/tooling.

## Scope

### Slice 1 - Policy And Calendar Semantics

- Introducir `greenhouse_hr.leave_policies`.
- Derivar días hábiles automáticamente con calendario operativo y feriados.
- Validar saldo, anticipación mínima, traslapes y reglas de policy.
- Dejar explícitas las reglas Chile donde aplican y el fallback razonable donde no haya dato suficiente.

### Slice 2 - Runtime And API Hardening

- Extender request/review payloads y respuestas con contexto de policy e impacto.
- Publicar eventos granulares:
  - `leave_request.created`
  - `leave_request.escalated_to_hr`
  - `leave_request.approved`
  - `leave_request.rejected`
  - `leave_request.cancelled`
  - `leave_request.payroll_impact_detected`
- Mantener compatibilidad con el carril actual de `/review` sin abrir un árbol de endpoints duplicados.

### Slice 3 - Calendar And Self-Service UX

- Convertir `/my/leave` en una vista útil de solicitud + historial + calendario.
- Extender `/hr/leave` con tab de calendario y cola de aprobación mejor conectada al runtime.
- Reutilizar `GreenhouseCalendar`, no introducir otra librería o wrapper.

### Slice 4 - Reactive Consumers And Cross-Module Impact

- Notificar a supervisor/solicitante/HR según evento.
- Detectar períodos de payroll impactados y alertar a payroll ops/finance cuando corresponda.
- Dejar explícito el path de sinergia:
  - leave aprobado/no pagado
  - recalculo o ajuste de payroll
  - `payroll_entry.upserted`
  - refresh de `member_capacity_economics`, `person_intelligence`, `provider_tooling`, `commercial_cost_attribution`, `operational_pl`

## Out of Scope

- Construir en esta lane la capa completa `work_entries` de `TASK-005`.
- Crear contabilidad o journal entries nuevos en `Finance` directo desde leave.
- Recalcular automáticamente períodos exportados sin una política explícita de Payroll.
- Crear una “approval engine” genérica separada; se reutiliza el patrón existente del dominio.
- Resolver aquí todos los casos futuros de licencias por horas, media jornada y adjuntos clínicos complejos.

## Cross-Module Synergy Contract

### Payroll

- `leave` sigue siendo source of truth de licencias aprobadas.
- `Payroll` sigue consumiendo permisos aprobados para asistencia/ausencia.
- Si una licencia afecta un período ya existente:
  - se debe detectar el impacto
  - se debe publicar señal operativa para revisión/recálculo

### Finance And Cost Intelligence

- `leave` no ajusta costos directos por sí solo.
- El impacto financiero nace cuando `Payroll` materializa la nueva nómina o el ajuste del período.
- `Finance`, `member_capacity_economics`, `commercial_cost_attribution` y `operational_pl` deben seguir reaccionando a eventos de nómina, no a `leave_request.*` directo salvo notificaciones/alertas.

### Providers And AI Tooling

- No existe relación directa `leave -> provider/tool`.
- La sinergia se da por costo/persona y por `payroll_entry`.
- Una vez recalculada la nómina, las projections existentes ya refrescan snapshots provider-centric; esta task no debe duplicar esa lógica.

## Acceptance Criteria

- [x] La task queda reconciliada al runtime real del repo y ya no asume piezas inexistentes o “nuevas” que ya estaban implementadas.
- [x] El dominio leave calcula días solicitados desde calendario operativo y no depende ciegamente del input del cliente.
- [x] Existe `leave_policies` como capa de policy explícita para validaciones y balances.
- [x] `/my/leave` y `/hr/leave` exponen historial, solicitud y calendario sobre el runtime actual.
- [x] El bus de outbox publica eventos granulares por create/escalation/approve/reject/cancel/payroll impact.
- [x] Notifications cubre supervisor, solicitante y stakeholders operativos cuando corresponde.
- [x] Cuando una licencia aprobada/rechazada/cancelada impacta payroll existente, queda señal operativa explícita.
- [x] El documento deja claro el carril de sinergia hacia `Payroll`, `Finance`, `Cost Intelligence`, `Providers` y `AI Tooling`.

## Verification

- `pnpm exec vitest run` para dominio leave, notifications y helpers de calendario impactados
- `pnpm exec eslint` sobre archivos tocados
- `pnpm build`
- `pnpm pg:doctor --profile=runtime`
- `pnpm pg:doctor --profile=migrator`
- `pnpm pg:doctor --profile=admin`
- `pnpm setup:postgres:hr-leave`
- `pnpm setup:postgres:person-360-contextual`
- validación manual autenticada de `/my/leave` y `/hr/leave` queda como smoke follow-on opcional, no como bloqueo de cierre
