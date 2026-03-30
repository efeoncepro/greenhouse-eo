# TASK-129 — In-App Notifications via Webhook Bus

## Delta 2026-03-29 — recipient resolution canónica
- El consumer webhook ya quedó alineado al resolver compartido `person-first`.
- Contrato vigente del carril:
  - `identity_profile` como raíz humana
  - `member` para eventos colaborador/payroll
  - `client_user` como inbox portal
  - fallback `email-only` cuando no exista principal portal activo
- El dedupe del consumer ya opera sobre la recipient key efectiva (`userId`, `person:*`, `member:*` o `external:*`), no solo sobre `userId`.
- `payroll_period.exported` corrige además el label mensual con timezone `America/Santiago`, evitando deriva de mes en bordes UTC.

## Delta 2026-03-29
- La implementación arranca con convivencia explícita entre carriles:
  - `reactive notifications` conserva `service.created`, `identity.reconciliation.approved`, `finance.dte.discrepancy_found`, `identity.profile.linked`
  - `webhook notifications` toma `assignment.created`, `assignment.updated`, `assignment.removed`, `compensation_version.created`, `member.created`, `payroll_period.exported`
- Se adopta `NotificationService.dispatch()` como API única y se agrega dedupe funcional por `eventId + category + userId` usando metadata en `greenhouse_notifications.notifications`.
- El self-loop de `wh-sub-notifications` soporta bypass opcional de `Deployment Protection`, igual que el canary, para no nacer bloqueado en `staging`.

## Delta 2026-03-29 — Hardening + env rollout
- El consumer webhook ya no queda `fail-open`:
  - si existe secreto resuelto y falta `x-greenhouse-signature`, responde `401`
- El dedupe funcional ya cubre también los casos `email-only`:
  - `notification_log` ahora persiste metadata del evento
  - el filtro de dedupe consulta `notifications` + `notification_log`
- Rollout externo avanzado:
  - `staging`: `WEBHOOK_NOTIFICATIONS_SECRET_SECRET_REF=webhook-notifications-secret`
  - `production`: `WEBHOOK_NOTIFICATIONS_SECRET_SECRET_REF=webhook-notifications-secret`
- Estado transicional explícito:
  - `staging` conserva además `WEBHOOK_NOTIFICATIONS_SECRET`
  - `webhook-notifications-secret` ya fue creado/verificado en GCP Secret Manager
- Los seed routes de webhooks ahora prefieren el alias estable del request sobre `VERCEL_URL` efímero.
- Los target builders limpian también secuencias literales `\n`/`\r` en bypass secrets, evitando subscriptions con `%5Cn`.
- La subscription real `wh-sub-notifications` quedó corregida en `staging` para usar `https://dev-greenhouse.efeoncepro.com/...`.
- Smoke firmado en `staging` contra `dev-greenhouse.efeoncepro.com` responde `200` con `mapped=true`.

## Delta 2026-03-29 — E2E validada en staging
- Se alineó `greenhouse_core.client_users.member_id` para usuarios internos activos con match exacto de nombre contra `members`, destrabando la resolución de recipients.
- Evidencia real:
  - `assignment.created` visible en campanita para `user-efeonce-admin-julio-reyes`
  - `payroll_period.exported` con `periodId=2026-03` resolvió 4 recipients y creó 4 notificaciones `payroll_ready`
