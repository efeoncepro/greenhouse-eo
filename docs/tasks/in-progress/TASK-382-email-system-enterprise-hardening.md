# TASK-382 — Email System Enterprise Hardening

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseño`
- Rank: `1` — activo data loss en producción
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-382-email-enterprise-hardening`
- Legacy ID: `none`
- GitHub Issue: `ISSUE-020`, `ISSUE-023`

## Summary

El sistema de emails tiene bugs activos que producen **pérdida permanente de notificaciones**: emails con `status='skipped'` o `status='rate_limited'` nunca son reintentados por el cron de retry. El 2026-04-13 se perdieron 13 notificaciones HR reales (leave requests, confirmaciones de aprobación). Además, las tablas `email_deliveries` y `email_subscriptions` no tienen migración formal `CREATE TABLE`, lo que hace la DB irreconstruible. Esta task resuelve los bugs críticos (Fase 1), añade hardening enterprise (Fase 2) y escala el sistema para cumplimiento y crecimiento (Fase 3).

## Why This Task Exists

Auditoría E2E del 2026-04-13 reveló tres problemas estructurales:

1. **Pérdida permanente de emails**: `deliverRecipient()` en `src/lib/email/delivery.ts` asigna `status='skipped'` cuando `RESEND_API_KEY` no está configurada, pero el retry cron solo procesa `WHERE status='failed'`. Resultado: cada vez que staging o prod carece de la API key durante el procesamiento del outbox, los emails desaparecen para siempre. Los emails con `status='rate_limited'` tampoco son reintentados.

2. **Schema sin migraciones formales (ISSUE-023)**: `email_deliveries` y `email_subscriptions` existen en producción porque fueron creadas por runtime DDL (código ya eliminado). No hay `CREATE TABLE` en `migrations/`. La migración `20260406121946534_email-enterprise-hardening.sql` hace `ALTER TABLE` asumiendo que las tablas existen. Recrear la DB desde migraciones falla.

3. **Sin garantías enterprise**: rate limits planos (password_reset bloqueado por payroll_export), envíos secuenciales en loop (80 recipients = ~16s en Vercel serverless), sin `List-Unsubscribe` header, sin alertas de bounce/complaint rate, sin retención de datos.

## Goal

- Cero pérdida permanente de emails: cualquier fallo retryable produce `status='failed'` y es procesado por el cron
- Schema `greenhouse_notifications` completamente versionado en `migrations/`
- Priority queue: emails `critical`/`transactional` bypass rate limits; `broadcast` los respeta
- Throughput: Resend Batch API para envíos multi-recipient (≤ tiempo de Vercel)
- Deliverability: `List-Unsubscribe` header, bounce/complaint rate monitoring con auto-alert
- Compliance: retención de datos (purge `delivery_payload` > 90 días), GDPR deletion endpoint
- Operaciones: kill switch por tipo de email vía DB config, Sentry capture en fallos

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` — node-pg-migrate, Kysely, ownership model
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` §4.9 y §5 — ops-worker Cloud Run
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — outbox events para delivery tracking
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md` — Secret Manager, datos sensibles
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — patrón outbox → projection

Reglas obligatorias:

- Migraciones con `pnpm migrate:create` — nunca crear archivos SQL manualmente ni renombrar timestamps
- Migraciones deben ser idempotentes (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`)
- Nueva migración debe tener timestamp **anterior** a `20260406121946534_email-enterprise-hardening.sql` para que el orden de aplicación sea correcto (`CREATE TABLE` antes que `ALTER TABLE`)
- Secretos via Secret Manager + `*_SECRET_REF`, nunca hardcoded — `RESEND_API_KEY` debe existir en todos los entornos
- `delivery_payload` contiene datos personales (nombres, montos de nómina) — aplicar retención y minimización
- Módulos nuevos usan Kysely (`getDb()`) — módulos existentes que usan `runGreenhousePostgresQuery` pueden mantenerse, no refactorizar innecesariamente

## Normative Docs

- `docs/issues/open/ISSUE-020-duplicate-email-retry-endpoints.md` — verificar estado real y cerrar
- `docs/issues/open/ISSUE-023-email-tables-no-formal-migration.md` — resolver con migración formal
- `docs/architecture/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md` — GDPR, retención

## Dependencies & Impact

### Depends on

