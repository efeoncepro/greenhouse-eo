# TASK-132 — Admin Center: Notification System Landing

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Medio` |
| Status real | `Diseño` |
| Rank | — |
| Domain | Admin Center / Notifications / UX |
| Sequence | Post TASK-023 (Notification System), conecta con TASK-129 (In-App via Webhook Bus) |

## Summary

Crear la landing de administración del sistema de notificaciones en Admin Center. Surface operativa para que admins vean salud del sistema, configuren categorías, revisen dispatch logs, gestionen defaults de preferencias y monitoreen delivery por canal (in-app + email). Complementa el sistema existente (TASK-023) con governance y visibilidad administrativa.

## Why This Task Exists

El sistema de notificaciones ya funciona (TASK-023): `NotificationService.dispatch()`, 10 categorías, preferencias por usuario, log de dispatch, email vía Resend. Pero los admins no tienen dónde:

- Ver si las notificaciones se están entregando o fallando
- Saber cuántas notificaciones se envían por canal y categoría
- Configurar qué categorías están activas y con qué defaults
- Diagnosticar por qué un usuario no recibió una notificación
- Enviar una notificación de prueba para validar el pipeline

Además, TASK-129 conectará el webhook bus como fuente automática de notificaciones, lo que multiplicará el volumen — hacer esto sin visibilidad administrativa es operar a ciegas.

## Dependencies & Impact

- **Depende de:**
  - TASK-023 (Notification System) — `complete`
  - TASK-095 (Email Delivery Layer) — `complete`
  - TASK-108 (Admin Center Governance Shell) — `complete`
- **Impacta a:**
  - TASK-129 (In-App Notifications via Webhook Bus) — la landing visualiza lo que TASK-129 produce
  - Admin Center — nuevo dominio card en la landing principal
- **Archivos owned:**
  - `src/app/(dashboard)/admin/notifications/page.tsx` (nuevo)
  - `src/views/greenhouse/admin/AdminNotificationsView.tsx` (nuevo)
  - `src/lib/admin/get-admin-notifications-overview.ts` (nuevo)
  - `src/app/api/admin/ops/notifications/test-dispatch/route.ts` (nuevo)

## UX Specification

### Layout blueprint

```
┌──────────────────────────────────────────────────────────────────┐
│ Admin Center  >  Notificaciones                                  │
│ Gobierno del sistema de notificaciones in-app y email.           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [KPI]              [KPI]              [KPI]             [KPI]   │
│  Enviadas 24h       In-app             Email             Fallos  │
│  ↑12%               entregadas         entregados        24h     │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌── Salud del delivery ─────────────────────────────────────┐   │
│  │                                                           │   │
│  │  In-app    [===========================] 98%   ok         │   │
│  │  Email     [======================     ] 87%   ok         │   │
│  │  Webhook   [                           ]  0%   idle       │   │
│  │                                                           │   │
│  │  Última señal: 29-03-2026, 11:30 a.m.                     │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌── Categorías de notificación ─────────────────────────────┐   │
│  │                                                           │   │
│  │  Categoría      │ Audiencia    │ Canales    │ Prioridad   │   │
│  │  ─────────────────────────────────────────────────────────│   │
│  │  Liquidación    │ Colaborador  │ 🔔 ✉️     │ Alta        │   │
│  │  Asignaciones   │ Colaborador  │ 🔔        │ Normal      │   │
│  │  Alertas ICO    │ Interno      │ 🔔 ✉️     │ Alta        │   │
│  │  Feedback       │ Cliente      │ 🔔 ✉️     │ Alta        │   │
│  │  ...            │              │            │             │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌── Dispatch reciente ──────────────────────────────────────┐   │
│  │                                                           │   │
│  │  Destinatario  │ Categoría     │ Canal  │ Estado │ Hora   │   │
│  │  ─────────────────────────────────────────────────────────│   │
│  │  jreyes        │ payroll_ready │ in_app │ ✓ sent │ 11:30  │   │
│  │  jreyes        │ payroll_ready │ email  │ ✓ sent │ 11:30  │   │
│  │  mlopez        │ assignment    │ in_app │ ⊘ skip │ 11:15  │   │
│  │  ...                                                      │   │
│  │                                                           │   │
│  │  [Enviar notificación de prueba]  [Flush pendientes]      │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌── Preferencias por defecto ───────────────────────────────┐   │
│  │                                                           │   │
│  │  Categoría       │ In-app (default) │ Email (default)     │   │
│  │  ────────────────────────────────────────────────────────  │   │
│  │  payroll_ready    │ ✓ Activo        │ ✓ Activo            │   │
│  │  assignment_change│ ✓ Activo        │ ○ Inactivo          │   │
│  │  ico_alert        │ ✓ Activo        │ ✓ Activo            │   │
│  │  system_event     │ ✓ Activo        │ ○ Inactivo          │   │
│  │  ...                                                      │   │
│  │                                                           │   │
│  │  Los usuarios pueden sobreescribir estos defaults en      │   │
│  │  /notifications/preferences                               │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Component manifest

