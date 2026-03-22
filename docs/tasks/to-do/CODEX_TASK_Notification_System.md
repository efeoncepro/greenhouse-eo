# CODEX TASK — Sistema de Notificaciones Greenhouse

## Resumen

Implementar el sistema de notificaciones internas de Greenhouse con dos canales: **in-app** (campanita en el navbar) y **email** (vía Resend). El sistema es event-driven, RBAC-aware, y respeta las preferencias de cada usuario para mantener la comunicación útil y no invasiva.

**Canales:**
- **In-app:** campanita con badge, dropdown de notificaciones, página completa `/notifications`
- **Email:** templates React Email con branding Greenhouse, enviados vía Resend

**Principio rector:** Las notificaciones existen para que el usuario no tenga que estar revisando el portal constantemente. Cada notificación debe tener un `action_url` que lleve a algo concreto. Si no hay acción posible, no hay notificación.

---

## Contexto del proyecto

- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Branch de trabajo:** `feature/notification-system`
- **Framework:** Next.js 16+ (Vuexy Admin Template, starter-kit)
- **Package manager:** pnpm
- **Auth library:** NextAuth.js v4 (Microsoft SSO + Google SSO + Credentials)
- **Deploy:** Vercel Pro (auto-deploy desde `main`, preview desde feature branches)
- **OLTP:** PostgreSQL — Cloud SQL instancia `greenhouse-pg-dev`, database `greenhouse_app`
- **OLAP:** BigQuery — proyecto `efeonce-group`, dataset `greenhouse`
- **Email:** Resend (ya configurado, `greenhouse@efeoncepro.com`)
- **GCP Project:** `efeonce-group`

---

## Documentos de referencia

Leer antes de implementar:

- `GREENHOUSE_IDENTITY_ACCESS_V2.md` — RBAC, roles, route groups, session payload
- `GREENHOUSE_ARCHITECTURE_V1.md` — principios de arquitectura, módulo inventory
- `Greenhouse_Nomenclatura_Portal_v3.md` — constantes `GH_NAV`, `GH_LABELS`, `GH_COLORS`, `GH_MESSAGES`, principios de microcopy
- `CODEX_TASK_Transactional_Email_System.md` — Resend helper, React Email templates, `email_logs` en BigQuery
- `GREENHOUSE_POSTGRES_CANONICAL_360_V1.md` — patrón de schemas por dominio, outbox
- `Greenhouse_Services_Architecture_v1.md` — decisión PostgreSQL OLTP + BigQuery OLAP
- `GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` — outbox pattern, sync strategy

---

## Dependencias

| Dependencia | Estado | Blocker |
|---|---|---|
| PostgreSQL `greenhouse_core.client_users` | ✅ Existe | Sí — FK para `user_id` |
| PostgreSQL `greenhouse_core.spaces` | ✅ Existe | Sí — FK para `space_id` |
| Resend helper (`src/lib/resend.ts`) | ✅ Existe | Sí — envío de emails |
| React Email layout (`src/emails/components/EmailLayout.tsx`) | ✅ Existe | Sí — template base |
| BigQuery `greenhouse.email_logs` | ✅ Existe | No — solo para auditoría de emails |
| NextAuth session con `userId`, `roleCodes`, `spaceId` | ✅ Existe | Sí — filtrado de notificaciones |
| Identity & Access V2 route guards | ✅ Existe | Sí — protección de API routes |

---

## PARTE A: Infraestructura PostgreSQL

### A1. Crear schema `greenhouse_notifications`

```sql
-- ══════════════════════════════════════════════════════
-- Notification System
-- Schema: greenhouse_notifications
-- Ref: CODEX_TASK_Notification_System.md
-- ══════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS greenhouse_notifications;

-- Grants para el application user
GRANT USAGE ON SCHEMA greenhouse_notifications TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA greenhouse_notifications TO greenhouse_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_notifications GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_app;
```

**Justificación del schema separado:** Notificaciones es un dominio transversal con tablas propias, políticas de retención diferenciadas (purge de notificaciones antiguas), e índices de acceso específicos. Sigue el patrón de `greenhouse_hr`, `greenhouse_payroll`, `greenhouse_finance`. FKs hacia `greenhouse_core` cruzan schemas sin problema.

### A2. Tabla `greenhouse_notifications.notifications`

```sql
CREATE TABLE greenhouse_notifications.notifications (
  notification_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES greenhouse_core.client_users(user_id),
  space_id          UUID REFERENCES greenhouse_core.spaces(space_id),
  category          TEXT NOT NULL,
  title             TEXT NOT NULL,
  body              TEXT,
  action_url        TEXT,
  icon              TEXT,
  metadata          JSONB DEFAULT '{}',
  read_at           TIMESTAMPTZ,
  archived_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice principal: campanita muestra unread del usuario, ordenadas por fecha
CREATE INDEX idx_notifications_user_unread
  ON greenhouse_notifications.notifications (user_id, created_at DESC)
  WHERE read_at IS NULL AND archived_at IS NULL;

-- Índice para count de unread (query del badge)
CREATE INDEX idx_notifications_user_unread_count
  ON greenhouse_notifications.notifications (user_id)
  WHERE read_at IS NULL AND archived_at IS NULL;

-- Índice para filtro por categoría
CREATE INDEX idx_notifications_user_category
  ON greenhouse_notifications.notifications (user_id, category, created_at DESC);

-- Índice para cleanup job (purge de archivadas antiguas)
CREATE INDEX idx_notifications_archived
  ON greenhouse_notifications.notifications (archived_at)
  WHERE archived_at IS NOT NULL;
```

**Notas:**
- `space_id` es nullable: notificaciones de collaborator (leave, payroll) no tienen space. Notificaciones client-facing siempre tienen space.
- `metadata` (JSONB) contiene payload variable por categoría: `{ project_name, sprint_name, metric_value, member_name }`. No se crean columnas por cada tipo.
- `icon` es el nombre del ícono Tabler para el frontend (ej: `IconCheckCircle`, `IconAlertTriangle`). Si es null, el frontend usa el ícono default de la categoría.
- No hay soft-delete: `archived_at` oculta la notificación del dropdown. Un job nocturno purga archivadas con más de 90 días.

### A3. Tabla `greenhouse_notifications.notification_preferences`

```sql
CREATE TABLE greenhouse_notifications.notification_preferences (
  preference_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES greenhouse_core.client_users(user_id),
  category          TEXT NOT NULL,
  in_app_enabled    BOOLEAN NOT NULL DEFAULT true,
  email_enabled     BOOLEAN NOT NULL DEFAULT true,
  muted_until       TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_user_category UNIQUE (user_id, category)
);

CREATE INDEX idx_preferences_user
  ON greenhouse_notifications.notification_preferences (user_id);
```