- `greenhouse_notifications` schema (ya existe en prod — creado via runtime DDL histórico)
- `greenhouse_core.client_users` — columna `email_undeliverable` (ya existe, añadida en `20260406121946534`)
- `greenhouse_core.clients` — `client_name` (ya existe)
- Resend API key válida en todos los entornos — **prerequisito operacional para Slice 3**
- Cloud Run ops-worker service (para Slice 11) — `services/ops-worker/` ya existe

### Blocks / Impacts

- **TASK-001** (Payroll Hardening): `payroll_export` y `payroll_receipt` son email types afectados por priority queue y Batch API
- **TASK-006** (Webhook Infrastructure): el webhook `/api/webhooks/resend` es parte de la infra de webhooks canónica
- `TASK-012` (Outbox Event Expansion): los nuevos outbox events (`emailDeliveryDead`, alertas de bounce) deben añadirse al event catalog
- cualquier task que toque `src/lib/email/` debe coordinarse con esta

### Files owned

- `src/lib/email/delivery.ts`
- `src/lib/email/rate-limit.ts`
- `src/lib/email/types.ts`
- `src/lib/email/subscriptions.ts`
- `src/lib/email/context-resolver.ts`
- `src/lib/email/unsubscribe.ts`
- `src/app/api/cron/email-delivery-retry/route.ts`
- `src/app/api/cron/email-deliverability-monitor/route.ts` (nuevo)
- `src/app/api/cron/email-data-retention/route.ts` (nuevo)
- `src/app/api/webhooks/resend/route.ts`
- `src/app/api/admin/ops/email-delivery-retry/route.ts`
- `src/app/api/admin/email-deliveries/route.ts`
- `src/app/api/admin/email-deliveries/[deliveryId]/retry/route.ts`
- `src/app/api/admin/email-gdpr-deletion/route.ts` (nuevo)
- `migrations/<timestamp>_email-notifications-schema-foundation.sql` (nuevo — timestamp anterior a 20260406)
- `migrations/<timestamp>_email-priority-and-dead-letter.sql` (nuevo)
- `migrations/<timestamp>_email-config-kill-switch.sql` (nuevo)
- `docs/issues/open/ISSUE-020-duplicate-email-retry-endpoints.md`
- `docs/issues/open/ISSUE-023-email-tables-no-formal-migration.md`
- `vercel.json` (nuevos crons)

## Current Repo State

### Already exists

- `src/lib/resend.ts` — cliente Resend con `isResendConfigured()`, `getResendClient()`
- `src/lib/email/delivery.ts` — `sendEmail()`, `processFailedEmailDeliveries()`, `retryFailedDelivery()`, `wasEmailAlreadySent()`
- `src/lib/email/rate-limit.ts` — `checkRecipientRateLimit()` (10/hora hardcoded, sin priority)
- `src/lib/email/context-resolver.ts` — hydrata recipient + client data; maneja `EmailUndeliverableError`
- `src/lib/email/subscriptions.ts` — `getSubscribers()`, `addSubscriber()`, `removeSubscriber()`
- `src/lib/email/unsubscribe.ts` — tokens JWT 30 días
- `src/lib/email/templates.ts` — registry de 11 templates con `registerTemplate()` + `registerPreviewMeta()`
- `src/lib/email/types.ts` — `EmailType`, `EmailDomain`, `EmailDeliveryStatus`, `SendEmailInput`, `SendEmailResult`
- `src/emails/` — 11 templates React Email (InvitationEmail, PasswordResetEmail, VerifyEmail, PayrollExportReadyEmail, PayrollReceiptEmail, NotificationEmail, LeaveRequest*, LeaveReview*)
- `src/app/api/cron/email-delivery-retry/route.ts` — cron cada 5min, `maxDuration=60`, usa `requireCronAuth`
- `src/app/api/webhooks/resend/route.ts` — maneja `email.bounced`, `email.complained`, `email.delivered`; ignora `email.opened`, `email.clicked`
- `src/app/api/admin/ops/email-delivery-retry/route.ts` — tiene try-catch, usa `requireAdminTenantContext`
- `src/app/api/admin/email-deliveries/route.ts` — listing con KPIs (`sentToday`, `failedToday`, `pendingRetry`, `deliveryRate`)
- `src/app/api/admin/email-deliveries/[deliveryId]/retry/route.ts`
- `migrations/20260406121946534_email-enterprise-hardening.sql` — `ALTER TABLE` + `ADD CONSTRAINT` + grants (asume tablas existentes)
- `greenhouse_notifications.email_deliveries` — 59 filas en prod (12 `sent` con resendId real, 13 `skipped` hoy por RESEND_API_KEY faltante)
- `greenhouse_notifications.email_subscriptions`
- `ISSUE-020`, `ISSUE-023` en `docs/issues/open/`

