# TASK-269 — Email Delivery Enterprise Hardening: Context Resolver, i18n, Rate Limit, Bounce Handling

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `email`, `identity`, `platform`
- Blocked by: `none`
- Branch: `task/TASK-269-email-delivery-enterprise-hardening`
- Legacy ID: —
- GitHub Issue: —

## Summary

El modulo de email funciona pero tiene gaps estructurales que impiden escalar: cada caller resuelve datos del recipient manualmente (causando bugs como ISSUE-017), los templates estan hardcoded en español, no hay proteccion contra spam accidental, no hay unsubscribe, y no se procesan bounces de Resend. Esta task construye un email delivery layer enterprise-grade con context resolver automatico, catalogo de tokens canonicos, i18n por usuario, rate limiting, unsubscribe, y bounce/complaint webhook handler.

## Why This Task Exists

1. **Bug activo ISSUE-017**: `invite/route.ts` consulta `display_name` (inexistente) en vez de `client_name` porque el caller resuelve datos del cliente manualmente. Cada caller hace sus propios queries para obtener nombre, cliente, etc. — patron fragil y propenso a errores.
2. **Bug activo ISSUE-018**: usuarios invitados se crean con status `'pending'` en vez de `'invited'`, rompiendo KPIs y la futura TASK-267.
3. **Sin i18n**: templates hardcoded en español excepto payroll receipt. No hay `locale` en `client_users`.
4. **Sin proteccion anti-spam**: un loop accidental puede enviar 100 emails al mismo usuario en minutos.
5. **Sin bounce handling**: bounces y complaints de Resend no se procesan — riesgo de degradacion de sender reputation.
6. **Sin unsubscribe**: emails broadcast (payroll_export, notification) no tienen link de opt-out.
7. **Runtime DDL** (ISSUE-019): `ensureEmailSchema()` ejecuta CREATE TABLE en cada envio.
8. **Endpoints duplicados** (ISSUE-020): 3 endpoints admin de retry hacen lo mismo, 2 sin error handling.

## Goal

- El delivery layer resuelve automaticamente datos del recipient y su cliente sin que el caller haga queries manuales
- Los templates soportan español e ingles segun el `locale` del usuario
- Rate limiting por recipient previene spam accidental
- Link de unsubscribe en emails broadcast
- Webhook handler procesa bounces/complaints de Resend y protege sender reputation
- Los issues ISSUE-017 a ISSUE-023 quedan resueltos como efecto de la implementacion
- **Zero breaking changes**: todos los callers existentes (`sendEmail()`, `NotificationService.dispatch()`, projection `payroll_export_ready`, cron retry) siguen funcionando sin modificacion hasta que se migren explicitamente

## Non-Breaking Contract

Esta task modifica el core del delivery layer. Regla absoluta: **no romper nada que funcione hoy**.