**Notas:**
- Si no existe un row para `(user_id, category)`, se usan los defaults del catálogo de categorías (definido en código).
- `muted_until` permite silenciar temporalmente una categoría. Si `muted_until > now()`, no se envía por ningún canal.

### A4. Tabla `greenhouse_notifications.notification_log` (append-only)

```sql
CREATE TABLE greenhouse_notifications.notification_log (
  log_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id   UUID REFERENCES greenhouse_notifications.notifications(notification_id),
  user_id           UUID NOT NULL,
  category          TEXT NOT NULL,
  channel           TEXT NOT NULL CHECK (channel IN ('in_app', 'email')),
  status            TEXT NOT NULL CHECK (status IN ('sent', 'skipped', 'failed')),
  skip_reason       TEXT,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_log_user
  ON greenhouse_notifications.notification_log (user_id, created_at DESC);
```

**Notas:**
- Registro inmutable de cada intento de dispatch. `skipped` = usuario tenía el canal desactivado o muteado. `failed` = error en Resend o en INSERT.
- Esta tabla es para debugging operativo. Para analytics a largo plazo, el outbox publica a BigQuery.

### A5. Agregar DDL al script de provisioning

Agregar el SQL de A1-A4 a `scripts/setup-postgres-notifications.sql` (crear archivo nuevo) con header:

```sql
-- ══════════════════════════════════════════════════════
-- Notification System — greenhouse_notifications schema
-- Ref: CODEX_TASK_Notification_System.md
-- Run: psql $DATABASE_URL -f scripts/setup-postgres-notifications.sql
-- ══════════════════════════════════════════════════════
```

Agregar script runner a `package.json`:

```json
{
  "scripts": {
    "db:setup:notifications": "tsx scripts/setup-postgres-notifications.ts"
  }
}
```

---

## PARTE B: Catálogo de Categorías

### B1. Crear archivo de configuración

Archivo: `src/config/notification-categories.ts`

Este archivo define todas las categorías disponibles, sus defaults de canal, y el ícono asociado. Es la single source of truth para el sistema.

```typescript
// src/config/notification-categories.ts

export type NotificationChannel = 'in_app' | 'email'

export interface NotificationCategoryConfig {
  code: string
  label: string
  description: string
  icon: string                        // Tabler icon name
  audience: 'client' | 'collaborator' | 'internal' | 'admin'
  defaultChannels: NotificationChannel[]
  emailTemplate: string               // React Email component name
  priority: 'low' | 'normal' | 'high'
}

export const NOTIFICATION_CATEGORIES: Record<string, NotificationCategoryConfig> = {

  // ─── Client-facing ───────────────────────────────────

  delivery_update: {
    code: 'delivery_update',
    label: 'Delivery updates',
    description: 'Asset aprobado, entregado o con cambios solicitados',
    icon: 'IconPackage',
    audience: 'client',
    defaultChannels: ['in_app'],
    emailTemplate: 'DeliveryUpdateEmail',
    priority: 'normal',
  },

  sprint_milestone: {
    code: 'sprint_milestone',
    label: 'Hitos de ciclo',
    description: 'Inicio, cierre y alertas de ciclos de producción',
    icon: 'IconFlag',
    audience: 'client',
    defaultChannels: ['in_app'],
    emailTemplate: 'SprintMilestoneEmail',
    priority: 'normal',
  },

  feedback_requested: {
    code: 'feedback_requested',
    label: 'Feedback solicitado',
    description: 'Se necesita tu revisión o aprobación',
    icon: 'IconMessageCircle',
    audience: 'client',
    defaultChannels: ['in_app', 'email'],
    emailTemplate: 'FeedbackRequestedEmail',
    priority: 'high',
  },

  report_ready: {
    code: 'report_ready',
    label: 'Reporte disponible',
    description: 'Tu reporte programado está listo para descargar',
    icon: 'IconFileAnalytics',
    audience: 'client',
    defaultChannels: ['in_app', 'email'],
    emailTemplate: 'ReportReadyEmail',
    priority: 'low',
  },

  // ─── Collaborator-facing ─────────────────────────────

  leave_status: {
    code: 'leave_status',
    label: 'Permisos',
    description: 'Solicitud de permiso aprobada o rechazada',
    icon: 'IconCalendarEvent',
    audience: 'collaborator',
    defaultChannels: ['in_app', 'email'],
    emailTemplate: 'LeaveStatusEmail',
    priority: 'high',
  },

  payroll_ready: {
    code: 'payroll_ready',
    label: 'Liquidación disponible',
    description: 'Tu liquidación del período está lista para revisión',
    icon: 'IconCurrencyDollar',
    audience: 'collaborator',
    defaultChannels: ['in_app', 'email'],
    emailTemplate: 'PayrollReadyEmail',
    priority: 'high',
  },

  assignment_change: {
    code: 'assignment_change',
    label: 'Asignaciones',
    description: 'Nueva asignación o cambio de proyecto',
    icon: 'IconUserPlus',
    audience: 'collaborator',
    defaultChannels: ['in_app'],
    emailTemplate: 'AssignmentChangeEmail',
    priority: 'normal',
  },

  // ─── Internal/Admin ──────────────────────────────────

  ico_alert: {
    code: 'ico_alert',
    label: 'Alertas ICO',
    description: 'Métrica ICO cruzó umbral de semáforo',
    icon: 'IconAlertTriangle',
    audience: 'internal',
    defaultChannels: ['in_app', 'email'],
    emailTemplate: 'IcoAlertEmail',
    priority: 'high',
  },

  capacity_warning: {
    code: 'capacity_warning',
    label: 'Capacidad del equipo',
    description: 'Utilización sobre 90% o riesgo de sobreasignación',
    icon: 'IconUsers',
    audience: 'internal',
    defaultChannels: ['in_app'],
    emailTemplate: 'CapacityWarningEmail',
    priority: 'normal',
  },

  system_event: {
    code: 'system_event',
    label: 'Eventos del sistema',
    description: 'Nuevo usuario, sync fallido, cambio de configuración',
    icon: 'IconSettings',
    audience: 'admin',
    defaultChannels: ['in_app'],
    emailTemplate: 'SystemEventEmail',
    priority: 'low',
  },

} as const

// Helper: get category config or throw
export function getCategoryConfig(code: string): NotificationCategoryConfig {
  const config = NOTIFICATION_CATEGORIES[code]
  if (!config) throw new Error(`Unknown notification category: ${code}`)
  return config
}

// Helper: categories visible to a given audience
export function getCategoriesForAudience(audience: string): NotificationCategoryConfig[] {
  return Object.values(NOTIFICATION_CATEGORIES).filter(c => c.audience === audience)
}
```