### Gap

- **Bug crítico**: `status='skipped'` para `RESEND_API_KEY missing` → no retryable; debería ser `status='failed'` con `error_class='config_error'`
- **Bug crítico**: `status='rate_limited'` en DB nunca entra al retry cron (`WHERE status='failed'`)
- **Schema roto**: no existe `CREATE TABLE` migration para `email_deliveries` ni `email_subscriptions`; DB es irreconstruible desde migraciones
- **RESEND_API_KEY** ausente en Vercel staging → causa los bugs anteriores en producción
- **13 emails perdidos el 2026-04-13** requieren recovery manual
- Sin `priority` en `SendEmailInput` → `password_reset` puede quedar bloqueado por rate limit de `payroll_export`
- Envío multi-recipient es loop secuencial → bottleneck para payroll_export a > 50 destinatarios
- Sin `List-Unsubscribe` header en emails broadcast → riesgo de compliance Gmail
- Sin alertas automáticas de bounce rate > 2% o complaint rate > 0.1%
- Sin dead letter: emails en `attempt_number=3` mueren silenciosamente
- `delivery_payload` retiene datos sensibles indefinidamente (nombres, montos de nómina)
- Sin GDPR deletion endpoint
- Sin kill switch por tipo de email

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (rellenar al tomar la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Zero-loss delivery: fix skipped + rate_limited

Objetivo: ningún email con causa retryable se pierde permanentemente.

- En `src/lib/email/delivery.ts`, en `deliverRecipient()`:
  - Cambiar `status: 'skipped'` por `status: 'failed'` + `errorMessage: 'RESEND_API_KEY is not configured.'` cuando `!isResendConfigured()`
  - La única causa legítima de `status='skipped'` es `EmailUndeliverableError` (hard bounce) y `No email recipients resolved`
- En `src/app/api/cron/email-delivery-retry/route.ts`, en `processFailedEmailDeliveries()`:
  - Ampliar query para incluir `status IN ('failed', 'rate_limited')` con backoff: `rate_limited` solo se reintenta si `updated_at < NOW() - INTERVAL '1 hour'`
  - Ajustar `claimFailedDelivery()` para manejar ambos estados
- Verificar en dev que los 13 emails del 2026-04-13 (actualmente `skipped`) no serán automáticamente reintentados — son históricos; el fix aplica a eventos futuros
- `pnpm migrate:create email-error-class` → añadir columna opcional `error_class TEXT` a `email_deliveries` para distinguir la causa del fallo (valores: `config_error`, `rate_limited`, `template_error`, `resend_api_error`, `undeliverable`)

### Slice 2 — Migración formal CREATE TABLE (cierra ISSUE-023)

Objetivo: `migrations/` es la única fuente de verdad del schema `greenhouse_notifications`.

- `pnpm migrate:create email-notifications-schema-foundation` → crear migración con:
  - `CREATE SCHEMA IF NOT EXISTS greenhouse_notifications`
  - `CREATE TABLE IF NOT EXISTS greenhouse_notifications.email_deliveries (...)` con todas las columnas actuales según estado real de la tabla en prod
  - `CREATE TABLE IF NOT EXISTS greenhouse_notifications.email_subscriptions (...)` con todas las columnas actuales
  - Todos los índices actuales: `idx_email_deliveries_recipient_recent` (ya en hardening migration — usar `CREATE INDEX IF NOT EXISTS`)
  - Grants a `greenhouse_runtime`: `SELECT, INSERT, UPDATE, DELETE` en ambas tablas
  - Constraint `email_deliveries_status_check` con todos los valores actuales (`pending`, `sent`, `failed`, `skipped`, `rate_limited`, `delivered`)
  - Down migration: `DROP TABLE IF EXISTS`, `DROP SCHEMA IF EXISTS`
- **Timestamp crítico**: el archivo generado por `pnpm migrate:create` tendrá timestamp de hoy (2026-04-13). Este timestamp es **posterior** a `20260406121946534`. La migración de hardening ya aplicó en prod y modificó tablas existentes. Para que la nueva migración de foundation sea idempotente sin errores en prod (donde las tablas ya existen), usar `IF NOT EXISTS` en todo. El orden lógico en el repo quedará invertido (foundation tiene timestamp más nuevo que hardening), lo cual es técnicamente inconsistente. **Opción A (recomendada)**: documentar en el header de la migración que aplica `IF NOT EXISTS` porque la tabla ya fue creada históricamente via runtime DDL antes de que existiera esta migración formal; en una DB limpia el `CREATE TABLE` crea las tablas y la migración de hardening las modifica en orden correcto. En prod las tablas ya existen y los `IF NOT EXISTS` son no-ops. **Opción B**: crear la migración con timestamp artificial anterior — NO usar esta opción porque viola la regla de no renombrar timestamps manualmente.
- Mover `ISSUE-023` de `open/` a `resolved/` con fecha de cierre y migración que lo resuelve

### Slice 3 — Config: RESEND_API_KEY en staging + recovery de emails perdidos

Objetivo: staging nunca vuelve a procesar emails sin API key.

- Configurar `RESEND_API_KEY` en Vercel staging (`greenhouse-eo`, Custom Environment `staging`):
  - **Opción A**: Resend test key (todos los emails aparecen en Resend dashboard test mode, no se entregan a destinatarios reales) — recomendada para staging
  - **Opción B**: misma key que producción — no recomendada (contamina métricas de entrega)
- Añadir `RESEND_WEBHOOK_SIGNING_SECRET` a Vercel staging (actualmente ausente en `.env.local` local también)
- Recovery manual de los 13 emails perdidos del 2026-04-13:
  - Identificar los 13 registros: `SELECT * FROM greenhouse_notifications.email_deliveries WHERE status = 'skipped' AND error_message = 'RESEND_API_KEY is not configured.' AND created_at::date = '2026-04-13'`
  - Los emails son HR: `leave_review_confirmation`, `leave_request_decision`, `leave_request_pending_review`, `notification` (payroll_ready) — evaluar si re-disparar eventos outbox originales o llamar `retryFailedDelivery()` directamente para cada `delivery_id` después de que Slice 1 esté deployado
  - Marcar como `status='failed'` en DB para que el retry cron los procese automáticamente tras el deploy de Slice 1 (si la causa original fue config-missing y ahora la key está disponible)
- Verificar: `pnpm staging:request /api/cron/email-delivery-retry` devuelve `{sent: N}` con N > 0 después del fix

### Slice 4 — Auditoría y cierre ISSUE-020

Objetivo: un solo endpoint admin de retry batch, con error handling.

- Buscar todos los archivos que coincidan con los 3 endpoints mencionados en ISSUE-020:
  - `/api/admin/operations/email-delivery-retry/route.ts` — verificar si existe, eliminar si existe
  - `/api/admin/ops/email-delivery/retry-failed/route.ts` — verificar si existe, eliminar si existe
  - `/api/admin/ops/email-delivery-retry/route.ts` — este ya existe con try-catch (mantener)
- Buscar en `AdminOpsHealthView` (o equivalente) referencias a los endpoints eliminados y actualizar a `/api/admin/ops/email-delivery-retry`
- Mover `ISSUE-020` de `open/` a `resolved/` con hallazgo: el endpoint canónico ya tiene error handling; verificar si los duplicados llegaron a existir en código o solo en la documentación del issue

### Slice 5 — Priority queue

Objetivo: `password_reset` nunca es bloqueado por rate limit de `payroll_export`.

- En `src/lib/email/types.ts`:
  - Añadir `EmailPriority = 'critical' | 'transactional' | 'broadcast'`
  - Añadir campo opcional `priority?: EmailPriority` a `SendEmailInput` (default: `'broadcast'`)
  - Mapping canónico: `password_reset`, `verify_email` → `critical`; `invitation`, `leave_request_*`, `leave_review_*` → `transactional`; `notification`, `payroll_export`, `payroll_receipt` → `broadcast`
- En `src/lib/email/rate-limit.ts`:
  - `checkRecipientRateLimit()` recibe `priority` como parámetro
  - Si `priority === 'critical'` o `priority === 'transactional'` → return `{ allowed: true, currentCount: 0 }` sin consultar DB
  - Solo `broadcast` consulta y respeta el límite de 10/hora
- En `src/lib/email/delivery.ts`:
  - Pasar `priority` desde `SendEmailInput` a `deliverRecipient()` y luego a `checkRecipientRateLimit()`
  - Actualizar todos los `sendEmail()` calls en API routes para pasar `priority` correcto según el tipo
- Migración: añadir columna `priority TEXT` a `email_deliveries` para auditoría (valor derivado del tipo, guardado en el registro de entrega)

### Slice 6 — Resend Batch API para broadcast

Objetivo: `payroll_export` a 80 destinatarios tarda < 5s en lugar de ~16s.

- En `src/lib/email/delivery.ts`, crear `sendEmailBatch()` para emails `broadcast` con múltiples recipients:
  - Renderizar cada email individualmente (contexto varía por recipient)
  - Agrupar las llamadas en un solo `resend.emails.batch([...])` call (máximo 100 por batch según Resend docs)
  - Para batches > 100 recipients: dividir en chunks y hacer múltiples batch calls
  - Persistir todos los delivery records individualmente (misma lógica que el loop actual)
- `sendEmail()` con `priority !== 'broadcast'` mantiene el loop secuencial (correcto para transaccionales)
- `sendEmail()` con `priority === 'broadcast'` y `recipients.length > 1` usa el nuevo batch path
- Añadir `pnpm staging:request POST /api/admin/emails/preview` como smoke test de batch

### Slice 7 — Deliverability: List-Unsubscribe + webhook engagement

Objetivo: cumplimiento Gmail bulk sender requirements + tracking de engagement.

- En `src/lib/email/delivery.ts`, en `deliverRecipient()`, para emails `broadcast`:
  - Añadir header `List-Unsubscribe: <{unsubscribeUrl}>` al objeto enviado a Resend via `headers` param
  - Añadir header `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (RFC 8058, requerido por Gmail)
  - `unsubscribeUrl` ya se genera via `generateUnsubscribeUrl()` — reutilizar
- En `src/app/api/webhooks/resend/route.ts`:
  - Añadir case `email.opened`: insertar en tabla `greenhouse_notifications.email_engagement` (nueva) con `resend_id`, `event_type='opened'`, `created_at`
  - Añadir case `email.clicked`: similar con `event_type='clicked'`, `link_url` (del payload de Resend)
  - Si no se quiere tabla nueva: alternativa es publicar outbox event y no persistir directamente
- Migración: `CREATE TABLE IF NOT EXISTS greenhouse_notifications.email_engagement (engagement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(), resend_id TEXT NOT NULL, delivery_id UUID REFERENCES email_deliveries(delivery_id), event_type TEXT NOT NULL, link_url TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`

### Slice 8 — Dead letter + bounce/complaint monitoring

Objetivo: cero fallos silenciosos; alertas automáticas antes de que Gmail/Yahoo penalice el dominio.

- **Dead letter**: en `processFailedEmailDeliveries()`:
  - Emails con `attempt_number >= 3` y `status = 'failed'` que no entran al retry → marcados como `status='dead_letter'` en DB (nuevo status en el CHECK constraint)
  - Al marcar `dead_letter`, publicar outbox event `emailDeliveryDead` (definir en `event-catalog.ts`)
  - Añadir `dead_letter` al CHECK constraint de `email_deliveries_status_check` via migración
- **Bounce/complaint monitoring cron**: nuevo endpoint `src/app/api/cron/email-deliverability-monitor/route.ts`:
  - Cron schedule: `0 */6 * * *` (cada 6 horas) en `vercel.json`
  - Calcula: `bounce_rate = hard_bounces_7d / total_sent_7d` y `complaint_rate = complaints_7d / total_sent_7d`
  - Si `bounce_rate > 0.02` (2%) → publicar outbox event `emailDeliverabilityAlert` con `alertType='bounce_rate'`
  - Si `complaint_rate > 0.001` (0.1%) → publicar outbox event `emailDeliverabilityAlert` con `alertType='complaint_rate'`
  - Los outbox events son consumidos por el NotificationService existente para dispatch de alerta interna

### Slice 9 — Data retention

Objetivo: `delivery_payload` no retiene datos personales más de 90 días (GDPR mínimo viable).

- Nuevo endpoint `src/app/api/cron/email-data-retention/route.ts`:
  - Cron schedule: `0 3 * * 0` (domingos 3am, timezone Santiago) en `vercel.json`
  - Anonymize (no delete) registros con `created_at < NOW() - INTERVAL '90 days'`:
    ```sql
    UPDATE greenhouse_notifications.email_deliveries
    SET delivery_payload = '{"redacted": true}'::jsonb,
        recipient_name = '[redacted]',
        updated_at = NOW()
    WHERE created_at < NOW() - INTERVAL '90 days'
      AND delivery_payload != '{"redacted": true}'::jsonb
    ```
  - Mantener `recipient_email`, `status`, `email_type`, `resend_id` para métricas históricas
  - Loguear cuántos registros se anonymizaron
- Añadir `data_redacted_at TIMESTAMPTZ` a `email_deliveries` para auditoría

### Slice 10 — GDPR deletion endpoint

Objetivo: eliminar datos de un recipient específico de los delivery records por solicitud.

- Nuevo endpoint `POST /api/admin/email-gdpr-deletion` en `src/app/api/admin/email-gdpr-deletion/route.ts`:
  - Auth: `requireAdminTenantContext()` (solo admins)
  - Body: `{ recipientEmail: string, reason: string }`
  - Anonymize todos los registros del recipient: `recipient_email → '[gdpr-deleted]'`, `recipient_name → '[gdpr-deleted]'`, `delivery_payload → '{"gdpr_deleted": true}'::jsonb`
  - También hacer `UPDATE greenhouse_notifications.email_subscriptions SET active = FALSE WHERE recipient_email = $1`
  - Publicar outbox event `emailGdprDeletionCompleted` con metadata (sin el email)
  - Devolver `{ deleted: N, subscriptionsRevoked: M }`

### Slice 11 — Move batch sends a Cloud Run ops-worker

Objetivo: payroll_export a > 50 recipients no está limitado por el `maxDuration=60` de Vercel.

- Añadir endpoint `POST /batch-email-send` a `services/ops-worker/`:
  - Recibe `{ emailType, domain, recipients[], context, attachments?, sourceEventId?, sourceEntity? }`
  - Llama `sendEmailBatch()` (implementado en Slice 6) — requiere importar `src/lib/email/delivery.ts` o extraer la lógica al shared bundle del worker
  - Auth: `Authorization: Bearer $OPS_WORKER_SECRET` (shared secret entre Vercel y Cloud Run)
- En `sendEmail()` de `delivery.ts`, añadir lógica de routing:
  - Si `priority === 'broadcast'` y `recipients.length > 50` → delegar a ops-worker via HTTP call
  - Si ops-worker no disponible o env no configurado → fallback al batch Resend directo (Slice 6)
- Documentar en `services/ops-worker/README.md` el nuevo endpoint
- Verificar build del worker: `bash services/ops-worker/deploy.sh --dry-run`

### Slice 12 — Observabilidad: Sentry + kill switch por tipo

Objetivo: fallos de delivery capturados en Sentry; tipos de email pausables sin deploy.

- **Sentry capture**: en `deliverRecipient()` catch block:
  - `Sentry.captureException(error, { extra: { emailType, recipientEmail, attempt: existingDeliveryId ? 'retry' : 'first' } })`
  - Solo si `@sentry/nextjs` está disponible (verificar que ya está configurado en el proyecto `[verificar]`)
- **Kill switch por tipo**: nueva tabla `greenhouse_notifications.email_type_config`:
  - `email_type TEXT PRIMARY KEY`, `enabled BOOLEAN NOT NULL DEFAULT TRUE`, `paused_reason TEXT`, `updated_at TIMESTAMPTZ DEFAULT NOW()`
  - En `sendEmail()`, antes de procesar recipients: `SELECT enabled FROM email_type_config WHERE email_type = $1` — si `enabled = false`, return `{ status: 'skipped', error: 'Email type paused: {paused_reason}' }`
  - Si no existe row para el tipo → default a `enabled = true` (no bloquear si la tabla está vacía)
  - Admin endpoint `PATCH /api/admin/email-type-config` para pausar/reanudar tipos
- Migración: `CREATE TABLE IF NOT EXISTS greenhouse_notifications.email_type_config (...)`

## Out of Scope

- Cambiar de proveedor de email (Resend es el proveedor canónico)
- Templates multilenguaje (los templates actuales están en español; i18n completo es deuda separada)
- Preference center UI completo (solo se mantiene el mecanismo de unsubscribe existente)
- Email marketing / campañas (fuera del alcance del sistema transaccional)
- `email.opened` / `email.clicked` expuestos en UI admin — solo tracking en DB (Slice 7)
- Migrar `runGreenhousePostgresQuery` a Kysely en archivos existentes — solo código nuevo usa Kysely
- Rediseñar el Admin Ops Health UI (solo correcciones funcionales en Slice 4)
- Eliminar o deprecar `email_subscriptions` — el mecanismo de suscripción broadcast se mantiene
- SPF/DKIM/DMARC validation — es configuración de dominio en Resend/DNS, no código (verificar manualmente con Resend dashboard)

## Detailed Spec

### Estado de la DB (2026-04-13)

```
greenhouse_notifications.email_deliveries — 59 filas
  - 12 status='sent' (resendId real, funciona)
  - 13 status='skipped' (error: RESEND_API_KEY missing, hoy — perdidos)
  - resto: ninguno con status='failed'

KPIs actuales vía /api/admin/email-deliveries:
  sentToday: 0, failedToday: 0, pendingRetry: 0, deliveryRate: 100
```

### Fix semántico de status (Slice 1)

**Antes** (en `delivery.ts` línea ~436-468):
```ts
// Cuando !isResendConfigured():
status: 'skipped',
errorMessage: 'RESEND_API_KEY is not configured.'
```

**Después**:
```ts
// Cuando !isResendConfigured():
status: 'failed',
errorMessage: 'RESEND_API_KEY is not configured.',
// Añadir error_class: 'config_error' si se implementa la columna
```

Solo `EmailUndeliverableError` y "No recipients resolved" deben quedar como `'skipped'`.

### Retry query ampliada (Slice 1)

**Antes**:
```sql
WHERE status = 'failed'
  AND attempt_number < 3
  AND created_at > NOW() - INTERVAL '24 hours'
```

**Después**:
```sql
WHERE (
  (status = 'failed' AND attempt_number < 3)
  OR
  (status = 'rate_limited' AND updated_at < NOW() - INTERVAL '1 hour' AND attempt_number < 3)
)
AND created_at > NOW() - INTERVAL '24 hours'
```

### Priority mapping canónico (Slice 5)

```ts
const EMAIL_PRIORITY_MAP: Record<EmailType, EmailPriority> = {
  password_reset:               'critical',
  verify_email:                 'critical',
  invitation:                   'transactional',
  leave_request_decision:       'transactional',
  leave_request_submitted:      'transactional',
  leave_request_pending_review: 'transactional',
  leave_review_confirmation:    'transactional',
  notification:                 'broadcast',
  payroll_export:               'broadcast',
  payroll_receipt:              'broadcast',
}
```

### List-Unsubscribe header (Slice 7)

```ts
// En resend.emails.send():
headers: {
  'List-Unsubscribe': `<${unsubscribeUrl}>`,
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
}
```

Solo cuando `BROADCAST_EMAIL_TYPES.includes(input.emailType)` y `unsubscribeUrl` está disponible.

### Dead letter threshold (Slice 8)

El threshold de `attempt_number < 3` ya existe. El cambio es: después del tercer intento fallido, en lugar de dejar el registro como `status='failed'` inatendible, actualizarlo a `status='dead_letter'` y publicar un outbox event. El outbox event debe estar en el event catalog.

### Recovery de 13 emails perdidos (Slice 3)

Después de que Slice 1 esté deployado y `RESEND_API_KEY` esté en Vercel staging:

```sql
-- Marcar como failed para que el retry cron los procese
UPDATE greenhouse_notifications.email_deliveries
SET status = 'failed',
    error_message = 'RESEND_API_KEY is not configured. [Reclassified for retry 2026-04-13]',
    attempt_number = 0,
    updated_at = NOW()
WHERE status = 'skipped'
  AND error_message = 'RESEND_API_KEY is not configured.'
  AND created_at::date = '2026-04-13';
```

Ejecutar `pnpm pg:connect:shell` para acceso directo o vía `pnpm staging:request`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

### Fase 1 — Zero-loss + Schema

- [ ] Un email `password_reset` procesado cuando `RESEND_API_KEY` no está configurada produce `status='failed'` (no `'skipped'`) en `email_deliveries`
- [ ] El retry cron procesa registros con `status='rate_limited'` si `updated_at < NOW() - 1 hour`
- [ ] `pnpm migrate:status` muestra la nueva migración de foundation como aplicada y no hay errores en `migrate:up` desde cero (test en DB limpia `[verificar con DB de test si existe]`)
- [ ] Los 13 emails del 2026-04-13 fueron reintentados y tienen `status='sent'` o `status='failed'` con nuevo `resend_id` (no `'skipped'`)
- [ ] `RESEND_WEBHOOK_SIGNING_SECRET` está presente en Vercel staging
- [ ] ISSUE-023 movido a `docs/issues/resolved/` con fecha de cierre
- [ ] ISSUE-020 movido a `docs/issues/resolved/` con hallazgo documentado

### Fase 2 — Hardening

- [ ] Un email `password_reset` enviado a un usuario que ya recibió 10 emails broadcast en la última hora es entregado exitosamente (no bloqueado por rate limit)
- [ ] Un `payroll_export` a 5 recipients produce 1 batch call a Resend (no 5 llamadas individuales) — verificable en Resend dashboard
- [ ] Emails broadcast incluyen header `List-Unsubscribe` con URL válida
- [ ] El webhook procesa `email.opened` sin errores (verificar con Resend test event)
- [ ] El monitoring cron corre sin errores: `pnpm staging:request /api/cron/email-deliverability-monitor`
- [ ] Un email con `attempt_number=3` y `status='failed'` es marcado `status='dead_letter'` en el próximo ciclo de retry

### Fase 3 — Compliance y escala

- [ ] El cron de retención anonymiza registros con `created_at < NOW() - 90 days` (verificable en DB test)
- [ ] `POST /api/admin/email-gdpr-deletion` con email válido anonymiza todos sus registros y revoca subscripciones
- [ ] `payroll_export` a 51 recipients delega a ops-worker (verificable en Cloud Run logs)
- [ ] Un tipo pausado via kill switch devuelve `status='skipped'` con razón de pausa (no intenta entrega)
- [ ] `pnpm lint && npx tsc --noEmit && pnpm test` pasan sin errores nuevos

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test` (tests existentes en `src/lib/email/delivery.test.ts`, `templates.test.ts`, `src/emails/*.test.tsx`)
- `pnpm migrate:status` — verificar migración de foundation aplicada
- `pnpm staging:request /api/cron/email-delivery-retry` — verificar que cron corre y retorna JSON correcto
- `pnpm staging:request /api/cron/email-deliverability-monitor` — verificar que corre sin errores
- Resend dashboard — verificar que emails broadcast incluyen `List-Unsubscribe` header
- `pnpm pg:doctor` — verificar health de DB tras migraciones

## Closing Protocol

- [ ] Mover `ISSUE-023` a `docs/issues/resolved/` con fecha 2026-04-13 y referencia a migración
- [ ] Mover `ISSUE-020` a `docs/issues/resolved/` con hallazgo: endpoints duplicados ya eliminados o nunca llegaron a existir en código actual
- [ ] Actualizar `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` con nuevos eventos: `emailDeliveryDead`, `emailDeliverabilityAlert`, `emailGdprDeletionCompleted`
- [ ] Regenerar tipos Kysely: `pnpm db:generate-types` después de cada migración
- [ ] Verificar que `services/ops-worker/` buildea correctamente si Slice 11 fue implementado: `bash services/ops-worker/deploy.sh --dry-run`
- [ ] Deploy a staging y verificar delivery rate > 0 en KPIs de `/api/admin/email-deliveries`
- [ ] Confirmar con `jreyes@efeoncepro.com` que los 13 emails de recovery fueron recibidos (Slice 3)

## Follow-ups

- **Dominio**: verificar configuración SPF/DKIM/DMARC para `efeoncepro.com` en Resend dashboard — es configuración DNS, no código
- **i18n**: los templates están en español; si Greenhouse escala a clientes en otros idiomas, los templates necesitan versiones `es`/`en` (tarea separada)
- **Preference center**: hoy el unsubscribe es todo-o-nada por tipo; un preference center visual (`/account/notifications`) es UX deuda
- **Admin UI para email_type_config**: el kill switch se gestiona vía API en Slice 12; una UI en Admin > Ops Health es follow-up UX
- **`TASK-012`** (Outbox Event Expansion): los nuevos eventos de Slice 8 y 10 deben formalizarse en el catalog

## Open Questions

- **Slice 2 — Timestamp de migración**: se decidió usar `pnpm migrate:create` que genera timestamp de hoy. Esto invierte el orden lógico respecto a la hardening migration del 2026-04-06. La migración usa `IF NOT EXISTS` para ser idempotente. ¿Aceptar esta inconsistencia de timestamp o existe una forma de forzar un timestamp anterior sin violar las reglas de node-pg-migrate?
- **Slice 3 — Recovery de emails**: ¿reenviar los 13 emails HR perdidos del 2026-04-13 es apropiado dado que algunos son notificaciones de aprobación de licencias ya procesadas? El destinatario podría recibir una notificación tardía. Confirmar con jreyes antes de ejecutar el recovery.
- **Slice 11 — OPS_WORKER_SECRET**: ¿existe ya un shared secret para autenticar requests de Vercel → Cloud Run ops-worker, o hay que provisionar uno nuevo en Secret Manager?
- **Sentry (Slice 12)**: ¿`@sentry/nextjs` ya está configurado en el proyecto? No fue visible en el audit. Si no está, Slice 12 puede diferirse o simplificarse a logging estructurado con `console.error`.