- La lane queda cerrada para el alcance definido en esta task; el follow-on natural es endurecer la higiene de identity linkage y retirar el fallback crudo del secreto en `staging`.

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `complete` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Medio` |
| Status real | `Cerrada` |
| Rank | — |
| Domain | UX / Infrastructure / Notifications |
| Sequence | Post TASK-125 (Webhook Activation), parte de TASK-128 (Webhook Consumers Roadmap) |

## Summary

Conectar el bus de webhooks outbound con el sistema de notificaciones existente (TASK-023) para que los eventos de negocio generen notificaciones in-app y email automáticamente. Hoy las notificaciones se crean manualmente por cada caso de uso. Con esta task, cada evento del outbox puede generar notificaciones con solo agregar un mapping declarativo — sin código custom por módulo.

## Why This Task Exists

El sistema de notificaciones de Greenhouse (TASK-023) ya funciona:
- Campanita con badge en el navbar
- Dropdown de notificaciones
- Página completa `/notifications`
- Preferencias por usuario (in-app/email/mute)
- Email vía Resend con branding Greenhouse
- 10 categorías configuradas (`notification-categories.ts`)
- `NotificationService.dispatch()` como API única

Pero hoy cada notificación se crea manualmente con código específico en el módulo que la produce. Esto significa:
- Si Payroll quiere notificar "liquidación lista", tiene que importar `NotificationService` y construir el dispatch manualmente
- Si Finance quiere avisar de una discrepancia DTE, otro bloque de código manual
- Cada nuevo caso es un PR con lógica de notificación inline

El bus de webhooks ya tiene los eventos que representan estas acciones. Conectar un consumer de notificaciones elimina el código manual y convierte la generación de notificaciones en una tabla de mapeo declarativa.

## Architecture

```
outbox_events (published)
      │
      ├── outbox-react crons → projections (serving interno)
      │
      └── webhook-dispatch cron (*/2 min)
              │
              └── subscription: wh-sub-notifications
                      │
                      ├── POST /api/internal/webhooks/notification-dispatch
                      │         │
                      │         ├── 1. Parse envelope (eventType, aggregateId, data)
                      │         ├── 2. Lookup mapping: eventType → notification config
                      │         ├── 3. Resolve recipients from payload
                      │         ├── 4. Call NotificationService.dispatch()
                      │         │         ├── in_app → greenhouse_notifications.notifications
                      │         │         └── email → Resend (si preferencia activa)
                      │         └── 5. Return 200
                      │
                      └── delivery tracked in webhook_deliveries
```

## Dependencies & Impact

- **Depende de:**
  - TASK-006 (Webhook Infrastructure MVP) — `complete`
  - TASK-125 (Webhook Activation: Canary) — `in-progress`
  - TASK-023 (Notification System) — `complete`
  - TASK-095 (Email Delivery Layer) — `complete`
  - TASK-012 (Outbox Event Expansion) — `complete`, 70+ event types disponibles
- **Impacta a:**
  - UX de todo el portal — la campanita pasa de vacía a activa
  - Cada módulo de dominio — dejan de necesitar código manual de notificación
  - Admin Center — más deliveries visibles en Webhooks y jobs
  - TASK-128 — cierra el Slice 4 del roadmap de consumers

## Current Repo State

### Sistema de notificaciones (TASK-023)

| Archivo | Propósito |
|---------|-----------|
| `src/lib/notifications/notification-service.ts` | `NotificationService.dispatch()` — API única para crear notificaciones |
| `src/config/notification-categories.ts` | 10 categorías con audience, channels, priority, icon |
| `src/lib/notifications/schema.ts` | Setup de tablas `greenhouse_notifications.*` |
| `src/lib/email/delivery.ts` | `sendEmail()` vía Resend |

### Categorías existentes relevantes

| Categoría | Audience | Channels default | Eventos que la alimentarían |
|-----------|----------|-------------------|---------------------------|
| `payroll_ready` | collaborator | in_app + email | `payroll_period.exported` |
| `assignment_change` | collaborator | in_app | `assignment.created`, `assignment.updated` |
| `leave_status` | collaborator | in_app + email | (futuro: `leave_request.approved/rejected`) |
| `ico_alert` | internal | in_app + email | `ico.materialization.completed` + umbral |
| `system_event` | admin | in_app | `identity.reconciliation.*`, `service.created` |
| `feedback_requested` | client | in_app + email | (futuro: review request events) |

### Eventos del outbox disponibles (event-catalog.ts)

70+ event types. Los más relevantes para notificaciones:

| Event Type | Qué pasó | Quién debería enterarse |
|------------|----------|------------------------|
| `payroll_period.exported` | Recibos de nómina enviados | Cada colaborador del período |
| `payroll_period.calculated` | Nómina calculada | Admins RRHH |
| `compensation_version.created` | Compensación actualizada | Colaborador afectado |
| `assignment.created` | Asignado a proyecto | Colaborador asignado |
| `assignment.removed` | Desasignado de proyecto | Colaborador desasignado |
| `identity.reconciliation.approved` | Identidad vinculada | Usuario vinculado |
| `finance.dte.discrepancy_found` | Discrepancia tributaria | Admins Finance |
| `service.created` | Nuevo servicio activado | Admins |
| `ico.materialization.completed` | Métricas ICO actualizadas | Leads de delivery |
| `member.created` | Nuevo colaborador | Admins RRHH |

### Webhook infrastructure (TASK-006 + TASK-125)

- Dispatcher: `GET /api/cron/webhook-dispatch` (*/2 min)
- Subscriptions: `greenhouse_sync.webhook_subscriptions`
- Deliveries: `greenhouse_sync.webhook_deliveries` + `webhook_delivery_attempts`
- Signing: HMAC-SHA256 via `src/lib/webhooks/signing.ts`
- Envelope: `{ eventId, eventType, aggregateType, aggregateId, occurredAt, version, source, data }`

## Scope

### Slice 1 — Event-to-notification mapping registry (~1h)

Crear un registro declarativo que mapea event types a configuración de notificación.

1. Crear `src/lib/webhooks/consumers/notification-mapping.ts`:

```typescript
import type { WebhookEnvelope } from '@/lib/webhooks/envelope'

