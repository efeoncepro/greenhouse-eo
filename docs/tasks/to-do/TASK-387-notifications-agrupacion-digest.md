# TASK-387 — Notificaciones In-App: Agrupación y Digest

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-387-notifications-agrupacion-digest`
- Legacy ID: none
- GitHub Issue: none

## Summary

Cuando 15 empleados piden permiso el mismo día, el supervisor de HR recibe 15 notificaciones separadas de categoría `leave_review`. El dropdown muestra 15 filas idénticas con nombres distintos — ruido puro. Esta task implementa agrupación: notificaciones del mismo tipo y categoría recientes se colapsan en una entrada de digest con conteo, y el feed las renderiza como grupo expandible.

## Why This Task Exists

El sistema actual genera una fila en `notifications` por cada evento, sin ninguna lógica de agrupación. Para usuarios con roles de supervisión (HR, finance ops, admin) que reciben muchos eventos similares, el dropdown se vuelve inutilizable rápidamente. Enterprise notification systems agrupan por tipo+categoría en una ventana de tiempo (ej. última hora) para reducir el ruido cognitivo.

## Goal

- Notificaciones de la misma categoría + tipo en una ventana de 1 hora se agrupan en una entrada de digest con contador
- El dropdown muestra el grupo colapsado ("15 solicitudes de permiso pendientes") expandible al hacer click
- Las notificaciones individuales siguen existiendo en la tabla — la agrupación es una capa de presentación, no de storage
- Marcar como leído el grupo marca todas las notificaciones del grupo

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `src/config/notification-categories.ts` — categorías y sus metadatos, base de la agrupación

Reglas obligatorias:

- La agrupación es solo de presentación — NO modificar el modelo de datos de `notifications`
- Un grupo se marca como leído haciendo UPDATE en todas las `notification_id` del grupo
- La agrupación nunca debe cruzar usuarios — cada usuario ve sus propios grupos
- Respetar el campo `action_url` del grupo: usar la action_url de la notificación más reciente del grupo

## Normative Docs

- `src/app/api/notifications/route.ts` — query de listado a modificar para incluir agrupación
- `src/views/greenhouse/notifications/NotificationsPageView.tsx` — vista completa a actualizar
- `src/components/layout/shared/NotificationsDropdown.tsx` — dropdown a actualizar

## Dependencies & Impact

### Depends on

- `greenhouse_notifications.notifications` — tabla existente, sin cambios de schema
- `src/config/notification-categories.ts` — `groupable: boolean` a agregar por categoría

### Blocks / Impacts

- TASK-386 (SSE) — el stream puede emitir el estado del grupo actualizado
- TASK-388 (acciones inline) — las acciones inline aplican a grupos también

### Files owned

- `src/app/api/notifications/route.ts` — agregar lógica de agrupación en la query
- `src/views/greenhouse/notifications/NotificationsPageView.tsx` — UI de grupos expandibles
- `src/components/layout/shared/NotificationsDropdown.tsx` — UI de grupos en dropdown
- `src/config/notification-categories.ts` — agregar `groupable` flag

## Current Repo State

### Already exists

- `greenhouse_notifications.notifications` — tabla con `category`, `created_at`, `user_id`, `read_at`
- `src/config/notification-categories.ts` — 14 categorías con metadatos
- `src/app/api/notifications/route.ts` — query de listado existente (una fila por notificación)
- `src/views/greenhouse/notifications/NotificationsPageView.tsx` — feed sin agrupación
- `src/components/layout/shared/NotificationsDropdown.tsx` — muestra max 10 individuales

### Gap

- No hay lógica de agrupación en la query
- No hay componente de grupo expandible en la UI
- No hay flag `groupable` en las categorías

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Configuración de categorías agrupables

- Agregar `groupable: boolean` a cada categoría en `src/config/notification-categories.ts`
- Categorías agrupables por naturaleza: `leave_review`, `leave_status`, `payroll_ops`, `system_event`, `delivery_update`
- Categorías NO agrupables (siempre individuales): `feedback_requested`, `assignment_change`

### Slice 2 — Query con agrupación en API

- Modificar `GET /api/notifications` para que cuando `groupable = true`, agrupe por `(category, DATE_TRUNC('hour', created_at))` las notificaciones no leídas de la última hora
- Retornar en el response:
  ```typescript
  type NotificationItem =
    | { kind: 'single'; notification: NotificationRow }
    | { kind: 'group'; category: string; count: number; notifications: NotificationRow[]; latestTitle: string; latestAt: string; allRead: boolean }
  ```
- Notificaciones individuales (antiguas o categoría no agrupable) siguen como `kind: 'single'`

### Slice 3 — UI de grupo en dropdown y feed

- Crear `NotificationGroupItem.tsx` — chip con ícono de categoría, título del grupo ("15 solicitudes de permiso"), badge de conteo, chevron para expandir
- Al expandir: lista colapsable de las notificaciones individuales del grupo con sus nombres
- Botón "Marcar grupo como leído" — PATCH batch a todas las notification_id del grupo
- Integrar en `NotificationsDropdown.tsx` y `NotificationsPageView.tsx`

## Out of Scope

- Agrupación cross-categoría (ej. merge leave_review + leave_status)
- Digest por email de notificaciones agrupadas
- Agrupación por entidad (ej. todas las notificaciones de un Space)
- Modificar el schema de la tabla `notifications`

## Detailed Spec

### Response shape agrupado

```typescript
// GET /api/notifications?grouped=true
{
  items: Array<
    | { kind: 'single'; notification: NotificationRow }
    | {
        kind: 'group'
        category: string
        count: number
        unreadCount: number
        latestTitle: string
        latestAt: string
        latestActionUrl: string
        notificationIds: string[]
      }
  >,
  total: number,
  page: number,
  pageSize: number
}
```

### SQL de agrupación

```sql
WITH grouped AS (
  SELECT
    category,
    DATE_TRUNC('hour', created_at) AS hour_bucket,
    COUNT(*) AS cnt,
    COUNT(*) FILTER (WHERE read_at IS NULL) AS unread_cnt,
    MAX(created_at) AS latest_at,
    ARRAY_AGG(notification_id ORDER BY created_at DESC) AS ids
  FROM greenhouse_notifications.notifications
  WHERE user_id = $1
    AND archived_at IS NULL
    AND created_at > NOW() - INTERVAL '1 hour'
    AND category = ANY($2::text[])  -- solo categorías groupable
  GROUP BY category, DATE_TRUNC('hour', created_at)
  HAVING COUNT(*) > 1
)
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un usuario con 5+ notificaciones de `leave_review` en la última hora ve un grupo "5 solicitudes de permiso pendientes" en lugar de 5 filas
- [ ] Expandir el grupo muestra las notificaciones individuales con sus nombres
- [ ] "Marcar grupo como leído" actualiza el badge y marca todas las del grupo
- [ ] Notificaciones de categorías no agrupables (`assignment_change`) siempre se muestran individuales
- [ ] Notificaciones con más de 1h de antigüedad no se agrupan aunque sean de la misma categoría
- [ ] `pnpm lint` y `pnpm tsc --noEmit` pasan
- [ ] `pnpm test` pasa

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- Test manual: crear 3 leave requests en staging, verificar que el supervisor ve un grupo en el dropdown

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] Chequeo de impacto cruzado

## Follow-ups

- TASK-388 — las acciones inline aplican al nivel de grupo también
- Digest diario por email de grupos no leídos del día anterior