### B2. Agregar constantes de nomenclatura

Agregar a `src/config/greenhouse-nomenclature.ts`:

```typescript
// =============================================
// NOTIFICATIONS
// =============================================

export const GH_NOTIFICATIONS = {
  // Navbar bell
  bell_tooltip: 'Notificaciones',
  badge_overflow: '9+',

  // Dropdown
  dropdown_title: 'Notificaciones',
  dropdown_empty: 'No hay notificaciones nuevas',
  dropdown_mark_all_read: 'Marcar todas como leídas',
  dropdown_view_all: 'Ver todas',

  // Grouping labels
  group_today: 'Hoy',
  group_yesterday: 'Ayer',
  group_this_week: 'Esta semana',
  group_older: 'Anteriores',

  // Page
  page_title: 'Notificaciones',
  page_subtitle: 'Historial de notificaciones y alertas',
  filter_all: 'Todas',
  filter_unread: 'Sin leer',
  tab_in_app: 'In-app',

  // Preferences (Settings)
  prefs_title: 'Preferencias de notificación',
  prefs_subtitle: 'Controla qué notificaciones recibes y por qué canal.',
  prefs_col_category: 'Tipo',
  prefs_col_in_app: 'In-app',
  prefs_col_email: 'Email',
  prefs_saved: 'Preferencias actualizadas',

  // Empty states
  empty_all: 'No hay notificaciones.',
  empty_unread: 'Estás al día. Sin notificaciones pendientes.',
} as const
```

---

## PARTE C: NotificationService (Backend)

### C1. Crear servicio central de dispatch

Archivo: `src/lib/notifications/notification-service.ts`

Este es el corazón del sistema. Cualquier módulo que necesite enviar una notificación llama a `NotificationService.dispatch()`. El service resuelve preferencias, escribe en PostgreSQL, y dispara email si corresponde.

