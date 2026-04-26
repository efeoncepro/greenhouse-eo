# TASK-388 — Notificaciones In-App: Acciones Inline

## Delta 2026-04-26 — converge con Notification Hub (TASK-690 / TASK-693)

**No deprecada — scope reducido a UI bell.** El concepto "acciones inline desde la notificación sin abrir otra pantalla" es exactamente el mismo loop bidireccional que TASK-693 ya define para Teams Action.Submit. La sinergia: el `actionId` del action-registry (`src/lib/teams-bot/action-registry.ts`) sirve para ambas superficies. Click en bell o click en Teams card invocan el mismo handler que actualiza `notification_intents.status='acknowledged'` con `acknowledged_via='in_app'` o `'teams_action_submit'`.

**Scope ajustado:**

- Backend: REUSA el `action-registry` y los handlers de TASK-693. NO crea su propia tabla de actions ni su propio dispatcher.
- Persistencia de la acción: REUSA `notification_intents` + `notification_deliveries` (esquema TASK-690). El handler ya escribe ahí.
- Esta task se queda con el frontend: render del action button en el row del bell, optimistic update, error feedback, accesibilidad.
- Tipos de acciones soportadas en V1 dependen de los handlers que TASK-693 entrega: `notification.mark_read`, `ops.alert.snooze`, `finance.expense.approve` (cuando exista). Esta task agrega los 1-2 patterns nuevos que el bell necesita (ej. `leave.request.approve`, `leave.request.reject`).
- **Bloqueada por TASK-693** ahora (en vez de TASK-285 directo).

**Importante:** la versión "rebuild from scratch" de la task está OBSOLETA. Si alguien la toma sin leer este Delta, va a duplicar el action-registry y crear deuda.

## Orden de implementación recomendado

1. **TASK-690** Notification Hub Architecture Contract — establece el contrato de `notification_intents` que esta task lee.
2. **TASK-691** Shadow + **TASK-692** Cutover — projection canónica activa.
3. **TASK-693** Notification Hub Bidireccional + UI + Mentions — entrega `action-registry`, handlers reales, contrato Action.Submit. Define el `actionId` + payload shape.
4. **ESTA task (TASK-388)** — implementa el render del action button en el row del bell del portal, optimistic update, error feedback, accesibilidad. Reusa el dispatch existente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-388-notifications-acciones-inline`
- Legacy ID: none
- GitHub Issue: none

## Summary

Las notificaciones actuales solo tienen `action_url` — un link que lleva a otra pantalla. Un supervisor que recibe "Solicitud de permiso de Ana García" debe navegar a `/hr/leave`, buscar la solicitud y aprobarla desde allí. Esta task agrega **acciones inline**: botones directamente en la notificación (Aprobar / Rechazar) que ejecutan la acción sin cambiar de pantalla, con confirmación optimistic y feedback de resultado.

## Why This Task Exists

La fricción de navegar a otra pantalla para ejecutar una acción simple (aprobar un permiso, confirmar una tarea) aumenta el tiempo de respuesta y reduce la tasa de uso del sistema de notificaciones. Las plataformas enterprise (Slack, Linear, GitHub) permiten ejecutar acciones desde la notificación misma. Para Greenhouse, las aprobaciones de HR son el caso de uso más claro: el supervisor aprueba o rechaza directamente desde la campana.

## Goal

- Las notificaciones de categoría `leave_review` incluyen botones "Aprobar" y "Rechazar" en el dropdown y en el feed
- La acción se ejecuta contra la API existente sin navegación adicional
- El resultado (éxito o error) se muestra inline con feedback optimistic
- El modelo de datos de notificaciones es extensible: otras categorías pueden agregar acciones en el futuro

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` — contrato de aprobación de permisos
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — la acción debe validar permisos en el servidor, no solo en cliente

Reglas obligatorias:

- Las acciones inline son un atajo de UX — el endpoint de destino (ej. `POST /api/hr/core/leave/[id]/decision`) debe seguir validando permisos completos en el servidor
- El payload de la acción se guarda en `notifications.metadata` al crear la notificación — no se infiere desde el cliente
- Una notificación puede tener 0, 1 o N acciones — el schema debe ser extensible
- Las acciones se deshabilitan si la notificación ya fue actada (ej. el permiso ya fue aprobado por otro revisor)

## Normative Docs

- `src/lib/notifications/notification-service.ts` — donde se crea la notificación, debe incluir `actions` en metadata
- `src/lib/sync/projections/notifications.ts` — donde se disparan las notificaciones de HR
- `src/app/api/hr/core/leave/[id]/decision/route.ts` — endpoint existente de aprobación [verificar]
- `src/components/layout/shared/NotificationsDropdown.tsx` — UI a extender

## Dependencies & Impact

### Depends on

- `greenhouse_notifications.notifications.metadata` (JSONB) — ya existe, se usa para guardar el payload de acciones
- `src/app/api/hr/core/leave/[id]/decision/route.ts` — debe existir y aceptar la acción desde notificación

### Blocks / Impacts

- TASK-387 (agrupación) — las acciones inline aplican a grupos: "Aprobar todas" para grupos de leave_review
- TASK-386 (SSE) — tras ejecutar una acción, el SSE actualiza al resto de revisores

### Files owned

- `src/lib/notifications/notification-service.ts` — extender payload para incluir `actions`
- `src/lib/sync/projections/notifications.ts` — agregar `actions` al dispatch de leave_review
- `src/components/greenhouse/notifications/NotificationActionBar.tsx` — nuevo componente de acciones
- `src/components/layout/shared/NotificationsDropdown.tsx` — integrar NotificationActionBar
- `src/views/greenhouse/notifications/NotificationsPageView.tsx` — integrar NotificationActionBar
- `src/app/api/notifications/[id]/action/route.ts` — nuevo endpoint proxy de acciones