export interface NotificationMapping {
  /** Event type or pattern (e.g., 'payroll_period.exported') */
  eventType: string

  /** Notification category from notification-categories.ts */
  category: string

  /** Build notification title from event payload */
  title: (envelope: WebhookEnvelope) => string

  /** Build notification body from event payload (optional) */
  body?: (envelope: WebhookEnvelope) => string | null

  /** Build action URL from event payload */
  actionUrl?: (envelope: WebhookEnvelope) => string | null

  /** Icon override (defaults to category icon) */
  icon?: string

  /** Resolve recipient user IDs from event payload */
  resolveRecipients: (envelope: WebhookEnvelope) => Promise<Array<{
    userId: string
    email?: string
    fullName?: string
  }>>
}
```

2. Registrar mappings iniciales:

```typescript
export const NOTIFICATION_MAPPINGS: NotificationMapping[] = [
  {
    eventType: 'payroll_period.exported',
    category: 'payroll_ready',
    title: (env) => `Tus recibos de ${env.data.periodLabel ?? 'nómina'} están listos`,
    actionUrl: () => '/my/payroll',
    resolveRecipients: async (env) => {
      // Query: get all collaborators in this payroll period
      return getMembersForPayrollPeriod(env.data.periodId as string)
    }
  },
  {
    eventType: 'assignment.created',
    category: 'assignment_change',
    title: (env) => `Fuiste asignado a ${env.data.spaceName ?? 'un proyecto'}`,
    actionUrl: () => '/my/assignments',
    resolveRecipients: async (env) => {
      return getMemberAsRecipient(env.data.memberId as string)
    }
  },
  {
    eventType: 'compensation_version.created',
    category: 'payroll_ready',
    title: () => 'Tu compensación fue actualizada',
    body: (env) => `Vigencia desde ${env.data.effectiveFrom ?? 'próximo período'}`,
    actionUrl: () => '/my/profile',
    resolveRecipients: async (env) => {
      return getMemberAsRecipient(env.data.memberId as string)
    }
  },
  {
    eventType: 'identity.reconciliation.approved',
    category: 'system_event',
    title: () => 'Tu identidad fue vinculada exitosamente',
    actionUrl: () => '/my/profile',
    resolveRecipients: async (env) => {
      return getUserAsRecipient(env.data.userId as string)
    }
  },
  {
    eventType: 'finance.dte.discrepancy_found',
    category: 'system_event',
    title: (env) => `Discrepancia DTE detectada en ${env.data.organizationName ?? 'una organización'}`,
    actionUrl: () => '/finance',
    resolveRecipients: async () => {
      return getAdminsByRole('finance')
    }
  },
  {
    eventType: 'payroll_period.calculated',
    category: 'system_event',
    title: (env) => `Nómina ${env.data.periodLabel ?? ''} calculada`,
    actionUrl: () => '/payroll',
    resolveRecipients: async () => {
      return getAdminsByRole('hr')
    }
  },
  {
    eventType: 'member.created',
    category: 'system_event',
    title: (env) => `Nuevo colaborador: ${env.data.displayName ?? 'sin nombre'}`,
    actionUrl: (env) => `/people/${env.data.memberId ?? ''}`,
    resolveRecipients: async () => {
      return getAdminsByRole('hr')
    }
  }
]
```

### Slice 2 — Recipient resolution helpers (~1h)

Funciones que resuelven quién debe recibir cada notificación a partir del payload del evento.

1. Crear `src/lib/webhooks/consumers/notification-recipients.ts`:

```typescript
/** Get a single member as notification recipient */
export async function getMemberAsRecipient(memberId: string): Promise<Recipient[]>
// Query: greenhouse_core.team_members JOIN auth users for userId + email