1. **Backward compatibility de `sendEmail()`**: la firma actual debe seguir funcionando. Si un caller pasa `context.userName` o `context.clientName` manualmente, esos valores toman precedencia sobre el context resolver. El resolver solo rellena lo que el caller no paso.
2. **NotificationService**: `NotificationService.dispatch()` usa `sendEmail()` con `emailType: 'notification'` como canal de email. El context resolver debe funcionar transparentemente — NotificationService no debe requerir cambios para seguir funcionando.
3. **Outbox projections**: la projection `payroll_export_ready` dispara `sendPayrollExportReadyNotification()` que eventualmente llama a `sendEmail()`. Este flujo reactivo no debe romperse.
4. **Cron retry**: `processFailedEmailDeliveries()` re-resuelve templates desde `delivery_payload`. El context resolver no debe interferir con la rehidratacion de payloads historicos.
5. **Tests existentes**: `PayrollReceiptEmail.test.tsx` y `PayrollExportReadyEmail.test.tsx` deben seguir pasando sin modificacion.
6. **Migracion aditiva**: nuevas columnas (`locale`, `email_undeliverable`) son nullable o con defaults. No requieren backfill para que el sistema funcione.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` — email delivery via Resend
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — modelo de usuarios y tenants
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` — migraciones con node-pg-migrate
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` — infraestructura de webhooks
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — catalogo de eventos outbox
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — projections reactivas

Reglas obligatorias:

- Patron PostgreSQL-first (no BigQuery para lookups de usuario)
- Migraciones formales para cambios de schema (no DDL en runtime)
- `requireTenantContext()` o auth guard en endpoints de preferences
- Webhook endpoint con verificacion de firma de Resend
- Templates React Email — no introducir motor de interpolacion Handlebars/Mustache
- Eventos significativos del delivery layer deben emitirse al outbox (`publishOutboxEvent`)
- El unsubscribe de emails debe sincronizar con `notification_preferences` (no crear sistema paralelo)

## Normative Docs

- `docs/documentation/plataforma/sistema-email-templates.md` — inventario de templates y design tokens
- `docs/tasks/complete/TASK-095-centralized-email-delivery-layer.md` — implementacion original del delivery layer
- `docs/tasks/complete/CODEX_TASK_Transactional_Email_System.md` — spec original del sistema transaccional
- `docs/issues/open/ISSUE-017-invite-route-display-name-column-missing.md` — bug de `display_name`
- `docs/issues/open/ISSUE-019-email-schema-runtime-ddl-on-every-send.md` — runtime DDL
- `docs/issues/open/ISSUE-020-duplicate-email-retry-endpoints.md` — endpoints duplicados

## Dependencies & Impact

### Depends on

- `greenhouse_core.client_users` — tabla de usuarios (agregar columnas `locale`, `email_undeliverable`)
- `greenhouse_core.clients` — tabla de clientes (lectura de `client_name`)
- `greenhouse_notifications.email_deliveries` — tabla de deliveries (agregar status `rate_limited`)
- `greenhouse_notifications.email_subscriptions` — tabla de suscripciones (ya existe)
- Resend SDK v6 (`resend@^6.9.4`) — webhooks API
- TASK-266 (i18n & Globalization) — esta task implementa i18n solo para emails, TASK-266 es el esfuerzo global. No hay bloqueo mutuo.

### Blocks / Impacts

- TASK-267 (reenviar onboarding) — se beneficia del context resolver y del fix de ISSUE-018
- TASK-268 (revisar acceso) — no impactada
- TASK-023 (notification system) — se beneficia del unsubscribe
- `NotificationService` — consume `sendEmail()` como canal; debe seguir funcionando sin cambios
- Outbox projection `payroll_export_ready` — consume `sendEmail()` via `sendPayrollExportReadyNotification()`; no debe romperse
- Cron `/api/cron/email-delivery-retry` — rehidrata payloads historicos; context resolver no debe interferir

### Files owned

- `src/lib/email/context-resolver.ts` — NUEVO: resolucion automatica de contexto
- `src/lib/email/tokens.ts` — NUEVO: catalogo de tokens canonicos
- `src/lib/email/rate-limit.ts` — NUEVO: rate limiting por recipient
- `src/lib/email/delivery.ts` — MODIFICAR: integrar context resolver, rate limit, fix attachments
- `src/lib/email/templates.ts` — MODIFICAR: i18n support en resolvers
- `src/lib/email/types.ts` — MODIFICAR: nuevos tipos
- `src/lib/email/schema.ts` — ELIMINAR: reemplazar con migracion formal
- `src/lib/email/subscriptions.ts` — MODIFICAR: remover ensureEmailSchema
- `src/emails/InvitationEmail.tsx` — MODIFICAR: i18n
- `src/emails/PasswordResetEmail.tsx` — MODIFICAR: i18n
- `src/emails/VerifyEmail.tsx` — MODIFICAR: i18n
- `src/emails/NotificationEmail.tsx` — MODIFICAR: i18n
- `src/emails/components/EmailLayout.tsx` — MODIFICAR: unsubscribe link + i18n footer
- `src/app/api/webhooks/resend/route.ts` — NUEVO: bounce/complaint handler
- `src/app/api/account/email-preferences/route.ts` — NUEVO: toggle de suscripciones
- `src/app/api/admin/invite/route.ts` — MODIFICAR: simplificar caller (usar context resolver)
- `src/app/api/auth/verify-email/route.ts` — MODIFICAR: simplificar caller
- `src/app/api/account/forgot-password/route.ts` — MODIFICAR: simplificar caller
- `src/app/api/admin/operations/email-delivery-retry/route.ts` — ELIMINAR (duplicado)
- `src/app/api/admin/ops/email-delivery/retry-failed/route.ts` — ELIMINAR (duplicado)
- `src/lib/sync/event-catalog.ts` — MODIFICAR: agregar aggregate `emailDelivery` y eventos
- `src/lib/notifications/notification-service.ts` — NO MODIFICAR (compatibilidad verificada, funciona transparentemente)
- `src/lib/sync/projections/payroll-export-ready.ts` — NO MODIFICAR (funciona transparentemente via sendEmail)
- `src/config/notification-categories.ts` — REFERENCIA: define categorias con defaultChannels
- `migrations/XXXXXXXXX_email-enterprise-hardening.sql` — NUEVO

## Current Repo State

### Already exists

- `src/lib/email/delivery.ts` — delivery layer funcional con retry (3 attempts), batch support, delivery tracking en PG
- `src/lib/email/templates.ts` — 6 templates registrados con resolvers tipados
- `src/lib/email/types.ts` — tipos: EmailType, EmailDomain, EmailRecipient, SendEmailInput, etc.
- `src/lib/email/subscriptions.ts` — CRUD de suscriptores por tipo de email
- `src/lib/email/schema.ts` — DDL runtime (tablas ya existen en PG)
- `src/lib/resend.ts` — cliente Resend con lazy init y proxy
- `src/emails/` — 6 templates React Email + 2 componentes compartidos + constants
- `greenhouse_notifications.email_deliveries` — tabla de tracking con 18 columnas
- `greenhouse_notifications.email_subscriptions` — tabla de suscriptores con UPSERT
- `src/app/api/cron/email-delivery-retry/route.ts` — cron cada 5 min para retries
- `PayrollReceiptEmail.tsx` — ya soporta bilinguismo via `payRegime` (chile/international)
- `src/emails/PayrollReceiptEmail.test.tsx` y `PayrollExportReadyEmail.test.tsx` — tests existentes

### Gap

- No hay `locale` en `client_users` — templates hardcoded en español
- No hay `email_undeliverable` en `client_users` — bounces no se registran
- No hay context resolver — cada caller resuelve datos manualmente (fragil, causa ISSUE-017)
- No hay catalogo de tokens — cada template define su propio contrato de props sin estandar
- No hay rate limiting por recipient — spam accidental posible
- No hay link de unsubscribe en emails broadcast
- No hay webhook handler para bounces/complaints de Resend
- `ensureEmailSchema()` ejecuta DDL en cada envio (ISSUE-019)
- 3 endpoints admin de retry duplicados (ISSUE-020)
- Ventana de retry limitada a 1 hora (ISSUE-021)
- Attachments convertidos a base64 string en vez de Buffer (ISSUE-022)
- No hay migracion formal para tablas de email (ISSUE-023)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Migracion formal + fix de issues criticos (ISSUE-017, -018, -019, -021, -022, -023)

- Crear migracion SQL que formalice `greenhouse_notifications.email_deliveries` y `email_subscriptions` con `IF NOT EXISTS`
- Agregar columnas a `greenhouse_core.client_users`: `locale TEXT DEFAULT 'es'`, `email_undeliverable BOOLEAN DEFAULT FALSE`
- Agregar status `'rate_limited'` al CHECK constraint de `email_deliveries`
- Eliminar `src/lib/email/schema.ts` y todas las llamadas a `ensureEmailSchema()`
- Fix ISSUE-017: cambiar `display_name` → `client_name` en `invite/route.ts`
- Fix ISSUE-018: cambiar status `'pending'` → `'invited'` en `invite/route.ts`
- Fix ISSUE-021: cambiar ventana de retry de `1 hour` → `24 hours` en `delivery.ts`
- Fix ISSUE-022: pasar `attachment.content` como Buffer directo (no `.toString('base64')`) en `delivery.ts`
- Consolidar endpoints de retry: mantener `/api/admin/ops/email-delivery-retry` con error handling, eliminar los otros 2 (ISSUE-020)
- Regenerar tipos: `pnpm db:generate-types`

### Slice 2 — Catalogo de tokens canonicos + Context Resolver

- Crear `src/lib/email/tokens.ts` con `EmailTokenCatalog`:
  ```typescript
  interface ResolvedEmailContext {
    recipient: {
      firstName: string
      fullName: string
      email: string
      locale: 'es' | 'en'
      userId: string
    }
    client: {
      name: string
      id: string
      tenantType: 'client' | 'efeonce_internal'
    }
    platform: {
      url: string
      supportEmail: string
      logoUrl: string
    }
  }
  ```
- Crear `src/lib/email/context-resolver.ts` con `resolveEmailContext(recipientEmail: string)`:
  - Query `client_users` JOIN `clients` para obtener `full_name`, `client_name`, `locale`, `tenant_type`, `email_undeliverable`
  - Si `email_undeliverable = true`, retornar error (no enviar)
  - Cachear por email dentro del batch (mismo email no se resuelve 2 veces)
- Integrar en `deliverRecipient()` en `delivery.ts`: llamar `resolveEmailContext()` antes de `resolveTemplate()`, mergear resultado en el context
- Los callers (invite, forgot-password, verify) dejan de hacer queries manuales para datos del recipient — solo pasan datos especificos del template

### Slice 3 — i18n en templates de identidad

- Cada template recibe `locale` del context resolver
- `InvitationEmail.tsx`: version es/en (subject, greeting, body, CTA, disclaimer)
- `PasswordResetEmail.tsx`: version es/en
- `VerifyEmail.tsx`: version es/en
- `NotificationEmail.tsx`: version es/en
- `EmailLayout.tsx` footer: adaptar copy segun locale
- Templates de payroll: mantener logica existente (`payRegime` para receipt, español para export)
- Template resolvers en `templates.ts`: usar `locale` del context para seleccionar copy
- Patron: cada template recibe `locale` como prop y decide internamente (no crear archivos separados por idioma)

### Slice 4 — Rate limiting por recipient

- Crear `src/lib/email/rate-limit.ts` con `checkRecipientRateLimit(email: string, limit?: number)`:
  - Query `email_deliveries` para contar emails enviados en la ultima hora al recipient
  - Default: 10 emails/hora por recipient
  - Retorna `{ allowed: boolean, currentCount: number }`
- Integrar en `deliverRecipient()`: si excede limite, crear delivery row con status `'rate_limited'` y retornar sin enviar
- Agregar `'rate_limited'` a `EmailDeliveryStatus` en `types.ts`
- Log warning cuando se aplica rate limit

### Slice 5 — Unsubscribe / Email Preferences

- Agregar link de unsubscribe en `EmailLayout.tsx` footer para tipos broadcast:
  - `payroll_export`, `notification` → mostrar link
  - `password_reset`, `invitation`, `verify_email`, `payroll_receipt` → NO mostrar
  - El link apunta a `/account/email-preferences?token=...&type=...`
- Generar token de unsubscribe (JWT firmado, 30 dias TTL) con `email` + `emailType`
- Crear `POST /api/account/email-preferences` con:
  - `action: 'unsubscribe' | 'resubscribe'`
  - `emailType: string`
  - `token: string` (para unsubscribe sin login) O `requireTenantContext()` (para toggle con login)
  - Actualiza `email_subscriptions.active`
- Pagina simple `/account/email-preferences` que muestre tipos suscritos con toggles

### Slice 6 — Bounce/Complaint webhook handler

- Crear `POST /api/webhooks/resend/route.ts`:
  - Verificar firma de Resend (header `svix-id`, `svix-timestamp`, `svix-signature`)
  - Eventos soportados: `email.bounced`, `email.complained`, `email.delivered`
  - `email.bounced` (hard bounce): marcar `client_users.email_undeliverable = true` para el email
  - `email.complained`: auto-unsubscribe del tipo de email (insert en `email_subscriptions` con `active = false`)
  - `email.delivered`: actualizar `email_deliveries.status = 'delivered'` si existe `resend_id` match (nuevo status)
  - Log cada evento procesado
- Configurar webhook en dashboard de Resend (documentar en closing protocol)
- Agregar `'delivered'` a `EmailDeliveryStatus` (opcionalmente, para tracking mejorado)

## Out of Scope

- Template versioning / CMS (no necesario para el volumen actual)
- A/B testing de templates
- Editor visual de templates
- Bulk email / marketing campaigns
- UI admin completa de email preferences (la pagina del usuario es suficiente)
- Migracion de emails historicos a nuevo formato
- Template de email para bounce notification al admin (follow-up)

## Detailed Spec

### Context Resolver — Flujo de resolucion

```
caller (invite, forgot-password, etc.)
  ↓ pasa: emailType, recipientEmail, templateSpecificData (resetUrl, inviteUrl, etc.)
  ↓