```typescript
// src/lib/notifications/notification-service.ts

import { getCategoryConfig, type NotificationChannel } from '@/config/notification-categories'
import { resend, EMAIL_FROM } from '@/lib/resend'
import { pool } from '@/lib/postgres'  // verificar helper existente
import { logEmail } from '@/lib/email-log'  // helper existente del transactional email system

// ── Types ──

export interface DispatchInput {
  category: string
  recipients: {
    userId: string
    email?: string       // requerido si email channel está habilitado
    fullName?: string    // para personalizar el email
  }[]
  spaceId?: string       // null para collaborator notifications
  title: string
  body?: string
  actionUrl?: string     // deep link dentro del portal
  icon?: string          // override del ícono de categoría
  metadata?: Record<string, unknown>
}

export interface DispatchResult {
  sent: { userId: string; channels: NotificationChannel[] }[]
  skipped: { userId: string; reason: string }[]
  failed: { userId: string; channel: NotificationChannel; error: string }[]
}

// ── Service ──

export class NotificationService {

  /**
   * Dispatch notification to one or more recipients.
   * Resolves per-user preferences and routes to the appropriate channels.
   */
  static async dispatch(input: DispatchInput): Promise<DispatchResult> {
    const categoryConfig = getCategoryConfig(input.category)
    const result: DispatchResult = { sent: [], skipped: [], failed: [] }

    for (const recipient of input.recipients) {
      const channels = await this.resolveChannels(
        recipient.userId,
        input.category,
        categoryConfig.defaultChannels
      )

      if (channels.length === 0) {
        result.skipped.push({ userId: recipient.userId, reason: 'all_channels_disabled' })
        await this.logDispatch(null, recipient.userId, input.category, 'in_app', 'skipped', 'all_channels_disabled')
        continue
      }

      const sentChannels: NotificationChannel[] = []

      // ── In-app channel ──
      if (channels.includes('in_app')) {
        try {
          const notificationId = await this.createInAppNotification(input, recipient.userId, categoryConfig.icon)
          sentChannels.push('in_app')
          await this.logDispatch(notificationId, recipient.userId, input.category, 'in_app', 'sent')

          // Emit SSE event for real-time delivery
          await this.emitSSEEvent(recipient.userId)
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error'
          result.failed.push({ userId: recipient.userId, channel: 'in_app', error: msg })
          await this.logDispatch(null, recipient.userId, input.category, 'in_app', 'failed', undefined, msg)
        }
      }

      // ── Email channel ──
      if (channels.includes('email') && recipient.email) {
        try {
          await this.sendEmailNotification(input, recipient, categoryConfig)
          sentChannels.push('email')
          await this.logDispatch(null, recipient.userId, input.category, 'email', 'sent')
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error'
          result.failed.push({ userId: recipient.userId, channel: 'email', error: msg })
          await this.logDispatch(null, recipient.userId, input.category, 'email', 'failed', undefined, msg)
        }
      } else if (channels.includes('email') && !recipient.email) {
        result.skipped.push({ userId: recipient.userId, reason: 'email_not_provided' })
      }

      if (sentChannels.length > 0) {
        result.sent.push({ userId: recipient.userId, channels: sentChannels })
      }
    }

    return result
  }

  /**
   * Resolve which channels are active for this user + category.
   * Checks notification_preferences; falls back to category defaults.
   */
  private static async resolveChannels(
    userId: string,
    category: string,
    defaults: readonly NotificationChannel[]
  ): Promise<NotificationChannel[]> {
    const { rows } = await pool.query(
      `SELECT in_app_enabled, email_enabled, muted_until
       FROM greenhouse_notifications.notification_preferences
       WHERE user_id = $1 AND category = $2`,
      [userId, category]
    )

    // No preference row → use defaults
    if (rows.length === 0) return [...defaults]

    const pref = rows[0]

    // Check mute
    if (pref.muted_until && new Date(pref.muted_until) > new Date()) {
      return []
    }

    const channels: NotificationChannel[] = []
    if (pref.in_app_enabled) channels.push('in_app')
    if (pref.email_enabled) channels.push('email')
    return channels
  }

  /**
   * Insert notification into PostgreSQL.
   */
  private static async createInAppNotification(
    input: DispatchInput,
    userId: string,
    defaultIcon: string
  ): Promise<string> {
    const { rows } = await pool.query(
      `INSERT INTO greenhouse_notifications.notifications
       (user_id, space_id, category, title, body, action_url, icon, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING notification_id`,
      [
        userId,
        input.spaceId || null,
        input.category,
        input.title,
        input.body || null,
        input.actionUrl || null,
        input.icon || defaultIcon,
        JSON.stringify(input.metadata || {}),
      ]
    )
    return rows[0].notification_id
  }

  /**
   * Send email via Resend with the appropriate React Email template.
   * Email templates are resolved dynamically from the category config.
   */
  private static async sendEmailNotification(
    input: DispatchInput,
    recipient: DispatchInput['recipients'][0],
    categoryConfig: { emailTemplate: string; code: string }
  ): Promise<void> {
    // Dynamic import of email template
    const templateModule = await import(`@/emails/${categoryConfig.emailTemplate}`)
    const EmailComponent = templateModule.default

    await resend.emails.send({
      from: EMAIL_FROM,
      to: recipient.email!,
      subject: input.title,
      react: EmailComponent({
        title: input.title,
        body: input.body,
        actionUrl: input.actionUrl,
        userName: recipient.fullName,
        metadata: input.metadata,
      }),
    })

    // Log to BigQuery (same pattern as transactional emails)
    await logEmail({
      email_to: recipient.email!,
      email_type: `notification_${categoryConfig.code}`,
      user_id: recipient.userId,
      client_id: null,
      status: 'sent',
    })
  }

  /**
   * Emit an SSE event to notify the frontend of a new notification.
   * Uses an in-memory pub/sub (see SSE section).
   */
  private static async emitSSEEvent(userId: string): Promise<void> {
    // Import the SSE emitter (defined in PARTE E)
    const { notificationEmitter } = await import('@/lib/notifications/sse-emitter')
    notificationEmitter.emit(userId)
  }

  /**
   * Log dispatch attempt to notification_log.
   */
  private static async logDispatch(
    notificationId: string | null,
    userId: string,
    category: string,
    channel: string,
    status: string,
    skipReason?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO greenhouse_notifications.notification_log
         (notification_id, user_id, category, channel, status, skip_reason, error_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [notificationId, userId, category, channel, status, skipReason || null, errorMessage || null]
      )
    } catch {
      // Log failure should never break the dispatch flow
      console.error('[NotificationService] Failed to write notification_log')
    }
  }
}
```

### C2. Helper de queries de notificaciones

Archivo: `src/lib/notifications/notification-queries.ts`

```typescript
// src/lib/notifications/notification-queries.ts

import { pool } from '@/lib/postgres'

export interface NotificationRow {
  notification_id: string
  category: string
  title: string
  body: string | null
  action_url: string | null
  icon: string | null
  metadata: Record<string, unknown>
  read_at: string | null
  created_at: string
}

/**
 * Get unread count for a user (used by bell badge and SSE).
 */
export async function getUnreadCount(userId: string, spaceId?: string): Promise<number> {
  const query = spaceId
    ? `SELECT COUNT(*) as count
       FROM greenhouse_notifications.notifications
       WHERE user_id = $1 AND (space_id = $2 OR space_id IS NULL)
         AND read_at IS NULL AND archived_at IS NULL`
    : `SELECT COUNT(*) as count
       FROM greenhouse_notifications.notifications
       WHERE user_id = $1
         AND read_at IS NULL AND archived_at IS NULL`

  const params = spaceId ? [userId, spaceId] : [userId]
  const { rows } = await pool.query(query, params)
  return parseInt(rows[0].count, 10)
}

/**
 * List notifications for a user with pagination.
 */
export async function listNotifications(params: {
  userId: string
  spaceId?: string
  unreadOnly?: boolean
  category?: string
  limit?: number
  cursor?: string  // notification_id for keyset pagination
}): Promise<{ notifications: NotificationRow[]; hasMore: boolean }> {
  const limit = params.limit || 20
  const conditions: string[] = ['n.user_id = $1', 'n.archived_at IS NULL']
  const values: unknown[] = [params.userId]
  let paramIndex = 2

  if (params.spaceId) {
    conditions.push(`(n.space_id = $${paramIndex} OR n.space_id IS NULL)`)
    values.push(params.spaceId)
    paramIndex++
  }

  if (params.unreadOnly) {
    conditions.push('n.read_at IS NULL')
  }

  if (params.category) {
    conditions.push(`n.category = $${paramIndex}`)
    values.push(params.category)
    paramIndex++
  }

  if (params.cursor) {
    conditions.push(`n.created_at < (SELECT created_at FROM greenhouse_notifications.notifications WHERE notification_id = $${paramIndex}::uuid)`)
    values.push(params.cursor)
    paramIndex++
  }

  values.push(limit + 1)  // fetch one extra to detect hasMore

  const query = `
    SELECT notification_id, category, title, body, action_url, icon, metadata, read_at, created_at
    FROM greenhouse_notifications.notifications n
    WHERE ${conditions.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT $${paramIndex}
  `

  const { rows } = await pool.query(query, values)
  const hasMore = rows.length > limit
  const notifications = hasMore ? rows.slice(0, limit) : rows

  return { notifications, hasMore }
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(notificationId: string, userId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE greenhouse_notifications.notifications
     SET read_at = now()
     WHERE notification_id = $1 AND user_id = $2 AND read_at IS NULL`,
    [notificationId, userId]
  )
  return (rowCount ?? 0) > 0
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllAsRead(userId: string, spaceId?: string): Promise<number> {
  const query = spaceId
    ? `UPDATE greenhouse_notifications.notifications
       SET read_at = now()
       WHERE user_id = $1 AND (space_id = $2 OR space_id IS NULL)
         AND read_at IS NULL AND archived_at IS NULL`
    : `UPDATE greenhouse_notifications.notifications
       SET read_at = now()
       WHERE user_id = $1
         AND read_at IS NULL AND archived_at IS NULL`

  const params = spaceId ? [userId, spaceId] : [userId]
  const { rowCount } = await pool.query(query, params)
  return rowCount ?? 0
}

/**
 * Archive a notification (soft-remove from user view).
 */
export async function archiveNotification(notificationId: string, userId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE greenhouse_notifications.notifications
     SET archived_at = now()
     WHERE notification_id = $1 AND user_id = $2 AND archived_at IS NULL`,
    [notificationId, userId]
  )
  return (rowCount ?? 0) > 0
}

/**
 * Get/set notification preferences for a user.
 */
export async function getPreferences(userId: string): Promise<Record<string, { in_app_enabled: boolean; email_enabled: boolean; muted_until: string | null }>> {
  const { rows } = await pool.query(
    `SELECT category, in_app_enabled, email_enabled, muted_until
     FROM greenhouse_notifications.notification_preferences
     WHERE user_id = $1`,
    [userId]
  )
  const prefs: Record<string, any> = {}
  for (const row of rows) {
    prefs[row.category] = {
      in_app_enabled: row.in_app_enabled,
      email_enabled: row.email_enabled,
      muted_until: row.muted_until,
    }
  }
  return prefs
}

export async function upsertPreference(
  userId: string,
  category: string,
  inAppEnabled: boolean,
  emailEnabled: boolean
): Promise<void> {
  await pool.query(
    `INSERT INTO greenhouse_notifications.notification_preferences
     (user_id, category, in_app_enabled, email_enabled, updated_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (user_id, category)
     DO UPDATE SET in_app_enabled = $3, email_enabled = $4, updated_at = now()`,
    [userId, category, inAppEnabled, emailEnabled]
  )
}
```

---

## PARTE D: API Routes

### D1. `GET /api/notifications`

Archivo: `src/app/api/notifications/route.ts`

Retorna lista paginada de notificaciones del usuario autenticado, filtrada por `space_id` del tenant context.

**Query params:** `unread_only` (boolean), `category` (string), `limit` (number, default 20, max 50), `cursor` (notification_id)

**Response:**
```json
{
  "notifications": [
    {
      "notification_id": "uuid",
      "category": "feedback_requested",
      "title": "Revisión pendiente: Banner Q2 Sky Airlines",
      "body": "El asset requiere tu aprobación para avanzar a producción.",
      "action_url": "/proyectos/abc123",
      "icon": "IconMessageCircle",
      "metadata": { "project_name": "Q2 Campaign" },
      "read_at": null,
      "created_at": "2026-03-21T14:30:00Z"
    }
  ],
  "has_more": true,
  "next_cursor": "uuid-of-last-item"
}
```

**Auth:** Requiere sesión. Filtra por `session.userId`. Space-scoped para client users, all-spaces para internal users con `can_view_all_spaces`.

### D2. `GET /api/notifications/count`

Archivo: `src/app/api/notifications/count/route.ts`

Retorna solo el count de unread. Query ultraligero para el badge.

**Response:**
```json
{ "count": 5 }
```

### D3. `PATCH /api/notifications/[id]/read`

Archivo: `src/app/api/notifications/[id]/read/route.ts`

Marca una notificación como leída. Verifica que `notification.user_id === session.userId`.

**Response:** `{ "success": true }`

### D4. `PATCH /api/notifications/read-all`

Archivo: `src/app/api/notifications/read-all/route.ts`

Marca todas las notificaciones unread del usuario como leídas. Respeta `space_id` scope.

**Response:** `{ "success": true, "count": 12 }`

### D5. `DELETE /api/notifications/[id]`

Archivo: `src/app/api/notifications/[id]/route.ts`

Archive (no delete). Sets `archived_at = now()`.

**Response:** `{ "success": true }`

### D6. `GET /api/notifications/preferences`

Archivo: `src/app/api/notifications/preferences/route.ts`

Retorna las preferencias del usuario, mergeadas con los defaults del catálogo. Para cada categoría visible al audience del usuario, retorna el estado de cada canal.

**Response:**
```json
{
  "preferences": [
    {
      "category": "feedback_requested",
      "label": "Feedback solicitado",
      "description": "Se necesita tu revisión o aprobación",
      "in_app_enabled": true,
      "email_enabled": true,
      "muted_until": null
    }
  ]
}
```

**Lógica de filtrado por audience:** Usa los `roleCodes` de la sesión para determinar qué categorías mostrar. Si tiene roles client → muestra categorías `client`. Si tiene `collaborator` → muestra `collaborator`. Si tiene roles internal → muestra `internal`. Si tiene `efeonce_admin` → muestra todas.

### D7. `PUT /api/notifications/preferences`

Archivo: `src/app/api/notifications/preferences/route.ts`

Actualiza preferencias de canal por categoría.

**Body:**
```json
{
  "preferences": [
    { "category": "feedback_requested", "in_app_enabled": true, "email_enabled": false },
    { "category": "delivery_update", "in_app_enabled": true, "email_enabled": true }
  ]
}
```

**Validación:** Solo acepta categorías válidas del catálogo. Ignora categorías que no correspondan al audience del usuario.

---

## PARTE E: SSE (Server-Sent Events) para Real-Time

### E1. SSE Emitter (In-memory pub/sub)

Archivo: `src/lib/notifications/sse-emitter.ts`

En Vercel Serverless, cada invocación es un proceso aislado, así que un EventEmitter en memoria no puede comunicar entre funciones. La estrategia es que el SSE handler hace **polling interno** a PostgreSQL cada 5 segundos, pero el cliente recibe un stream SSE limpio sin tener que hacer polling desde el browser.

```typescript
// src/lib/notifications/sse-emitter.ts

/**
 * SSE notification emitter.
 *
 * Architecture note: In Vercel serverless, we can't share in-memory state
 * between the SSE handler and the dispatch function (they may run in
 * different invocations). The SSE handler uses internal polling against
 * PostgreSQL as the source of truth.
 *
 * The emitter.emit() call is a no-op placeholder for future upgrade to
 * Redis Pub/Sub or Vercel KV if real-time latency becomes critical.
 */
export const notificationEmitter = {
  emit(userId: string): void {
    // No-op in serverless. SSE handler polls PostgreSQL directly.
    // Future: publish to Redis channel `notifications:${userId}`
  }
}
```

### E2. SSE Endpoint

Archivo: `src/app/api/notifications/stream/route.ts`

```typescript
// src/app/api/notifications/stream/route.ts

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUnreadCount } from '@/lib/notifications/notification-queries'

export const runtime = 'nodejs'  // SSE requires Node.js runtime, not Edge
export const dynamic = 'force-dynamic'

const POLL_INTERVAL_MS = 5_000  // 5 seconds internal poll
const MAX_CONNECTION_MS = 300_000  // 5 minutes max, then client reconnects

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const userId = session.userId
  const spaceId = session.spaceId  // from TenantContext

  const encoder = new TextEncoder()
  let lastCount = -1
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial count immediately
      try {
        const count = await getUnreadCount(userId, spaceId)
        lastCount = count
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'count', count })}\n\n`))
      } catch {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'init_failed' })}\n\n`))
      }

      const startTime = Date.now()

      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval)
          return
        }

        // Max connection time reached — close and let client reconnect
        if (Date.now() - startTime > MAX_CONNECTION_MS) {
          clearInterval(interval)
          controller.close()
          return
        }

        try {
          const count = await getUnreadCount(userId, spaceId)
          // Only send if count changed (avoid unnecessary traffic)
          if (count !== lastCount) {
            lastCount = count
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'count', count })}\n\n`))
          } else {
            // Send heartbeat to keep connection alive
            controller.enqueue(encoder.encode(`: heartbeat\n\n`))
          }
        } catch {
          // Don't kill the stream on transient DB errors
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        }
      }, POLL_INTERVAL_MS)

      // Cleanup on abort (client closes tab, navigates away)
      request.signal.addEventListener('abort', () => {
        closed = true
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',  // Prevent Vercel/nginx buffering
    },
  })
}
```

**Notas:**
- El handler hace polling interno cada 5 segundos pero solo emite un evento SSE cuando el count cambia. El browser no recibe spam.
- Max 5 minutos de conexión, después el browser reconecta automáticamente (EventSource hace reconnect nativo).
- Heartbeat cada 5 segundos para evitar que proxies/CDN corten la conexión por inactividad.
- `runtime = 'nodejs'` porque SSE con streams largos no funciona bien en Edge Runtime de Vercel.

### E3. Hook de frontend para SSE

Archivo: `src/hooks/useNotificationStream.ts`

```typescript
// src/hooks/useNotificationStream.ts

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseNotificationStreamReturn {
  unreadCount: number
  isConnected: boolean
  refetch: () => void
}