| Section | Componente MUI/Vuexy | Props clave |
|---------|---------------------|-------------|
| KPI — Enviadas 24h | `HorizontalWithSubtitle` | `avatarIcon='tabler-bell', avatarColor='primary', trend='positive'` |
| KPI — In-app entregadas | `HorizontalWithSubtitle` | `avatarIcon='tabler-bell-ringing', avatarColor='success'` |
| KPI — Email entregados | `HorizontalWithSubtitle` | `avatarIcon='tabler-mail-check', avatarColor='info'` |
| KPI — Fallos 24h | `HorizontalWithSubtitle` | `avatarIcon='tabler-bell-x', avatarColor='error'` |
| Salud del delivery | `Card variant='outlined'` | `LinearProgress` por canal con `Chip` de estado |
| Categorías | `Table size='small'` | Sortable por audiencia y prioridad |
| Dispatch reciente | `Table size='small'` | Últimos 50 registros del `notification_log` |
| Preferencias default | `Table size='small'` | Read-only, refleja `notification-categories.ts` |
| Acciones | `AdminOpsActionButton` | Mismos patrones de Cloud & Integrations |

### Visual hierarchy

1. **KPIs primero** — 4 cards en fila, el admin ve volumen y salud de un vistazo
2. **Salud del delivery** — barra de progreso por canal, señal de "está funcionando"
3. **Categorías** — tabla de referencia, qué existe y cómo está configurado
4. **Dispatch reciente** — log operativo para debugging + acciones manuales
5. **Preferencias default** — referencia de la configuración base

### Responsive

- KPIs: `xs={12} sm={6} md={3}` — 4 cols desktop, 2 tablet, 1 mobile
- Tablas: scroll horizontal en mobile
- Acciones: stack vertical en mobile

## Copy Specification

### Nomenclatura — textos para `greenhouse-nomenclature.ts`

```typescript
// Admin Notifications
admin_notifications_title: 'Notificaciones',
admin_notifications_subtitle: 'Gobierno del sistema de notificaciones in-app y email.',

// KPIs
admin_notifications_kpi_sent_24h: 'Enviadas 24h',
admin_notifications_kpi_sent_24h_subtitle: 'Total despachadas por todos los canales',
admin_notifications_kpi_inapp_delivered: 'In-app entregadas',
admin_notifications_kpi_inapp_subtitle: 'Registradas en la campanita del usuario',
admin_notifications_kpi_email_delivered: 'Email entregados',
admin_notifications_kpi_email_subtitle: 'Enviados vía Resend con entrega confirmada',
admin_notifications_kpi_failed_24h: 'Fallos 24h',
admin_notifications_kpi_failed_subtitle: 'Dispatch fallidos o saltados por preferencia',

// Sections
admin_notifications_delivery_health_title: 'Salud del delivery',
admin_notifications_delivery_health_subtitle: 'Tasa de entrega exitosa por canal en las últimas 24 horas.',
admin_notifications_categories_title: 'Categorías de notificación',
admin_notifications_categories_subtitle: 'Registro declarativo de tipos de notificación con audiencia, canales y prioridad.',
admin_notifications_dispatch_title: 'Dispatch reciente',
admin_notifications_dispatch_subtitle: 'Últimos 50 registros del log de dispatch. Incluye enviados, saltados y fallidos.',
admin_notifications_preferences_title: 'Preferencias por defecto',
admin_notifications_preferences_subtitle: 'Configuración base por categoría. Los usuarios pueden sobreescribir en sus preferencias personales.',

// Table headers
admin_notifications_col_category: 'Categoría',
admin_notifications_col_audience: 'Audiencia',
admin_notifications_col_channels: 'Canales',
admin_notifications_col_priority: 'Prioridad',
admin_notifications_col_recipient: 'Destinatario',
admin_notifications_col_channel: 'Canal',
admin_notifications_col_status: 'Estado',
admin_notifications_col_timestamp: 'Hora',
admin_notifications_col_inapp_default: 'In-app (default)',
admin_notifications_col_email_default: 'Email (default)',

// Status labels
admin_notifications_status_sent: 'Enviada',
admin_notifications_status_skipped: 'Saltada',
admin_notifications_status_failed: 'Fallida',

// Empty states
admin_notifications_empty_dispatch: 'Sin despachos registrados en las últimas 24 horas.',
admin_notifications_empty_failures: 'Sin fallos de entrega. Todos los canales operan con normalidad.',

// Actions
admin_notifications_action_test: 'Enviar notificación de prueba',
admin_notifications_action_test_helper: 'Envía una notificación de prueba al usuario actual para validar el pipeline in-app y email.',

// Channel labels
admin_notifications_channel_inapp: 'In-app',
admin_notifications_channel_email: 'Email',
admin_notifications_channel_webhook: 'Webhook bus',

// Audience labels
admin_notifications_audience_client: 'Cliente',
admin_notifications_audience_collaborator: 'Colaborador',
admin_notifications_audience_internal: 'Interno',
admin_notifications_audience_admin: 'Admin',

// Priority labels
admin_notifications_priority_high: 'Alta',
admin_notifications_priority_normal: 'Normal',
admin_notifications_priority_low: 'Baja',
```