sendEmail()
  ↓
deliverRecipient()
  ↓ 1. resolveEmailContext(recipientEmail)  ← NUEVO
  ↓    → query PG: client_users JOIN clients
  ↓    → retorna ResolvedEmailContext { recipient, client, platform }
  ↓    → si email_undeliverable: skip con status 'skipped'
  ↓
  ↓ 2. checkRecipientRateLimit(recipientEmail) ← NUEVO
  ↓    → si excede: skip con status 'rate_limited'
  ↓
  ↓ 3. resolveTemplate(emailType, mergedContext) ← EXISTENTE (context ahora incluye tokens)
  ↓
  ↓ 4. resend.emails.send(...)  ← EXISTENTE
  ↓
  ↓ 5. createDeliveryRow(...)   ← EXISTENTE
```

### Callers simplificados — Ejemplo invite/route.ts

**Antes (fragil):**
```typescript
const clients = await runGreenhousePostgresQuery(
  `SELECT display_name FROM greenhouse_core.clients WHERE client_id = $1`, [client_id]
)
const clientName = clients[0]?.display_name || 'Greenhouse'

await sendEmail({
  emailType: 'invitation',
  recipients: [{ email, userId, name: full_name }],
  context: { inviteUrl, inviterName, clientName, userName: full_name }
})
```

**Despues (robusto):**
```typescript
await sendEmail({
  emailType: 'invitation',
  recipients: [{ email, userId }],
  context: { inviteUrl, inviterName }
})
// clientName, userName, locale → resueltos automaticamente por context resolver
```

### i18n — Patron en templates

```tsx
// InvitationEmail.tsx
export default function InvitationEmail({ inviteUrl, inviterName, clientName, userName, locale = 'es' }) {
  const t = locale === 'en' ? {
    heading: 'You have been invited to Greenhouse',
    greeting: (name: string) => name ? `Hi ${name},` : 'Hi,',
    body: (inviter: string, client: string) =>
      `${inviter} invited you to join ${client}'s team on Efeonce Greenhouse™.`,
    cta: 'Activate my account',
    validity: '72 hours',
    disclaimer: 'If you were not expecting this invitation, you can safely ignore this email.'
  } : {
    heading: 'Te han invitado a Greenhouse',
    greeting: (name: string) => name ? `Hola ${name.split(' ')[0]},` : 'Hola,',
    body: (inviter: string, client: string) =>
      `${inviter} te invitó a unirte al equipo de ${client} en Efeonce Greenhouse™.`,
    cta: 'Activar mi cuenta',
    validity: '72 horas',
    disclaimer: 'Si no esperabas esta invitación, puedes ignorar este correo.'
  }
  // ... render con t.*
}
```

### Webhook de Resend — Verificacion de firma

Resend usa Svix para signing. Headers requeridos:
- `svix-id`
- `svix-timestamp`
- `svix-signature`

Se verifica con el signing secret del webhook (configurado en Resend dashboard). Usar `svix` npm package (metodo oficial de Resend, robusto, mantiene compatibilidad con rotacion de secrets).

### Integracion con Outbox Events

El delivery layer debe emitir eventos outbox para acciones significativas que otros sistemas pueden consumir:

| Evento | Cuando | Payload |
|--------|--------|---------|
| `email_delivery.bounced` | Webhook de Resend reporta hard bounce | `{ recipientEmail, resendId, bounceType, reason }` |
| `email_delivery.complained` | Webhook de Resend reporta complaint | `{ recipientEmail, resendId, emailType }` |
| `email_delivery.rate_limited` | Delivery bloqueado por rate limit | `{ recipientEmail, emailType, currentCount, limit }` |
| `email_delivery.undeliverable_marked` | Recipient marcado como undeliverable | `{ recipientEmail, userId, reason }` |

Estos eventos se registran en `event_catalog.ts` bajo un nuevo aggregate `emailDelivery`. Permiten que projections futuras reaccionen (ej: notificar al admin cuando un bounce ocurre, generar metricas de delivery health).

**Evento entrante existente**: la projection `payroll_export_ready` ya consume `payroll_period.exported` y dispara `sendPayrollExportReadyNotification()` → `sendEmail()`. Este flujo no se modifica — el context resolver se aplica transparentemente.

### Integracion con NotificationService

`NotificationService.dispatch()` usa `sendEmail()` como canal de email. La relacion es:

```
NotificationService.dispatch()
  ↓ resuelve canales via notification_preferences (in_app, email)
  ↓ si email habilitado:
    ↓ sendEmailNotification() → sendEmail(emailType: 'notification')
      ↓ deliverRecipient()
        ↓ resolveEmailContext()  ← NUEVO (transparente)
        ↓ resolveTemplate()
        ↓ resend.emails.send()