export function useNotificationStream(): UseNotificationStreamReturn {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const es = new EventSource('/api/notifications/stream')
    eventSourceRef.current = es

    es.onopen = () => setIsConnected(true)

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'count') {
          setUnreadCount(data.count)
        }
      } catch {
        // Ignore parse errors (heartbeats, etc.)
      }
    }

    es.onerror = () => {
      setIsConnected(false)
      // EventSource automatically reconnects with exponential backoff
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      eventSourceRef.current?.close()
    }
  }, [connect])

  // Manual refetch (e.g., after marking as read)
  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/count')
      const data = await res.json()
      setUnreadCount(data.count)
    } catch {
      // Silently fail — SSE will catch up
    }
  }, [])

  return { unreadCount, isConnected, refetch }
}
```

---

## PARTE F: Componentes Frontend

### F1. NotificationBell (Navbar)

Archivo: `src/components/notifications/NotificationBell.tsx`

Componente que vive en el navbar, al lado del avatar/settings. Usa `useNotificationStream()` para el badge count.

**Layout ASCII:**

```
┌─────────────────────────────────────────────────────┐
│  Navbar   [... tabs ...]    🔔(3)   👤 Avatar ▼    │
│                              │                       │
│                    ┌─────────┴─────────┐             │
│                    │  Notificaciones    │             │
│                    │                    │             │
│                    │  Hoy               │             │
│                    │  ● Feedback soli.. │             │
│                    │  ● Asset aprobado  │             │
│                    │                    │             │
│                    │  Ayer              │             │
│                    │  ○ Ciclo completad │             │
│                    │  ○ Reporte listo   │             │
│                    │                    │             │
│                    │─────────────────── │             │
│                    │ Marcar todas  │ Ver todas      │
│                    └────────────────────┘             │
└─────────────────────────────────────────────────────┘
```

**Comportamiento:**
- Badge muestra count de `useNotificationStream().unreadCount`. Si es 0, no muestra badge. Si >9, muestra "9+".
- Click → abre MUI Popover (no Dialog, para que sea lightweight).
- El popover hace `GET /api/notifications?limit=10&unread_only=false` al abrirse.
- Items agrupados por día (Hoy, Ayer, Esta semana, Anteriores).
- Click en item → navega a `action_url`, llama `PATCH /api/notifications/[id]/read`, refetch count.
- "Marcar todas como leídas" → `PATCH /api/notifications/read-all`, refetch count.
- "Ver todas" → navega a `/notifications`.

**Styling:**
- Ícono: `IconBell` de Tabler Icons (ya disponible en el proyecto).
- Badge: `GH_COLORS.brand.coreBlue` (`#0375db`) sobre blanco.
- Popover: max-width 380px, max-height 480px con scroll.
- Dot de unread: circulito `GH_COLORS.brand.coreBlue` 8px a la izquierda del item.
- Timestamp: `DM Sans` 12px, color `#667085`, formato relativo ("hace 2h", "ayer").