/** Get all members in a payroll period */
export async function getMembersForPayrollPeriod(periodId: string): Promise<Recipient[]>
// Query: greenhouse_payroll.payroll_entries JOIN team_members for period

/** Get a user directly by userId */
export async function getUserAsRecipient(userId: string): Promise<Recipient[]>
// Query: auth users table

/** Get admin users by role/scope */
export async function getAdminsByRole(role: 'hr' | 'finance' | 'admin'): Promise<Recipient[]>
// Query: session/auth table filtered by role
```

2. Cada función retorna `{ userId, email, fullName }[]` compatible con `NotificationService.dispatch()`
3. Si no se puede resolver un recipient (e.g., memberId no tiene userId vinculado), se skipea silenciosamente con log

### Slice 3 — Consumer endpoint (~1h)

El endpoint HTTP que recibe deliveries del webhook dispatcher y despacha notificaciones.

1. Crear `src/app/api/internal/webhooks/notification-dispatch/route.ts`:

```typescript
export async function POST(request: Request) {
  // 1. Validate HMAC signature (same pattern as canary)
  // 2. Parse body as WebhookEnvelope
  // 3. Find matching mapping by eventType
  // 4. If no mapping found, return 200 (ignore event silently)
  // 5. Resolve recipients via mapping.resolveRecipients(envelope)
  // 6. If no recipients, return 200 with { dispatched: 0 }
  // 7. Call NotificationService.dispatch({
  //      category: mapping.category,
  //      recipients,
  //      title: mapping.title(envelope),
  //      body: mapping.body?.(envelope),
  //      actionUrl: mapping.actionUrl?.(envelope),
  //      icon: mapping.icon,
  //      metadata: { eventId: envelope.eventId, eventType: envelope.eventType }
  //    })
  // 8. Return 200 with dispatch result
}
```

2. El endpoint siempre retorna 200 (incluso si no hay mapping o no hay recipients) para no generar dead-letters innecesarios en el dispatcher
3. Errors en `NotificationService.dispatch()` se logean pero no causan retry del webhook — la notificación es best-effort

### Slice 4 — Subscription registration + secret (~30min)

1. Crear `POST /api/admin/ops/webhooks/seed-notifications` (patrón idéntico a `seed-canary`):
   - Registra subscription `wh-sub-notifications` apuntando a `/api/internal/webhooks/notification-dispatch`
   - Event filters: todos los event types con mapping registrado
   - Auth mode: `hmac_sha256` con `WEBHOOK_NOTIFICATIONS_SECRET`
   - Idempotente
2. Crear secret `webhook-notifications-secret` en GCP Secret Manager
3. Configurar `WEBHOOK_NOTIFICATIONS_SECRET` en Vercel (production + staging)
4. Agregar botón "Activar notificaciones via webhook" en Admin Center

### Slice 5 — Nuevas categorías de notificación si faltan (~30min)

Revisar `notification-categories.ts` y agregar categorías que falten para los mappings:

| Categoría nueva | Audience | Channels | Evento fuente |
|----------------|----------|----------|---------------|
| `compensation_update` | collaborator | in_app + email | `compensation_version.created` |
| `finance_alert` | admin | in_app + email | `finance.dte.discrepancy_found` |
| `team_change` | admin | in_app | `member.created`, `member.deactivated` |

Evaluar si los eventos existentes encajan en categorías actuales o necesitan nuevas.

### Slice 6 — Tests (~1h)

1. Unit tests para `notification-mapping.ts`:
   - Cada mapping genera título correcto a partir de un envelope mock
   - Mapping desconocido retorna undefined
   - Event type matching funciona con patterns

2. Unit tests para el consumer endpoint:
   - Envelope con mapping → dispatch called with correct params
   - Envelope sin mapping → 200 con dispatched: 0
   - Signature inválida → 401
   - Recipient resolution falla → log + continue

3. Unit tests para recipient resolution:
   - `getMemberAsRecipient` con memberId válido
   - `getMembersForPayrollPeriod` con período que tiene entries
   - `getAdminsByRole` retorna admins del rol correcto

## Resultado esperado

### Antes (manual, por módulo)

```typescript
// En cada módulo que quiere notificar:
import { NotificationService } from '@/lib/notifications/notification-service'