```

**Sincronizacion de preferences**: hoy existen dos sistemas de preferencias:
- `notification_preferences` (in_app + email por categoria, para NotificationService)
- `email_subscriptions` (por email_type, para emails broadcast directos como payroll_export)

El endpoint `POST /api/account/email-preferences` debe:
1. Para emails que pasan por NotificationService (categories como `payroll_ready`, `leave_status`): actualizar `notification_preferences.email_enabled = false`
2. Para emails broadcast directos (`payroll_export`): actualizar `email_subscriptions.active = false`
3. El link de unsubscribe en el footer incluye metadata para saber cual sistema actualizar

**No fusionar las dos tablas** en esta task — esa consolidacion es un follow-up. Solo asegurar que el unsubscribe funciona correctamente en ambos contextos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `resolveEmailContext()` retorna datos correctos de recipient y cliente para cualquier email registrado en `client_users`
- [ ] Si `email_undeliverable = true`, el delivery se skippea con mensaje descriptivo
- [ ] Los callers (invite, forgot-password, verify) no hacen queries manuales para nombre/cliente — solo pasan datos especificos del template
- [ ] ISSUE-017 resuelto: email de invitacion muestra nombre real del cliente
- [ ] ISSUE-018 resuelto: usuario invitado se crea con status `'invited'`
- [ ] Templates InvitationEmail, PasswordResetEmail, VerifyEmail, NotificationEmail soportan `locale: 'es' | 'en'`
- [ ] EmailLayout footer adapta copy segun locale
- [ ] Rate limit: al enviar >10 emails/hora al mismo recipient, el delivery se marca `'rate_limited'`
- [ ] Emails broadcast (payroll_export, notification) incluyen link de unsubscribe en footer
- [ ] Emails transaccionales (password_reset, invitation, verify) NO tienen link de unsubscribe
- [ ] `POST /api/account/email-preferences` permite toggle de suscripciones con token o con sesion
- [ ] `POST /api/webhooks/resend` procesa eventos bounce/complaint/delivered de Resend
- [ ] Hard bounce marca `email_undeliverable = true` en `client_users`
- [ ] Complaint auto-unsubscribe del tipo de email
- [ ] No existe `ensureEmailSchema()` — tablas creadas por migracion formal
- [ ] Solo existe 1 endpoint admin de retry batch (los duplicados eliminados)
- [ ] Ventana de retry es 24 horas (no 1 hora)
- [ ] Attachments se pasan como Buffer directo a Resend (no base64 string)
- [ ] `NotificationService.dispatch()` sigue enviando emails correctamente sin cambios en su codigo
- [ ] Projection `payroll_export_ready` sigue disparando emails de export correctamente
- [ ] Cron `processFailedEmailDeliveries()` rehidrata y reenvia payloads historicos sin error
- [ ] Eventos outbox (`email_delivery.bounced`, `email_delivery.complained`, `email_delivery.rate_limited`) se publican correctamente
- [ ] Unsubscribe de emails broadcast actualiza `email_subscriptions`; unsubscribe de notificaciones actualiza `notification_preferences`
- [ ] Callers existentes que pasan `context.clientName` manualmente siguen funcionando (precedencia sobre resolver)
- [ ] `pnpm build`, `pnpm lint`, `pnpm test` pasan sin errores
- [ ] Tests existentes de PayrollReceiptEmail y PayrollExportReadyEmail siguen pasando

## Verification

- `pnpm build`
- `pnpm lint`
- `pnpm test`
- `pnpm migrate:up` aplica migracion sin error
- `pnpm db:generate-types` regenera tipos correctamente
- Verificacion manual: invitar usuario → email muestra nombre del cliente + copy en el locale del usuario
- Verificacion manual: enviar >10 emails al mismo usuario en 1 hora → el 11vo se marca `rate_limited`
- Verificacion manual: endpoint de unsubscribe funciona con token
- Verificacion manual: configurar webhook en Resend → enviar test event → verificar procesamiento

## Closing Protocol

- [ ] Configurar webhook de Resend en dashboard para `email.bounced`, `email.complained`, `email.delivered` apuntando a `https://greenhouse.efeoncepro.com/api/webhooks/resend`
- [ ] Guardar signing secret del webhook en Secret Manager como `RESEND_WEBHOOK_SIGNING_SECRET`
- [ ] Cerrar ISSUE-017, ISSUE-018, ISSUE-019, ISSUE-020, ISSUE-021, ISSUE-022, ISSUE-023 como resueltos
- [ ] Actualizar `docs/documentation/plataforma/sistema-email-templates.md` con la nueva arquitectura
- [ ] Actualizar `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` seccion email delivery