### F2. NotificationItem

Archivo: `src/components/notifications/NotificationItem.tsx`

Componente reutilizable para cada fila de notificación (tanto en dropdown como en la página completa).

```
┌─────────────────────────────────────────────────┐
│ ● 📦  Revisión pendiente: Banner Q2 Sky Airlines │
│        El asset requiere tu aprobación para...   │
│        hace 2h                              ✕    │
└─────────────────────────────────────────────────┘
```

- Dot azul a la izquierda si `read_at === null`.
- Ícono de categoría (resuelto desde `NOTIFICATION_CATEGORIES[category].icon`).
- Title en `DM Sans` 14px SemiBold. Body en `DM Sans` 13px regular, color `#667085`, max 2 líneas con ellipsis.
- Timestamp relativo. Botón `✕` para archivar (solo visible en hover).

### F3. NotificationsPage

Archivo: `src/app/(dashboard)/notifications/page.tsx`

Página completa de notificaciones. No pertenece a un route group específico — es accesible para todos los usuarios autenticados.

**Layout ASCII:**

```
┌──────────────────────────────────────────────────────────┐
│  Notificaciones                                          │
│  Historial de notificaciones y alertas                   │
│                                                          │
│  [Todas]  [Sin leer]          Filtro: [Categoría ▼]     │
│                                                          │
│  Hoy ─────────────────────────────────────────────────── │
│  ● 📦 Revisión pendiente: Banner Q2...       hace 2h    │
│  ● 💬 Feedback solicitado: Logo refresh...   hace 4h    │
│                                                          │
│  Ayer ────────────────────────────────────────────────── │
│  ○ 🏁 Ciclo completado: Sprint Mar-W3       ayer 16:30  │
│  ○ 📊 Reporte disponible: Reporte semanal   ayer 07:00  │
│                                                          │
│  ──── Cargar más ────                                    │
└──────────────────────────────────────────────────────────┘
```

**Comportamiento:**
- Tabs: "Todas" / "Sin leer" (toggle `unread_only`).
- Filtro de categoría: dropdown con las categorías del audience del usuario.
- Infinite scroll con keyset pagination (`cursor`).
- Click en item → navega a `action_url` + marca como leída.

### F4. NotificationPreferences (dentro de Settings)

Archivo: `src/app/(dashboard)/settings/notifications/page.tsx` (o sección dentro del settings existente)

Tabla de preferencias con toggles por canal.

**Layout ASCII:**