// Payroll:
await NotificationService.dispatch({
  category: 'payroll_ready',
  recipients: [...resolve manually...],
  title: 'Tus recibos están listos',
  actionUrl: '/my/payroll'
})

// Finance:
await NotificationService.dispatch({
  category: 'system_event',
  recipients: [...resolve manually...],
  title: 'Discrepancia DTE detectada',
  actionUrl: '/finance'
})
// ... repeat for every use case
```

### Después (declarativo, centralizado)

```typescript
// Solo agregar un mapping en notification-mapping.ts:
{
  eventType: 'new_domain.event_happened',
  category: 'relevant_category',
  title: (env) => `Algo pasó en ${env.data.entityName}`,
  actionUrl: () => '/relevant/path',
  resolveRecipients: async (env) => getRelevantUsers(env.data.entityId)
}
// El bus hace el resto: match → deliver → dispatch → in-app + email
```

## Out of Scope

- Push notifications (web push API) — mejora futura
- Real-time updates (WebSocket/SSE para la campanita) — mejora futura
- Notification digest (agrupar múltiples notificaciones en un email) — mejora futura
- UI de configuración de mappings (se editan en código) — mejora futura
- Traducción de notificaciones a otros idiomas — todo en español por ahora

## Acceptance Criteria

- [ ] Registro declarativo de mappings evento → notificación creado
- [ ] Al menos 5 event types mapeados con title, recipients y actionUrl
- [ ] Consumer endpoint recibe deliveries del dispatcher y despacha notificaciones
- [ ] Helpers de resolución de recipients funcionan (member, period, admin)
- [ ] Subscription registrada y activa en staging
- [ ] Evento `payroll_period.exported` genera notificación in-app visible en campanita
- [ ] Evento `assignment.created` genera notificación in-app para el colaborador asignado
- [ ] Preferencias de usuario (in-app/email/mute) se respetan automáticamente
- [ ] Admin Center muestra deliveries del consumer de notificaciones
- [ ] Endpoint retorna 200 para eventos sin mapping (no genera dead-letters)
- [ ] Tests unitarios para mappings, consumer y recipient resolution
- [ ] `pnpm build` pasa
- [ ] `pnpm test` pasa

## Verification

```bash
# Verificar subscription activa
psql -c "SELECT * FROM greenhouse_sync.webhook_subscriptions WHERE subscriber_code = 'greenhouse-notifications';"

# Verificar deliveries del consumer
psql -c "SELECT status, COUNT(*)
         FROM greenhouse_sync.webhook_deliveries wd
         JOIN greenhouse_sync.webhook_subscriptions ws ON wd.webhook_subscription_id = ws.webhook_subscription_id
         WHERE ws.subscriber_code = 'greenhouse-notifications'
         GROUP BY status;"

# Verificar notificaciones generadas
psql -c "SELECT category, title, created_at
         FROM greenhouse_notifications.notifications
         ORDER BY created_at DESC LIMIT 10;"

# Verificar en UI
# 1. Ir a /notifications — deberían aparecer notificaciones recientes
# 2. Campanita en navbar debería mostrar badge con count > 0
```

## File Reference

| Archivo | Propósito |
|---------|-----------|
| `src/lib/webhooks/consumers/notification-mapping.ts` | Registro declarativo evento → notificación (nuevo) |
| `src/lib/webhooks/consumers/notification-recipients.ts` | Helpers de resolución de recipients (nuevo) |
| `src/app/api/internal/webhooks/notification-dispatch/route.ts` | Consumer endpoint (nuevo) |
| `src/app/api/admin/ops/webhooks/seed-notifications/route.ts` | Seed de subscription (nuevo) |
| `src/lib/notifications/notification-service.ts` | API de dispatch existente (no se modifica) |
| `src/config/notification-categories.ts` | Categorías existentes (se extiende si falta alguna) |
| `src/lib/sync/event-catalog.ts` | Catálogo de 70+ event types (no se modifica) |
| `src/lib/webhooks/signing.ts` | Verificación HMAC (se reutiliza, no se modifica) |