## Current Repo State

### Already exists

- `greenhouse_notifications.notifications.metadata` (JSONB) — disponible para guardar actions
- `src/lib/notifications/notification-service.ts` — dispatch de notificaciones
- `src/lib/sync/projections/notifications.ts` — dispatch de leave_review con datos del request
- `src/components/layout/shared/NotificationsDropdown.tsx` — sin soporte de acciones
- Endpoint de decisión de permiso [verificar ruta exacta durante Discovery]

### Gap

- No hay schema de `actions` en el payload de notificaciones
- No hay componente de acciones inline
- No hay endpoint proxy `/api/notifications/[id]/action`
- `projections/notifications.ts` no incluye `actions` en el dispatch de `leave_review`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema de acciones en metadata

- Definir el tipo `NotificationAction` en `src/types/notifications.ts`:
  ```typescript
  interface NotificationAction {
    id: string           // ej. 'approve', 'reject'
    label: string        // ej. 'Aprobar'
    variant: 'primary' | 'danger' | 'secondary'
    endpoint: string     // ej. '/api/hr/core/leave/req-123/decision'
    method: 'POST' | 'PATCH'
    body: Record<string, unknown>  // payload a enviar
    confirmLabel?: string          // si requiere confirmación
    disabledWhen?: string          // condición de deshabilitación en metadata
  }
  ```
- Actualizar `NotificationService.dispatch()` para aceptar `actions?: NotificationAction[]` y guardarlas en `metadata.actions`

### Slice 2 — Dispatch de acciones en leave_review

- En `src/lib/sync/projections/notifications.ts`, al crear notificación de `leave_request.created` (categoría `leave_review`):
  ```typescript
  actions: [
    {
      id: 'approve',
      label: 'Aprobar',
      variant: 'primary',
      endpoint: `/api/hr/core/leave/${requestId}/decision`,
      method: 'POST',
      body: { decision: 'approved', reviewedBy: recipientUserId }
    },
    {
      id: 'reject',
      label: 'Rechazar',
      variant: 'danger',
      endpoint: `/api/hr/core/leave/${requestId}/decision`,
      method: 'POST',
      body: { decision: 'rejected', reviewedBy: recipientUserId },
      confirmLabel: '¿Confirmar rechazo?'
    }
  ]
  ```

### Slice 3 — Endpoint proxy de acciones

- Crear `POST /api/notifications/[id]/action` con body `{ actionId: string }`
- Lee la notificación del DB, extrae `metadata.actions`, encuentra la acción por `actionId`
- Valida que el usuario autenticado es el dueño de la notificación
- Ejecuta `fetch(action.endpoint, { method, body })` internamente
- Marca la notificación como leída si la acción tiene éxito
- Retorna el resultado de la acción al cliente

### Slice 4 — Componente NotificationActionBar

- Crear `src/components/greenhouse/notifications/NotificationActionBar.tsx`
- Renderiza los botones de acción desde `notification.metadata.actions`
- Estado: idle → loading → success/error
- Optimistic: deshabilita los botones mientras procesa
- Al éxito: muestra feedback inline ("Permiso aprobado") y refresca el listado
- Integrar en dropdown y en el feed completo

## Out of Scope

- Acciones inline para categorías distintas a `leave_review` en esta task (el sistema queda extensible)
- Acciones con modal de detalle complejo (ej. ingresar motivo de rechazo en campo de texto) — esas siguen usando `action_url`
- Acciones en grupos (TASK-387)

## Detailed Spec

### Flujo de ejecución de acción inline

```
Usuario hace click en "Aprobar"
  ↓
NotificationActionBar: POST /api/notifications/{id}/action { actionId: 'approve' }
  ↓
API proxy: lee metadata.actions, encuentra 'approve'
  ↓
API proxy: POST /api/hr/core/leave/{requestId}/decision { decision: 'approved' }
  ↓
Si 200: marca notificación como leída, retorna { ok: true, message: 'Permiso aprobado' }
Si error: retorna error message para mostrar en el botón
  ↓
Cliente: muestra toast de éxito, deshabilita botones permanentemente
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Una notificación de `leave_review` muestra botones "Aprobar" y "Rechazar" en el dropdown
- [ ] Al hacer click en "Aprobar", el permiso se aprueba en la DB sin navegar a otra pantalla
- [ ] Al hacer click en "Rechazar", se muestra confirmación antes de ejecutar
- [ ] Los botones se deshabilitan tras ejecutar la acción (no se puede aprobar dos veces)
- [ ] Si el permiso ya fue actado por otro revisor, los botones aparecen deshabilitados
- [ ] Una notificación sin acciones en metadata no muestra botones (retrocompatibilidad)
- [ ] `pnpm lint` y `pnpm tsc --noEmit` pasan
- [ ] `pnpm test` pasa

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- Test manual en staging: crear leave request, verificar botones en dropdown del supervisor, aprobar desde la campana y confirmar cambio en `/hr/leave`

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] Chequeo de impacto cruzado

## Follow-ups

- Extender acciones a otras categorías: `finance_alert` (confirmar pago), `payroll_ops` (aprobar cálculo)
- TASK-387: "Aprobar todas" para grupos de leave_review

## Open Questions

- ¿El endpoint de decisión de permiso acepta `reviewedBy` como param o lo lee de la sesión? Verificar durante Discovery — si lee de sesión, el proxy de acciones no necesita pasar ese campo.