```
┌──────────────────────────────────────────────────────────┐
│  Preferencias de notificación                            │
│  Controla qué notificaciones recibes y por qué canal.    │
│                                                          │
│  Tipo                           In-app    Email          │
│  ─────────────────────────────────────────────────────── │
│  Feedback solicitado            [✓]       [✓]            │
│  Delivery updates               [✓]       [ ]            │
│  Hitos de ciclo                 [✓]       [ ]            │
│  Reporte disponible             [✓]       [✓]            │
│                                                          │
│                                    [Guardar cambios]     │
└──────────────────────────────────────────────────────────┘
```

**Comportamiento:**
- Solo muestra categorías relevantes al audience del usuario.
- Carga preferencias actuales de `GET /api/notifications/preferences`.
- Al guardar → `PUT /api/notifications/preferences`.
- Toast de confirmación: `GH_NOTIFICATIONS.prefs_saved`.

---

## PARTE G: Email Templates

### G1. Template base de notificación

Archivo: `src/emails/NotificationBaseEmail.tsx`

Extiende el `EmailLayout.tsx` existente. Agrega un patrón visual consistente para todas las notificaciones:

- Header con ícono de categoría + título
- Body text
- Botón CTA: "Ver en Greenhouse" → `actionUrl`
- Footer estándar de Greenhouse

**Design tokens** (heredados del transactional email system):
- Header background: Midnight Navy `#022a4e`
- CTA: Core Blue `#0375db`, Poppins SemiBold 16px
- Body: DM Sans 14px, color `#344054`
- Footer: DM Sans 13px, color `#667085`

### G2. Templates por categoría

Crear un template por categoría. Cada uno importa `NotificationBaseEmail` y customiza el contenido con `metadata`:

| Template file | Categoría | Subject pattern |
|---|---|---|
| `FeedbackRequestedEmail.tsx` | `feedback_requested` | "Revisión pendiente: {asset_name} — Greenhouse" |
| `DeliveryUpdateEmail.tsx` | `delivery_update` | "Asset actualizado: {asset_name} — Greenhouse" |
| `SprintMilestoneEmail.tsx` | `sprint_milestone` | "Ciclo {sprint_name}: {milestone} — Greenhouse" |
| `ReportReadyEmail.tsx` | `report_ready` | "Tu reporte está listo — Greenhouse" |
| `LeaveStatusEmail.tsx` | `leave_status` | "Permiso {status}: {date_range} — Greenhouse" |
| `PayrollReadyEmail.tsx` | `payroll_ready` | "Liquidación {period} disponible — Greenhouse" |
| `AssignmentChangeEmail.tsx` | `assignment_change` | "Nueva asignación: {project_name} — Greenhouse" |
| `IcoAlertEmail.tsx` | `ico_alert` | "Alerta ICO: {metric} en {space_name} — Greenhouse" |
| `CapacityWarningEmail.tsx` | `capacity_warning` | "Alerta de capacidad: {team/member} — Greenhouse" |
| `SystemEventEmail.tsx` | `system_event` | "Greenhouse: {event_summary}" |

**Nota:** Usar el script `email:dev` existente para preview en `http://localhost:3001`.

---

## PARTE H: Integración con Módulos Existentes

### H1. Ejemplo de integración: HR Leave

Cuando se aprueba o rechaza un permiso en `POST /api/hr/core/leave/requests/[requestId]/review`:

```typescript
import { NotificationService } from '@/lib/notifications/notification-service'

// Después de actualizar el status del permiso en PostgreSQL:
await NotificationService.dispatch({
  category: 'leave_status',
  recipients: [{
    userId: request.requester_user_id,
    email: request.requester_email,
    fullName: request.requester_name,
  }],
  title: `Permiso ${approved ? 'aprobado' : 'rechazado'}: ${formatDateRange(request.start_date, request.end_date)}`,
  body: approved
    ? 'Tu solicitud fue aprobada. Ya está reflejada en tu calendario.'
    : `Tu solicitud fue rechazada. Motivo: ${reviewComment}`,
  actionUrl: '/my/leave',
  metadata: {
    leave_request_id: request.request_id,
    status: approved ? 'approved' : 'rejected',
    date_range: `${request.start_date} – ${request.end_date}`,
  },
})
```

### H2. Ejemplo de integración: ICO Alert

En el cron `ico-materialize` (`/api/cron/ico-materialize`), después de calcular los snapshots:

```typescript
// Detectar métricas que cruzaron umbral de semáforo
const alerts = detectThresholdCrossings(currentSnapshot, previousSnapshot)

for (const alert of alerts) {
  // Buscar usuarios con roles internal que tienen scope sobre este space
  const recipients = await getInternalUsersForSpace(alert.space_id)

  await NotificationService.dispatch({
    category: 'ico_alert',
    recipients,
    spaceId: alert.space_id,
    title: `Alerta ICO: ${alert.metric_name} en ${alert.space_name}`,
    body: `${alert.metric_name} pasó de ${alert.previous_semaphore} a ${alert.current_semaphore} (${alert.current_value}).`,
    actionUrl: `/internal/clientes/${alert.client_id}`,
    metadata: {
      metric: alert.metric_name,
      value: alert.current_value,
      semaphore: alert.current_semaphore,
      space_name: alert.space_name,
    },
  })
}
```

### H3. Módulos pendientes de integración

Los siguientes módulos deberían integrar `NotificationService.dispatch()` en sus flujos, pero NO son parte de esta tarea. Cada uno se integra cuando su propio CODEX TASK lo requiera o como follow-up:

| Módulo | Evento | Categoría |
|---|---|---|
| Payroll | Liquidación cerrada para el período | `payroll_ready` |
| Creative Hub | Asset cambia de estado en CSC pipeline | `delivery_update` |
| Creative Hub | Se solicita revisión de asset | `feedback_requested` |
| Sprint cron | Sprint arrancó / Sprint cerrado | `sprint_milestone` |
| Data Node Nivel 2 | Scheduled report generado | `report_ready` |
| SCIM | Nuevo usuario provisionado | `system_event` |
| Team Capacity | Utilización sobre 90% | `capacity_warning` |
| Assignment engine | Cambio de proyecto/asignación | `assignment_change` |

---

## PARTE I: Cleanup Job

### I1. Purge de notificaciones archivadas

Vercel cron job que elimina notificaciones archivadas con más de 90 días.

Archivo: `src/app/api/cron/notifications-cleanup/route.ts`

```typescript
export async function GET() {
  const { rowCount } = await pool.query(
    `DELETE FROM greenhouse_notifications.notifications
     WHERE archived_at IS NOT NULL AND archived_at < now() - INTERVAL '90 days'`
  )

  // También limpiar log entries de más de 180 días
  await pool.query(
    `DELETE FROM greenhouse_notifications.notification_log
     WHERE created_at < now() - INTERVAL '180 days'`
  )

  return Response.json({ purged_notifications: rowCount })
}
```