## Follow-ups

- TASK-267 (reenviar onboarding) — se simplifica significativamente con el context resolver
- Consolidar `notification_preferences` y `email_subscriptions` en un solo sistema de preferencias
- Template de email para notificar al admin cuando un recipient es marcado undeliverable
- Projection reactiva que dispare notificacion in-app al admin cuando ocurre un bounce
- UI admin para ver metricas de delivery (bounce rate, complaint rate, undeliverable count)
- Agregar `locale` selector en la ficha de usuario en Admin
- Considerar `email.delivery_failed` webhook para tracking mas granular
- Dashboard de email health en Admin Ops (complemento de Ops Health existente)

## Decisions (formerly Open Questions)

1. **Webhook signing**: usar `svix` npm package. Es el metodo oficial de Resend, maneja rotacion de secrets automaticamente, y evita bugs sutiles de verificacion HMAC manual. La dependencia es liviana (~50KB).

2. **Rate limit default**: 10 emails/hora por recipient individual. Payroll receipt puede enviar a 50+ usuarios en un batch, pero eso son 50 recipients distintos — cada uno recibe 1 email, bien dentro del limite. El unico escenario real de >10 emails/hora al mismo recipient seria un bug de loop, que es exactamente lo que queremos proteger.

3. **Consolidacion notification_preferences vs email_subscriptions**: NO en esta task. Son dos sistemas con propositos distintos hoy (NotificationService categories vs broadcast directo). El unsubscribe funciona en ambos contextos, pero la consolidacion en una sola tabla es un follow-up separado despues de evaluar el patron de uso.
