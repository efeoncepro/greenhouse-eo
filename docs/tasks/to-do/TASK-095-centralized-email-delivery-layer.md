# TASK-095 - Centralized Email Delivery Layer

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Alto` |
| Status real | `Diseño completo` |
| Rank | `10` |
| Domain | `platform` |
| GitHub Project | `Greenhouse Delivery` |

## Summary

Centralizar todas las solicitudes de email de Greenhouse en una capa de delivery unificada que use Resend como provider de salida, pero que exponga un contrato propio para request, template resolution, attachments, retries, observability y routing por tipo de notificacion. La meta es que Payroll, Finance, Delivery, Permissions y flujos de sistema dejen de enviar mails por caminos ad hoc.

## Why This Task Exists

Hoy los emails del repo viven repartidos entre 6 callers directos de Resend con 3 sistemas de logging distintos:

| Caller | Tipo | Logging | Template |
|--------|------|---------|----------|
| `forgot-password/route.ts` | password_reset | BigQuery `email_log` | React Email |
| `admin/invite/route.ts` | invitation | BigQuery `email_log` | React Email |
| `payroll-export-packages.ts` | payroll_export | PG `payroll_export_packages` | React Email |
| `generate-payroll-receipts.ts` | payroll_receipt | PG `payroll_receipts` | React Email |
| `notification-service.ts` | category-based | PG `notification_log` | **Plain text** |
| `welcome.ts` | system_event | PG `notification_log` | **Plain text** |

Problemas concretos:
- **Logging fragmentado**: 3 destinos (BQ `email_log`, PG `payroll_*`, PG `notification_log`), sin audit trail unificado
- **Sin retries**: ningun caller tiene retry/backoff; si Resend falla, se pierde
- **NotificationService envia plain text**: no usa React Email, inconsistente con el design system
- **Recipients hardcoded**: payroll export tiene 3 emails fijos en codigo
- **Sin bounce tracking**: se guarda `resend_id` pero nunca se consulta status post-send
- **Cada caller resuelve from/to/subject/attachments** por su cuenta

## Goal

- Definir una capa canonica de delivery de emails para Greenhouse.
- Usar Resend solo como provider de salida, no como contrato de negocio.
- Centralizar reglas comunes de envio, retries, metadata y observabilidad.
- Permitir que el sistema de notificaciones y los modulos de negocio consuman una API estable de mail delivery.
- Reducir el drift entre flows de Payroll, Finance, Delivery, Permissions y Auth.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` — seccion 15, contrato de email de cierre
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`

Reglas obligatorias:

- Resend es el canal de salida, no la API de negocio
- el delivery de email debe poder ser invocado por modulos distintos sin duplicar logica
- la notificacion in-app y el email deben compartir, cuando aplique, un mismo contrato de evento o payload de negocio
- los attachments se resuelven en el dominio caller; la capa de delivery los recibe como `Buffer + metadata`
- los emails de sistema no deben depender de gestos de UI para enviarse

## Dependencies & Impact

### Depends on (ya cumplidas)

- `TASK-077` (complete) — receipts y delivery downstream como precedente operativo de adjuntos y batch delivery
- `TASK-094` (complete) — cierre de Payroll y notificacion downstream a Finance/HR como primer caso de uso canonico
- `TASK-097` (complete) — paquete documental persistido, patron de reenvio sin recerrar periodo
- `TASK-104` (complete) — email de cierre con desglose por regimen, `CurrencyBreakdown` exportado

### Impacts to

- `src/lib/resend.ts` — sigue siendo el singleton de Resend, la capa lo envuelve
- `src/emails/**` — templates existentes se registran en el registry
- `src/lib/notifications/notification-service.ts` — migra su `sendEmailNotification` a la capa
- `src/lib/payroll/payroll-export-packages.ts` — migra su envio directo a la capa
- `src/lib/payroll/generate-payroll-receipts.ts` — migra su envio directo a la capa
- `src/app/api/account/forgot-password/route.ts` — primer consumer migrado
- `src/app/api/admin/invite/route.ts` — primer consumer migrado
- `src/lib/email-log.ts` — deprecado, reemplazado por `email_deliveries`

### Impacta a tasks futuras

| Task | Impacto |
|------|---------|
| TASK-030 (HR Onboarding) | Usara la capa para welcome emails y reminders |
| TASK-039 (Data Node) | Usara la capa para executive digests |
| TASK-069 (Operational P&L) | Usara la capa para margin alerts |
| TASK-098 (Observability) | Complementa con Slack alerting para crons |

### Files owned

- `src/lib/email/delivery.ts` — servicio central de delivery
- `src/lib/email/templates.ts` — template registry
- `src/lib/email/subscriptions.ts` — recipient resolver por suscripcion
- `src/lib/email/types.ts` — tipos compartidos
- `scripts/migrations/add-email-delivery-tables.sql` — DDL
- `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md` — actualizar con contrato

## Current Repo State

### Ya existe

- Resend singleton en `src/lib/resend.ts` (lazy, env-gated)
- React Email design system: `EmailLayout`, `EmailButton`, `constants.ts` (Poppins/DM Sans, brand colors)
- 6 templates: `PasswordResetEmail`, `InvitationEmail`, `VerifyEmail`, `PayrollReceiptEmail`, `PayrollExportReadyEmail`, `PayrollReceiptEmail`
- `NotificationService` con preferences per-user/per-category y dispatch multi-canal
- Outbox reactivo con 13 proyecciones, dedup, retry, dead-letter, domain-partitioned crons
- Email catalog estrategico con 4 familias y roadmap P0/P1/P2

### Gap actual

- No existe capa unica y reusable para solicitar emails
- 3 sistemas de logging sin audit trail unificado
- `NotificationService` envia plain text (no React Email)
- Recipients hardcoded en payroll export
- 0 retries en cualquier caller
- `VerifyEmail` template sin caller (dead code)
- Sin unsubscribe headers ni bounce tracking

## Decisiones de diseno

### D1. Tabla unificada de delivery log

**Decision: Una sola tabla PG `greenhouse_notifications.email_deliveries`**

No adapter dual. Absorbe lo que hoy va a 3 destinos distintos. Las tablas de dominio (`payroll_export_packages`, `payroll_receipts`) conservan su metadata propia; la delivery layer registra ademas el envio en la tabla unificada.

```sql
CREATE TABLE greenhouse_notifications.email_deliveries (
  delivery_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type        TEXT NOT NULL,
  domain            TEXT NOT NULL,
  recipient_email   TEXT NOT NULL,
  recipient_user_id TEXT,
  subject           TEXT NOT NULL,
  resend_id         TEXT,
  status            TEXT NOT NULL DEFAULT 'pending',
  has_attachments   BOOLEAN DEFAULT FALSE,
  source_event_id   TEXT,
  source_entity     TEXT,
  actor_email       TEXT,
  error_message     TEXT,
  attempt_number    INTEGER DEFAULT 1,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_deliveries_status ON greenhouse_notifications.email_deliveries (status);
CREATE INDEX idx_email_deliveries_type ON greenhouse_notifications.email_deliveries (email_type, created_at DESC);
CREATE INDEX idx_email_deliveries_recipient ON greenhouse_notifications.email_deliveries (recipient_email, created_at DESC);
```

Valores de `status`: `pending`, `sent`, `failed`, `bounced`, `delivered`.
Valores de `domain`: `identity`, `payroll`, `finance`, `hr`, `delivery`, `system`.

### D2. Retry strategy

**Decision: Reutilizar outbox pattern para envios reactivos + cron de retry para envios directos**

Dos caminos:
1. **Reactivo** (proyecciones): ya tiene retry built-in via `outbox_reactive_log` (max retries configurable por proyeccion)
2. **Directo** (auth, ad-hoc): nuevo cron `processFailedEmailDeliveries()` que lee `email_deliveries WHERE status='failed' AND attempt_number < 3 AND created_at > NOW() - INTERVAL '1 hour'`

No se introduce cola async ni inline backoff. El outbox pattern existente ya resuelve el problema.

### D3. Template registry

**Decision: `Map<EmailType, TemplateResolver>` centralizado**

```typescript
type TemplateResolver<TContext = unknown> = (context: TContext) => {
  subject: string
  react: JSX.Element
  text: string
  attachments?: EmailAttachment[]
}
```

Cada modulo registra su template resolver. La capa de delivery solo necesita `emailType + context` para resolver subject, HTML, plain text y attachments.

Esto permite que `NotificationService` deje de enviar plain text y pase a usar React Email para todos los emails.

### D4. Attachment resolver

**Decision: Cada dominio genera sus attachments; la capa recibe `Buffer + metadata`**

```typescript
interface EmailAttachment {
  filename: string
  content: Buffer
  contentType: string
}
```

La capa se encarga del encoding base64 para Resend. El dominio se encarga de generar el buffer. No se centraliza la generacion de attachments porque es 100% domain-specific.

### D5. Recipient resolver

**Decision: Hibrido — dos modos**

1. **Directo** (`recipients` en el request): forgot_password, invite, receipt — el caller pasa los emails
2. **Por suscripcion** (`emailType` lookup): payroll_export, DTE alerts, executive digests — la capa resuelve desde tabla

```sql
CREATE TABLE greenhouse_notifications.email_subscriptions (
  subscription_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type       TEXT NOT NULL,
  recipient_email  TEXT NOT NULL,
  recipient_name   TEXT,
  active           BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email_type, recipient_email)
);
```

Seed inicial: migrar los 3 recipients hardcoded de payroll_export.

### D6. Orden de migracion de consumers

| Orden | Consumer | Complejidad | Valor de validacion |
|-------|----------|-------------|---------------------|
| 1 | Auth (password_reset, invitation) | Baja | Prueba template registry + delivery log |
| 2 | NotificationService (plain text -> React Email) | Media | Prueba template resolver para notifications genericas |
| 3 | Payroll export + receipts | Alta | Prueba attachments + suscripciones + coexistencia |
| 4 | Finance (DTE alerts, invoice issued) | Media | Primer consumer nuevo sobre la capa |

## Scope

### Slice 1 — Delivery API canonica + tabla unificada

**Objetivo:** Un servicio `sendEmail()` que sea el unico punto de salida para emails de Greenhouse.

**Archivos nuevos:**
- `src/lib/email/types.ts` — tipos compartidos (`EmailType`, `EmailAttachment`, `SendEmailInput`, `SendEmailResult`)
- `src/lib/email/delivery.ts` — `sendEmail(input)`: resuelve template, resuelve recipients, llama Resend, registra en `email_deliveries`
- `scripts/migrations/add-email-delivery-tables.sql` — DDL para `email_deliveries` y `email_subscriptions`

**Contrato de `sendEmail`:**

```typescript
interface SendEmailInput {
  emailType: EmailType
  domain: EmailDomain
  // Modo directo
  recipients?: Array<{ email: string; name?: string; userId?: string }>
  // Modo suscripcion (si no hay recipients, resuelve desde email_subscriptions)
  // Contexto de negocio (pasado al template resolver)
  context: Record<string, unknown>
  // Attachments opcionales (ya generados por el dominio)
  attachments?: EmailAttachment[]
  // Metadata de trazabilidad
  sourceEventId?: string
  sourceEntity?: string
  actorEmail?: string
}

interface SendEmailResult {
  deliveryId: string
  resendId: string | null
  status: 'sent' | 'failed' | 'skipped'
  error?: string
}
```

**Criterios de aceptacion Slice 1:**
- [ ] `sendEmail()` existe y envía via Resend
- [ ] Cada envio se registra en `email_deliveries` con status, resend_id, metadata
- [ ] Si Resend no esta configurado, retorna `status: 'skipped'`
- [ ] Si falla, registra error y retorna `status: 'failed'`
- [ ] Tests unitarios con Resend mockeado
- [ ] Migration SQL lista para aplicar

### Slice 2 — Template registry + recipient resolver

**Objetivo:** Los callers dejan de resolver subject/html/text por su cuenta. Los recipients de tipo suscripcion se resuelven desde tabla.

**Archivos nuevos:**
- `src/lib/email/templates.ts` — `registerTemplate()`, `resolveTemplate()`, `EMAIL_TEMPLATES` map
- `src/lib/email/subscriptions.ts` — `getSubscribers(emailType)`, `addSubscriber()`, `removeSubscriber()`

**Registrar templates existentes:**

```typescript
// identity
registerTemplate('password_reset', (ctx: { resetUrl: string; userName?: string }) => ({
  subject: 'Restablece tu contraseña — Greenhouse',
  react: PasswordResetEmail({ resetUrl: ctx.resetUrl, userName: ctx.userName }),
  text: `Restablece tu contraseña: ${ctx.resetUrl}`
}))

registerTemplate('invitation', (ctx: { inviteUrl: string; inviterName: string; clientName: string; userName?: string }) => ({
  subject: 'Te invitaron a Greenhouse — Efeonce',
  react: InvitationEmail(ctx),
  text: `${ctx.inviterName} te invito a ${ctx.clientName}. Activa tu cuenta: ${ctx.inviteUrl}`
}))

// payroll
registerTemplate('payroll_export', (ctx: PayrollExportContext) => ({
  subject: `Nomina cerrada — ${ctx.periodLabel} · ${ctx.entryCount} colaboradores`,
  react: PayrollExportReadyEmail({ ... }),
  text: buildPayrollExportPlainText(ctx),
  attachments: ctx.attachments
}))

registerTemplate('payroll_receipt', (ctx: PayrollReceiptContext) => ({
  subject: buildReceiptSubject(ctx),
  react: PayrollReceiptEmail(ctx),
  text: buildReceiptPlainText(ctx),
  attachments: [{ filename: ctx.receiptFilename, content: ctx.pdfBuffer, contentType: 'application/pdf' }]
}))
```

**Seed de suscripciones:**

```sql
INSERT INTO greenhouse_notifications.email_subscriptions (email_type, recipient_email, recipient_name) VALUES
  ('payroll_export', 'finance@efeoncepro.com', 'Finanzas | Efeonce'),
  ('payroll_export', 'hhumberly@efeoncepro.com', 'Humberly Henriquez'),
  ('payroll_export', 'jreyes@efeoncepro.com', 'Julio Reyes');
```

**Criterios de aceptacion Slice 2:**
- [ ] `resolveTemplate(emailType, context)` retorna `{ subject, react, text, attachments? }`
- [ ] `getSubscribers('payroll_export')` retorna los 3 recipients actuales
- [ ] `sendEmail()` usa el template registry cuando el caller no pasa subject/react/text explicitamente
- [ ] `sendEmail()` resuelve recipients desde suscripciones cuando el caller no pasa `recipients`
- [ ] Tests unitarios del registry y del resolver

### Slice 3 — NotificationService synergy

**Objetivo:** `NotificationService.dispatch()` usa la delivery layer para el canal email en vez de Resend directo. Deja de enviar plain text.

**Cambios:**
- `notification-service.ts` > `sendEmailNotification()`: reemplazar llamada directa a Resend por `sendEmail()` con `emailType: 'notification'` y context del dispatch
- Registrar template `'notification'` que use React Email (nuevo `NotificationEmail.tsx` minimo)
- Los eventos reactivos que hoy disparan `NotificationService.dispatch()` (`service.created`, `identity.reconciliation.approved`, `finance.dte.discrepancy_found`, `identity.profile.linked`) automaticamente pasan a usar la capa

**Template nuevo: `NotificationEmail.tsx`**
- Reutiliza `EmailLayout` + `EmailButton`
- Props: `title`, `body`, `actionUrl?`, `actionLabel?`, `recipientName?`
- Reemplaza la concatenacion plain text actual

**Criterios de aceptacion Slice 3:**
- [ ] `NotificationService` ya no importa `getResendClient` directamente
- [ ] Emails de notificacion usan React Email template (no plain text)
- [ ] Los 4 eventos reactivos existentes siguen funcionando
- [ ] `email_deliveries` registra cada envio de notificacion
- [ ] Test de integracion: dispatch con canal email -> registra en `email_deliveries`

### Slice 4 — First consumer migrations (Auth + Payroll)

**Objetivo:** Migrar los callers directos de Resend a la capa central.

**Migracion 1: Auth (baja complejidad)**
- `forgot-password/route.ts`: reemplazar `resend.emails.send()` por `sendEmail({ emailType: 'password_reset', domain: 'identity', recipients: [{ email }], context: { resetUrl, userName } })`
- `admin/invite/route.ts`: idem con `emailType: 'invitation'`
- Deprecar `src/lib/email-log.ts` (BigQuery) — la capa registra en `email_deliveries`
- Mantener rate-limiting y anti-enumeration en la route, no en la capa

**Migracion 2: Payroll (alta complejidad)**
- `payroll-export-packages.ts` > `sendPayrollExportReadyNotification()`: reemplazar envio directo por `sendEmail({ emailType: 'payroll_export', domain: 'payroll', context: { periodLabel, breakdowns, ... }, attachments: [...] })`
- Eliminar `PAYROLL_EXPORT_READY_RECIPIENTS` hardcoded — la capa resuelve desde `email_subscriptions`
- `generate-payroll-receipts.ts` > `sendReceiptEmail()`: reemplazar por `sendEmail({ emailType: 'payroll_receipt', domain: 'payroll', recipients: [{ email: entry.memberEmail }], context: { ... }, attachments: [pdfBuffer] })`
- Las tablas de dominio (`payroll_export_packages`, `payroll_receipts`) siguen guardando su metadata propia; `email_deliveries` registra ademas el envio

**Criterios de aceptacion Slice 4:**
- [ ] Auth flows usan `sendEmail()` en vez de `resend.emails.send()`
- [ ] `src/lib/email-log.ts` marcado como deprecated
- [ ] Payroll export resuelve recipients desde `email_subscriptions`
- [ ] Payroll receipts usan `sendEmail()` con template resolver
- [ ] Todos los envios aparecen en `email_deliveries`
- [ ] Tests existentes de payroll-export-packages y PayrollExportReadyEmail siguen pasando
- [ ] `pnpm build` y `pnpm test` verdes

## Event flow: outbox -> email delivery

```
                        OUTBOX EVENTS
                             |
        +--------------------+--------------------+
        v                    v                     v
  payroll_period       finance.dte           service.created
    .exported         .discrepancy_found     identity.*.approved
        |                    |                     |
        v                    v                     v
 +--------------+   +--------------+    +------------------+
 | Projection:  |   | Projection:  |    | Projection:       |
 | export_ready |   | notification |    | notification      |
 | receipts     |   | _dispatch    |    | _dispatch         |
 +------+-------+   +------+-------+    +--------+---------+
        |                  |                      |
        v                  v                      v
 +-----------------------------------------------------+
 |           EMAIL DELIVERY LAYER (TASK-095)            |
 |                                                       |
 |  +-----------+  +-----------+  +------------------+  |
 |  | Template  |  | Recipient |  |  email_deliveries|  |
 |  | Registry  |  | Resolver  |  |  (PG table)      |  |
 |  +-----------+  +-----------+  +------------------+  |
 |                      |                                |
 |                 +----+----+                           |
 |                 v         v                           |
 |            Directo   Suscripcion                      |
 |          (per-user)  (por tipo)                       |
 |                                                       |
 |              +----------+                             |
 |              |  Resend  |  <- unico punto de salida   |
 |              +----------+                             |
 +-----------------------------------------------------+
        |
        v
 +--------------+
 | Retry Cron   |  <- reprocesa failed deliveries
 | (5 min)      |
 +--------------+
```

## Eventos que hoy deberian disparar email pero no lo hacen

| Evento | Hoy | Deberia |
|--------|-----|---------|
| `payroll_period.approved` | Nada | Notificar a Finance que la nomina esta lista para exportar |
| `finance.income_payment.recorded` | Nada | Notificar a Finance de pago recibido |
| `ai_wallet.exhausted` | Nada | Alertar al admin que el wallet se agoto |
| `member.created` | Welcome in-app | Welcome email con React Email template |
| `ico.materialization.completed` + threshold breach | Nada | Alerta de KPI critico |

Estos eventos ya se publican en el outbox. Solo falta registrar nuevas proyecciones que los consuman via la delivery layer.

## Consumers actuales y futuros por modulo

| Modulo | Emails actuales | Eventos que publica | Emails futuros (P0/P1) |
|--------|----------------|--------------------|-----------------------|
| Identity & Access | password_reset, invitation | `identity.*.approved/linked` | new_sso_linked, security_alerts |
| Finance | — | `finance.income/expense/dte.*` (10 eventos) | invoice_issued, payment_received, margin_alert |
| Payroll | payroll_export, payroll_receipt | `payroll_period.*`, `payroll_entry.*` (7 eventos) | payroll_period_approved |
| HR Core | — | `member.*`, `assignment.*` (5 eventos) | leave_request_*, welcome |
| ICO Engine | — | `ico.materialization.completed` | threshold_breach alerts |
| Delivery | — | (pendiente) | review_ready, creative_feedback |
| AI Tools | — | `ai_wallet.*` | wallet_low_balance, wallet_exhausted |
| Admin | invitation (via Identity) | `service.created` | provisioning alerts |
| Data Node (futuro) | — | (consumidor) | daily/weekly/monthly digests |

## Out of Scope

- Redisenar todo el sistema de notificaciones en una sola iteracion
- Reemplazar React Email como template engine
- Cambiar el provider transaccional fuera de Resend
- Migrar todos los emails del repo de una vez (solo auth + payroll en Slice 4)
- Agregar campanas o newsletters
- Resend webhooks para bounce tracking (candidato a TASK futura)
- Scheduled email sending / queue system (candidato a TASK futura con Data Node)

## Acceptance Criteria (global)

- [ ] Existe `sendEmail()` como unico punto de salida para emails de Greenhouse
- [ ] Template registry resuelve subject/html/text/attachments por emailType
- [ ] Recipient resolver soporta modo directo y modo suscripcion
- [ ] `email_deliveries` registra cada envio con status, resend_id, metadata, source_event_id
- [ ] `NotificationService` usa la capa para canal email (React Email, no plain text)
- [ ] Auth (password_reset, invitation) migrados a la capa
- [ ] Payroll (export, receipts) migrados a la capa
- [ ] Cron de retry reprocesa `failed` deliveries (max 3 intentos, ventana 1 hora)
- [ ] `email_subscriptions` contiene los recipients de payroll_export (no hardcoded)
- [ ] `pnpm build`, `pnpm test`, `pnpm lint` verdes

## Verification

- Tests unitarios de `sendEmail()`, template registry, recipient resolver
- Tests de integracion: auth flow -> registra en `email_deliveries`
- Tests de integracion: payroll export -> resuelve subscribers -> registra delivery
- Tests de NotificationService con email channel -> usa React Email
- Smoke en staging: cerrar payroll -> email llega con template correcto
- `pnpm build && pnpm test && pnpm lint`