Agregar a `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/notifications-cleanup",
      "schedule": "0 4 * * 0"
    }
  ]
}
```

Schedule: Domingos a las 4:00 AM UTC (madrugada del domingo en Chile).

---

## File Structure

```
src/
├── config/
│   ├── greenhouse-nomenclature.ts          # ← agregar GH_NOTIFICATIONS
│   └── notification-categories.ts          # B1 — catálogo de categorías
│
├── lib/
│   └── notifications/
│       ├── notification-service.ts         # C1 — dispatch service
│       ├── notification-queries.ts         # C2 — PostgreSQL queries
│       └── sse-emitter.ts                  # E1 — SSE emitter (placeholder)
│
├── hooks/
│   └── useNotificationStream.ts            # E3 — SSE hook
│
├── components/
│   └── notifications/
│       ├── NotificationBell.tsx             # F1 — navbar bell + dropdown
│       ├── NotificationItem.tsx             # F2 — single notification row
│       └── NotificationDropdown.tsx         # Dropdown content (used by Bell)
│
├── app/
│   ├── (dashboard)/
│   │   ├── notifications/
│   │   │   └── page.tsx                    # F3 — full notifications page
│   │   └── settings/
│   │       └── notifications/
│   │           └── page.tsx                # F4 — preferences page
│   │
│   └── api/
│       └── notifications/
│           ├── route.ts                    # D1 — list notifications
│           ├── count/
│           │   └── route.ts                # D2 — unread count
│           ├── read-all/
│           │   └── route.ts                # D4 — mark all as read
│           ├── preferences/
│           │   └── route.ts                # D6, D7 — get/put preferences
│           ├── stream/
│           │   └── route.ts                # E2 — SSE endpoint
│           ├── [id]/
│           │   ├── route.ts                # D5 — archive notification
│           │   └── read/
│           │       └── route.ts            # D3 — mark single as read
│           └── cron/
│               └── notifications-cleanup/  # I1 — ya existe arriba
│
├── emails/
│   ├── NotificationBaseEmail.tsx            # G1 — base template
│   ├── FeedbackRequestedEmail.tsx           # G2
│   ├── DeliveryUpdateEmail.tsx              # G2
│   ├── SprintMilestoneEmail.tsx             # G2
│   ├── ReportReadyEmail.tsx                 # G2
│   ├── LeaveStatusEmail.tsx                 # G2
│   ├── PayrollReadyEmail.tsx                # G2
│   ├── AssignmentChangeEmail.tsx            # G2
│   ├── IcoAlertEmail.tsx                    # G2
│   ├── CapacityWarningEmail.tsx             # G2
│   └── SystemEventEmail.tsx                 # G2
│
scripts/
└── setup-postgres-notifications.sql        # A5 — DDL script
```

---

## Acceptance Criteria

### Funcional
- [ ] La campanita muestra el badge con el count de notificaciones unread
- [ ] El dropdown lista notificaciones agrupadas por día
- [ ] Click en una notificación navega al `action_url` y la marca como leída
- [ ] "Marcar todas como leídas" actualiza el count a 0
- [ ] La página `/notifications` carga con infinite scroll y filtros
- [ ] Las preferencias se pueden editar en Settings y se persisten
- [ ] Notificaciones de email se envían solo si el usuario tiene el canal habilitado
- [ ] Emails llegan con branding Greenhouse (header Midnight Navy, CTA Core Blue, footer estándar)
- [ ] SSE stream actualiza el badge en near-real-time cuando llega una nueva notificación
- [ ] Client users solo ven notificaciones de su `space_id`
- [ ] Collaborators ven notificaciones personales (leave, payroll) sin `space_id`
- [ ] `efeonce_admin` ve todas las notificaciones

### Técnico
- [ ] Schema `greenhouse_notifications` creado con las 3 tablas y sus índices
- [ ] `NotificationService.dispatch()` funciona end-to-end (in_app + email)
- [ ] API routes protegidas con session auth (401 si no hay sesión)
- [ ] Notificaciones filtradas por `user_id` de sesión (nunca del browser)
- [ ] SSE endpoint con heartbeat, auto-reconnect, y max connection time de 5 minutos
- [ ] Cleanup cron configurado en `vercel.json`
- [ ] `email:dev` permite preview de todos los templates de notificación
- [ ] `pnpm tsc --noEmit` pasa sin errores

### No incluido en este task (Phase 2)
- [ ] Digest email (agrupar N notificaciones en un solo email periódico)
- [ ] Push notifications (mobile)
- [ ] WebSocket / persistent connections
- [ ] Templates configurables desde admin UI
- [ ] Batch/consolidation de notificaciones del mismo tipo
- [ ] Redis pub/sub para SSE real-time verdadero (eliminar polling interno)
- [ ] Outbox → BigQuery para analytics de notificaciones

---

## Notas para el agente

1. **Verificar el helper de PostgreSQL existente** — puede ser `src/lib/db.ts`, `src/lib/postgres.ts`, o `src/lib/postgres-pool.ts`. Usar el que esté en uso en otros módulos (HR, Finance). No crear uno nuevo.

2. **Resend está configurado** — el helper `src/lib/resend.ts` y el `EMAIL_FROM` ya existen. Reutilizar.

3. **No crear nuevos archivos de constantes** — todo va en `greenhouse-nomenclature.ts` (agregar la sección `GH_NOTIFICATIONS`). No crear `notification-constants.ts` ni similar.

4. **MUI components** — usar `Popover`, `Badge`, `IconButton`, `Tabs`, `Switch` de MUI. No instalar librerías adicionales de UI.

5. **Tabler Icons** — los íconos de categoría (`IconBell`, `IconPackage`, `IconFlag`, etc.) ya están disponibles via `@tabler/icons-react`.

6. **Email templates** — seguir el patrón exacto de `src/emails/` existente. Usar `@react-email/components` y el `EmailLayout.tsx` como wrapper.

7. **No tocar middleware.ts** — las API routes de notifications no necesitan excepción en middleware. Están protegidas por session auth dentro de cada handler.

8. **SSE en Vercel** — usar `runtime = 'nodejs'` (no Edge). El stream debe cerrarse después de 5 minutos para respetar los límites de Vercel Functions.

9. **Categorías son extensibles** — si un módulo futuro necesita una categoría nueva, solo se agrega al `NOTIFICATION_CATEGORIES`. El sistema de preferencias la detecta automáticamente.

10. **Testing** — para probar dispatch sin integrar con módulos reales, crear un endpoint temporal `POST /api/notifications/test-dispatch` (solo disponible en `NODE_ENV === 'development'`) que envíe una notificación de prueba al usuario autenticado.
