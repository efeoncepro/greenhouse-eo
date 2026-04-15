# ISSUE-049 — Leave review puede fallar con acción stale y policy frágil de aprobación

## Ambiente

staging (`dev-greenhouse.efeoncepro.com`) + runtime general de HR Leave

## Detectado

2026-04-15, reporte manual de usuario sobre `HR > Permisos y ausencias > Solicitudes` al revisar una solicitud pendiente.

## Síntoma

Desde la UI de `Revisar solicitud`, al intentar operar una solicitud pendiente puede aparecer el banner:

- `Unable to review leave request.`

Además, la superficie actual de review presenta dos comportamientos frágiles:

- el modal muestra acciones que no siempre son válidas para el actor y el estado real de la solicitud
- la acción enviada por la UI puede no coincidir con el botón recién presionado

Esto vuelve el flujo difícil de confiar para supervisors, HR y admins.

## Causa raíz

La causa inmediata confirmada en staging para el `500` de review fue una falla SQL en el camino de override HR sobre solicitudes `pending_supervisor`:

- `POST /api/hr/core/leave/requests/:id/review`
- PostgreSQL devolvió `42P08: could not determine data type of parameter $4`
- el query afectado está en `applyWorkflowApprovalOverrideInTransaction()` al reutilizar parámetros dentro de `jsonb_build_object(...)` sin casteo explícito

Además del root cause inmediato, el flujo tenía dos fragilidades estructurales que hacen la revisión menos confiable de lo necesario:

1. `HrLeaveView` despachaba la review usando estado React recién mutado (`reviewAction`) y luego disparaba el fetch en el mismo tick, abriendo la puerta a acciones stale.
2. El modal de review no usaba una policy compartida para decidir qué acciones son válidas por actor y por estado (`pending_supervisor`, `pending_hr`, propia solicitud, HR/admin, supervisor efectivo).

## Impacto

- Revisar permisos deja de ser confiable para supervisores y HR.
- Un actor puede ver o intentar acciones que no corresponden a su authority real.
- La UI puede enviar una acción distinta a la que el usuario cree estar ejecutando.
- Requests pendientes con estado/snapshot inconsistente quedan expuestas a errores genéricos en vez de resolverse con un carril determinístico y auditable.

## Solución

Remediación robusta y escalable:

- castear explícitamente los parámetros reutilizados dentro del `jsonb_build_object(...)` del override HR
- centralizar la policy de review de permisos en un helper puro compartido entre UI y backend
- usar dispatch explícito de la acción clickeada en el modal, sin depender de state asíncrono como fuente inmediata del POST
- alinear la surface visual para mostrar solo acciones válidas según actor + estado + authority efectiva
- cubrir la regresión con tests focalizados de policy, UI y store SQL

## Verificación

Pendiente de ejecutar después del fix:

1. tests unitarios del helper de policy de review
2. tests del modal `HrLeaveView` asegurando que cada botón envía la acción correcta y que los botones inválidos no aparecen
3. tests de `reviewLeaveRequestInPostgres` cubriendo bootstrap/resiliencia de snapshots de aprobación
4. smoke local del flujo `pending_supervisor` y `pending_hr`
5. validación en staging del review real sobre `HR > Permisos`

## Estado

open

## Relacionado

- `src/views/greenhouse/hr-core/HrLeaveView.tsx`
- `src/app/api/hr/core/meta/route.ts`
- `src/lib/hr-core/postgres-leave-store.ts`
- `src/lib/hr-core/service.ts`
- `src/types/hr-core.ts`
- `docs/tasks/complete/TASK-326-approval-authority-workflow-snapshots.md`