### Screen reader (aria-labels)

```typescript
// KPIs
aria_kpi_sent_24h: 'Notificaciones enviadas en las últimas 24 horas: {count}',
aria_kpi_inapp: 'Notificaciones in-app entregadas: {count}',
aria_kpi_email: 'Notificaciones email entregadas: {count}',
aria_kpi_failed: 'Notificaciones fallidas en las últimas 24 horas: {count}',

// Delivery health
aria_delivery_health_channel: '{channel}: {percent}% de entrega exitosa, estado {status}',

// Tables
aria_categories_table: 'Tabla de categorías de notificación configuradas',
aria_dispatch_table: 'Tabla de dispatch reciente de notificaciones',
aria_preferences_table: 'Tabla de preferencias por defecto de notificaciones',
```

## Backend Specification

### Data source: `get-admin-notifications-overview.ts`

```typescript
export interface AdminNotificationsOverview {
  kpis: {
    totalSent24h: number
    inAppDelivered24h: number
    emailDelivered24h: number
    failed24h: number
    skipped24h: number
  }
  deliveryHealth: {
    inApp: { sent: number; failed: number; rate: number }
    email: { sent: number; failed: number; rate: number }
    lastSignalAt: string | null
  }
  categories: Array<{
    code: string
    label: string
    description: string
    audience: string
    defaultChannels: string[]
    priority: string
    icon: string
  }>
  recentDispatch: Array<{
    logId: string
    userId: string
    category: string
    channel: string
    status: string
    skipReason: string | null
    errorMessage: string | null
    createdAt: string
  }>
}
```

### Queries contra `greenhouse_notifications`

```sql
-- KPIs (24h)
SELECT
  COUNT(*) FILTER (WHERE status = 'sent') AS total_sent,
  COUNT(*) FILTER (WHERE status = 'sent' AND channel = 'in_app') AS inapp_sent,
  COUNT(*) FILTER (WHERE status = 'sent' AND channel = 'email') AS email_sent,
  COUNT(*) FILTER (WHERE status = 'failed') AS total_failed,
  COUNT(*) FILTER (WHERE status = 'skipped') AS total_skipped
FROM greenhouse_notifications.notification_log
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Delivery rate por canal
SELECT
  channel,
  COUNT(*) FILTER (WHERE status = 'sent') AS sent,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'sent') * 100.0 /
    NULLIF(COUNT(*) FILTER (WHERE status IN ('sent', 'failed')), 0),
    1
  ) AS rate
FROM greenhouse_notifications.notification_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY channel;

-- Última señal
SELECT MAX(created_at)::text AS last_signal
FROM greenhouse_notifications.notification_log;

-- Dispatch reciente (últimos 50)
SELECT log_id, user_id, category, channel, status, skip_reason, error_message, created_at::text
FROM greenhouse_notifications.notification_log
ORDER BY created_at DESC
LIMIT 50;
```

### Categorías

Se leen directamente de `notification-categories.ts` (no de BD). Son estáticas y se renderizan desde el config importado.

### Test dispatch endpoint

```typescript
// POST /api/admin/ops/notifications/test-dispatch
// Envía una notificación de prueba al usuario admin actual
// Usa NotificationService.dispatch() con category 'system_event'
// Retorna: { dispatched: boolean, channels: string[], result: DispatchResult }
```

## Admin Center Integration

### Domain card en AdminCenterView

Agregar una nueva card de dominio en `buildDomainCards()`:

```typescript
{
  title: 'Notificaciones',
  subtitle: 'Gobierno del sistema de notificaciones in-app y email.',
  icon: 'tabler-bell',
  avatarColor: 'primary',
  status: {
    label: notifications24h > 0 ? 'Activo' : 'Sin actividad',
    color: notifications24h > 0 ? 'success' : 'secondary'
  },
  href: '/admin/notifications',
  primaryAction: 'Abrir notificaciones',
  routes: ['/admin/notifications'],
  points: [
    `${notificationsSent24h} notificaciones en 24h`,
    `${failedNotifications24h} fallos de entrega`,
    `${Object.keys(NOTIFICATION_CATEGORIES).length} categorías configuradas`
  ]
}
```

### Sidebar navigation

Agregar en `GH_INTERNAL_NAV`:

```typescript
adminNotifications: {
  label: 'Notificaciones',
  subtitle: 'Sistema de notificaciones in-app y email'
}
```

## Scope

### Slice 1 — Backend: get-admin-notifications-overview.ts (~1h)

1. Crear `src/lib/admin/get-admin-notifications-overview.ts`
2. Implementar queries contra `greenhouse_notifications.notification_log`
3. Leer categorías de `notification-categories.ts`
4. Exportar `AdminNotificationsOverview` tipado

### Slice 2 — Page + View shell (~1h)

1. Crear `src/app/(dashboard)/admin/notifications/page.tsx`
2. Crear `src/views/greenhouse/admin/AdminNotificationsView.tsx`
3. Server component llama a `getAdminNotificationsOverview()`
4. View renderiza con `ExecutiveCardShell` pattern

### Slice 3 — KPIs + delivery health (~1h)

1. 4 KPI cards con `HorizontalWithSubtitle`
2. Card de salud del delivery con `LinearProgress` por canal
3. Chip de estado por canal (ok / degradado / idle)

### Slice 4 — Tablas de categorías y dispatch (~1.5h)

1. Tabla de categorías (read-only, desde config)
2. Tabla de dispatch reciente (últimos 50, desde `notification_log`)
3. Status chips colorizados (sent = success, skipped = secondary, failed = error)

### Slice 5 — Preferencias default + acciones (~1h)

1. Tabla de preferencias default (read-only, refleja `defaultChannels` de cada categoría)
2. `AdminOpsActionButton` para test dispatch
3. Endpoint `POST /api/admin/ops/notifications/test-dispatch`

### Slice 6 — Admin Center integration (~30min)

1. Agregar domain card en `AdminCenterView.tsx`
2. Agregar ruta en sidebar navigation
3. Agregar textos en `greenhouse-nomenclature.ts`

## Out of Scope

- Edición de categorías desde la UI (se editan en código)
- CRUD de preferencias de otros usuarios desde admin (cada usuario gestiona las suyas)
- Notificaciones push (Web Push API) — mejora futura
- Historial de notificaciones por usuario desde admin — mejora futura
- Dashboard de métricas de engagement (open rate, click rate) — mejora futura

## Acceptance Criteria

- [ ] Landing accesible desde Admin Center > Notificaciones
- [ ] 4 KPIs con datos reales de `notification_log` (24h)
- [ ] Salud del delivery con `LinearProgress` por canal
- [ ] Tabla de categorías con las 10 categorías de `notification-categories.ts`
- [ ] Tabla de dispatch reciente con últimos 50 registros
- [ ] Tabla de preferencias default read-only
- [ ] Botón "Enviar notificación de prueba" funcional
- [ ] Domain card en landing principal de Admin Center
- [ ] Sidebar navigation funcional
- [ ] Textos en `GH_MESSAGES` de nomenclatura
- [ ] Accesibilidad: aria-labels en KPIs, tablas con caption, chips con texto + ícono
- [ ] `pnpm build` pasa
- [ ] `pnpm test` pasa

## Accessibility Checklist

- [ ] Todos los targets interactivos >= 24x24px
- [ ] Color nunca es el único indicador — siempre con ícono + texto
- [ ] Focus order sigue orden visual
- [ ] Tablas con `<caption>` y `scope="col"` en headers
- [ ] KPIs con `aria-label` descriptivo completo
- [ ] Chips de estado con texto visible (no solo color)
- [ ] Empty states con `role="status"`

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/admin/get-admin-notifications-overview.ts` | Nuevo — data source |
| `src/app/(dashboard)/admin/notifications/page.tsx` | Nuevo — server component |
| `src/views/greenhouse/admin/AdminNotificationsView.tsx` | Nuevo — client view |
| `src/app/api/admin/ops/notifications/test-dispatch/route.ts` | Nuevo — test endpoint |
| `src/views/greenhouse/admin/AdminCenterView.tsx` | Agregar domain card |
| `src/config/greenhouse-nomenclature.ts` | Agregar textos de notificaciones |
