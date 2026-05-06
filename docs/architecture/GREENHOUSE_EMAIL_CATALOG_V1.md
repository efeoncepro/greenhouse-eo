# CODEX TASK -- Greenhouse Email Catalog v1: transactional, security, executive y domain notifications

## Delta 2026-04-17 — Foto real del sistema de email hoy

Greenhouse ya no tiene solo un puñado de templates sueltos, pero tampoco debe documentarse como si fuera una plataforma completa de campañas, journeys y analytics avanzados.

La foto real hoy es:

- existe una **capa centralizada de delivery** en `src/lib/email/delivery.ts`
- el provider canónico sigue siendo **Resend**
- los templates canónicos siguen siendo **React Email**
- cada entrega queda persistida en `greenhouse_notifications.email_deliveries`
- existe control operativo básico y útil:
  - `priority` por tipo (`critical`, `transactional`, `broadcast`)
  - `rate limiting` por destinatario
  - `kill switch` por `email_type`
  - reintentos sobre entregas fallidas
  - estado `dead_letter` cuando una entrega agota intentos
  - manejo de `bounce` / `complaint` vía webhook de Resend
  - `unsubscribe` firmado para tipos broadcast
  - resolución automática de contexto del destinatario
- existe además un **runtime async complementario** en `ops-worker` para envíos batch o programados como el digest semanal de Nexa

Pero el sistema **todavía no es**:

- un motor de campañas masivas o marketing automation
- un journey/orchestration engine multistep
- un centro de control operativo completo para email dentro del portal
- una capa con analytics de engagement profundos ya explotados en UI
- una lane unificada de preferencia por categoría de negocio fina para todos los módulos

En resumen: hoy Greenhouse tiene un **sistema robusto de email transaccional, operativo y de algunos broadcast importantes**, no una suite completa de messaging enterprise generalista.

## Delta 2026-05-06 — TASK-408 copy dictionary sin romper personalizacion

El catalogo de emails empezo a consumir `src/lib/copy/` para copy institucional y de template, pero el contrato arquitectonico separa explicitamente **copy estatico** de **tokens runtime**.

- `src/lib/copy/dictionaries/es-CL/emails.ts` es la fuente de copy reusable para layout, auth, notification, leave y payroll employee-facing.
- `selectEmailTemplateCopy()` conserva fallback legacy `en` mientras `en-US` siga como mirror de `es-CL`.
- `selectEmailIntlDateLocale()` centraliza la proyeccion de locale Intl para fechas de emails.
- Los tokens de personalizacion (`recipient`, `client`, `platform`, periodos, montos, fechas, links, motivos, procesadores y adjuntos) siguen viniendo de `src/lib/email/tokens.ts`, `src/lib/email/delivery.ts` o de props/callers de dominio. El dictionary no debe capturar datos de negocio.

En payroll, `PayrollReceiptEmail`, `PayrollPaymentCommittedEmail`, `PayrollPaymentCancelledEmail` y `PayrollLiquidacionV2Email` leen copy desde `emails.payroll.*`, pero mantienen intactos payment lifecycle, subjects, attachment delivery, outbox, webhooks y projections. Los snapshots de `src/emails/EmailTemplateBaseline.test.tsx` son el gate canonico: una migracion de copy no debe cambiar bytes de HTML salvo decision explicita documentada.

## Estado

Baseline de producto y arquitectura al 2026-03-19.

Esta task no reemplaza `CODEX_TASK_Transactional_Email_System.md`.

La relacion correcta entre ambas es:
- `CODEX_TASK_Transactional_Email_System.md` define la infraestructura base de envio, tokens, templates y flows de acceso
- esta task define el catalogo mas amplio de emails que Greenhouse necesitara como portal ejecutivo-operativo

## Delta 2026-04-07 — Leave Request Email Family (P2 completado)

Familia completa de 4 templates transaccionales dedicados para permisos/ausencias. Todos verificados end-to-end en produccion con 8 emails de prueba enviados exitosamente, cubriendo 4 tipos de permiso distintos (estudio, vacaciones, medico, parental) y 4 personas distintas como solicitante/revisor.

### Templates implementados

| EmailType | Disparador(es) | Destinatario | Proposito |
|-----------|---------------|-------------|-----------|
| `leave_request_submitted` | `leave_request.created` | Solicitante | Confirmacion de envio (badge pendiente, summary card, motivo) |
| `leave_request_pending_review` | `leave_request.created`, `leave_request.escalated_to_hr` | Supervisor o HR | Notificacion de revision pendiente (datos colaborador, CTA revisar) |
| `leave_request_decision` | `leave_request.approved`, `.rejected`, `.cancelled` | Solicitante | Resultado de la solicitud (status badge verde/rojo/gris, notas del revisor) |
| `leave_review_confirmation` | `leave_request.approved`, `.rejected` | Revisor | Confirmacion de la accion tomada (motivo original, notas propias) |

### Personalizacion dinamica

Los emails se personalizan automaticamente desde el event payload del outbox — no hay valores hardcodeados:
- `memberName` / `memberEmail` — del registro del colaborador en PostgreSQL
- `actorName` — del miembro que toma la accion (supervisor o HR)
- `leaveTypeName` — nombre del tipo de permiso (Vacaciones, Permiso medico, Permiso parental, etc.)
- `startDate`, `endDate`, `requestedDays` — fechas y duracion
- `reason` — motivo original del solicitante (condicional)
- `notes` — observaciones del revisor (condicional)
- `locale` — es/en auto-resuelto via context resolver

### Hero images (Imagen 4, clay 3D)

Estilo canonico: **clay 3D sobre fondo blanco puro** con colores de marca (navy/blue/teal/green).
Almacenadas en **GCS public buckets** (no Vercel), accesibles sin auth:

| Imagen | Bucket path | Descripcion |
|--------|------------|-------------|
| `leave-submitted.png` | `emails/leave-submitted.png` | Avion de papel azul + reloj de arena navy |
| `leave-pending-review.png` | `emails/leave-pending-review.png` | Bandeja navy + documento azul + campana verde |
| `leave-decision-v2.png` | `emails/leave-decision-v2.png` | Calendario navy + checkmark azul + sobre |
| `leave-review-v2.png` | `emails/leave-review-v2.png` | Clipboard navy + timbre azul + lapicera |

URL pattern: `https://storage.googleapis.com/${GREENHOUSE_PUBLIC_MEDIA_BUCKET}/emails/<filename>`

### Infraestructura

- **Delivery**: via notification projection en ops-worker Cloud Run (outbox reactivo, cada 5 min)
- **Event payload**: enriquecido con `notes` y `reason` en `buildLeaveEventPayload`
- **Skill**: `/greenhouse-email` creada (repo `.claude/skills/` + global `~/.claude/skills/`) con workflow completo
- **CRITICO**: cambios en templates requieren redeploy de ops-worker (`bash services/ops-worker/deploy.sh`)
- **Imagenes**: GCS public bucket por entorno, NUNCA Vercel (SSO Protection bloquea carga)

## Delta 2026-04-06

- TASK-269: Email Delivery Enterprise Hardening implementado
- Context Resolver automatico: `resolveEmailContext()` hidrata recipient/client/platform
- i18n: templates de identidad soportan es/en via `locale` en `client_users`
- Rate limiting: 10 emails/hora por recipient (`src/lib/email/rate-limit.ts`)
- Unsubscribe: link firmado en emails broadcast, endpoint `POST /api/account/email-preferences`
- Bounce/Complaint webhook: `POST /api/webhooks/resend` — hard bounce marca undeliverable, complaint auto-unsubscribe
- Eventos outbox: `email_delivery.bounced`, `email_delivery.complained`, `email_delivery.rate_limited`, `email_delivery.undeliverable_marked`
- Runtime DDL eliminado: `ensureEmailSchema()` removido, schema formalizado via migracion
- Retry window ampliada: 1 hora → 24 horas
- Attachments: Buffer directo (no base64 string)
- Endpoints retry consolidados: 3 → 1 (`/api/admin/ops/email-delivery-retry`)
- Resuelve: ISSUE-017 (display_name), ISSUE-018 (status pending), ISSUE-019 (runtime DDL), ISSUE-020 (retry duplicados), ISSUE-021 (retry window), ISSUE-022 (base64 attachments), ISSUE-023 (no migration)

## Delta 2026-03-28

- `TASK-095` quedó implementada como capa unificada de delivery sobre Resend en `src/lib/email/delivery.ts`.
- Los callers de Auth, NotificationService y Payroll ya consumen `sendEmail()` con templates centralizados y persistencia unificada en `greenhouse_notifications.email_deliveries`.
- `NotificationEmail` reemplaza el plain text ad hoc para el canal `notification`, y `email_subscriptions` queda como resolver canónico para recipientes por tipo.
- El retry cron `/api/cron/email-delivery-retry` usa `delivery_payload` para reintentar entregas fallidas con máximo 3 intentos dentro de 1 hora.

## Resumen

Greenhouse ya necesita una capa de email mas amplia que el baseline de:
- `forgot password`
- `invite`
- `accept invite`
- `verify email`

Como portal multi-tenant de visibilidad ejecutiva y contexto operativo, Greenhouse debe enviar emails que cubran cuatro familias:

1. `Access & Identity`
2. `Security`
3. `Executive Digests & Decision Support`
4. `Domain Notifications`

## Runtime actual

### Qué existe hoy

#### 1. Delivery layer centralizada

- `src/lib/email/delivery.ts` es la entrada canónica para enviar correos
- unifica:
  - render de template
  - persistencia de entrega
  - llamada a Resend
  - rate limiting
  - unsubscribe link para broadcast
  - actualización de estado
  - retry y dead letter

#### 2. Persistencia operativa en PostgreSQL

Las tablas operativas ya existen en `greenhouse_notifications`:

- `email_deliveries`
- `email_subscriptions`
- `email_type_config`
- `email_engagement`

Uso real hoy:

- `email_deliveries` = source of truth de entregas y retries
- `email_subscriptions` = opt-in / opt-out por tipo
- `email_type_config` = kill switch por `email_type`
- `email_engagement` = foundation de tracking, pero todavía no es una surface operativa madura del portal

#### 3. Prioridades y dos modos de entrega

El runtime hoy diferencia tres prioridades:

- `critical`
- `transactional`
- `broadcast`

Y opera con dos caminos prácticos:

- **single/sequential path** para envíos individuales o no-broadcast
- **batch path** para broadcast multi-recipient cuando el caso aplica

#### 4. Webhook de entregabilidad

`POST /api/webhooks/resend` ya procesa:

- `email.delivered`
- `email.bounced`
- `email.complained`

Eso permite:

- confirmar delivered cuando Resend lo reporta
- marcar `email_undeliverable` en `client_users` frente a hard bounce
- auto-desuscribir cuando hay complaint en un tipo broadcast

#### 5. Context resolver

El sistema ya no depende de que cada caller hidrate manualmente nombre, locale y tenant del destinatario.

`resolveEmailContext()` resuelve de forma centralizada:

- recipient
- client
- locale
- platform metadata

#### 6. Runtime multi-runtime

El contrato ya no vive solo en Vercel:

- el runtime web usa la misma capa canónica
- `ops-worker` puede disparar envíos via `sendEmail()` o endpoints dedicados como el digest semanal
- el secreto de Resend ya está documentado para Vercel + Cloud Run vía `RESEND_API_KEY_SECRET_REF`

### Qué no existe todavía como capacidad madura

- campañas arbitrarias con segmentación rica desde UI admin
- scheduler de newsletters o sequences genéricas
- centro de observabilidad de email con dashboards first-class en Admin Center
- analítica de engagement realmente consumida por producto
- control plane completo de preferencias por categoría funcional fina
- plantilla/base de attachments y assets con governance transversal a todos los dominios
- colas dedicadas independientes del worker/reactive stack para todos los broadcasts grandes

## Gaps para evolucionarlo más

Para pasar de “sistema robusto de email transaccional y operativo” a “plataforma madura de messaging”, las siguientes lanes siguen abiertas:

1. **Observabilidad first-class**
   - explotar `email_engagement` y `email_deliveries` en una surface admin real
   - KPIs: sent, delivered, failed, complaint rate, bounce rate, dead letter backlog, retry success rate

2. **Control plane más fino**
   - kill switches más granulares
   - governance por tenant, dominio o categoría operativa
   - administración visible de preferencias por familia de email, no solo por tipo aislado

3. **Broadcasts grandes desacoplados**
   - llevar envíos masivos o costosos a un carril más explícito de worker/queue
   - evitar que el runtime de retries y el runtime de notificaciones compartan toda la misma presión operativa

4. **Productización de engagement**
   - usar aperturas/clicks/complaints para decisiones operativas reales
   - alertar cuando una familia cae en deliverability mala o cuando un digest deja de abrirse

5. **Mayor cobertura de catálogo**
   - el catálogo ya existe como dirección, pero no toda la familia recomendada está implementada
   - faltan lanes de seguridad, finanzas, governance y algunos digests/resúmenes más maduros

6. **UX operativa para soporte**
   - lookup y troubleshooting de una entrega desde Admin Center
   - replay más claro por lote, por email type, por source event y por destinatario

La regla principal es:
- Greenhouse no debe convertirse en un sistema de spam operativo
- el email debe reservarse para acceso, riesgo, resumen ejecutivo y eventos de decision
- el detalle fino del trabajo diario sigue viviendo en Notion, Frame.io u otras fuentes

## Problema

Sin un catalogo claro de emails:
- se tiende a mezclar necesidades de acceso con necesidades de negocio
- cada modulo puede terminar inventando notificaciones por su cuenta
- se pierde consistencia de branding, microcopy, prioridad y reglas de audiencia
- el sistema puede terminar mandando demasiados emails o emails pobres en contexto

## Objetivo

Definir el catalogo oficial de emails de Greenhouse para priorizar implementacion y evitar drift entre:
- auth
- product
- data node / scheduled reports
- creative / ico
- finance / hr / ai tooling

## Principios

- `Resend` sigue siendo el canal de envio transaccional y operativo por defecto
- `React Email` sigue siendo la capa canonica de templates
- `PostgreSQL` debe guardar preferencias, programaciones, tokens y control plane de envio cuando aplique
- `BigQuery` se usa para logging, analytics y reporting de entregabilidad
- no todo evento merece un email
- si un evento se ve mejor como card, badge o inbox interno, no debe salir por email automaticamente

## Familias de email

## 1. Access & Identity

Emails centrados en acceso, onboarding y activacion de cuenta.

### Ya existentes o en baseline inmediato

- `forgot_password`
- `password_reset_success`
- `invite_user`
- `invite_reminder`
- `accept_invite_success`
- `verify_email`
- `welcome_account_activated`

### Valor

- reduce soporte manual
- mejora onboarding
- deja trazabilidad clara del lifecycle de acceso

## 2. Security

Emails centrados en eventos de seguridad o cambios sensibles.

### Recomendados

- `password_changed`
- `new_sso_linked`
- `security_alert_reset_attempts`
- `security_alert_email_changed`
- `security_alert_login_method_changed`

### Regla

Estos emails deben priorizar:
- claridad
- auditabilidad
- accion inmediata

No deben depender de lectura de dashboards ni de data warehouse pesado.

## 3. Executive Digests & Decision Support

Emails centrados en resumen y decision, no en micro-eventos.

### Recomendados

- `daily_executive_digest`
- `weekly_executive_digest` -- **implementado 2026-04-16** como digest interno de Nexa/ICO para liderazgo
- `monthly_executive_summary`
- `risk_alert_digest`

### Contenido esperado

- KPIs clave
- highlights
- riesgos
- proximos hitos
- CTA al portal

### Regla

Estos emails deben ser:
- client-first
- breves
- visuales
- accionables

No deben intentar reemplazar al dashboard.

`weekly_executive_digest` hoy corre como digest interno de liderazgo sobre `ops-worker`, con delivery via `src/lib/email/delivery.ts` y contenido ICO-first. La expansion a un digest cross-domain real queda desacoplada de este contrato inicial.

## 4. Domain Notifications

Emails ligados a capacidades o modulos especificos, pero solo cuando el evento importa.

### Creative / Delivery / ICO

- `review_ready`
- `creative_feedback_pending`
- `delivery_risk_alert`
- `campaign_milestone`
- `ico_threshold_breach`

### Finance

- `invoice_issued`
- `payment_received`
- `invoice_overdue_alert`
- `aging_digest`

### HR / Payroll

- `leave_request_submitted` -- **implementado 2026-04-07** como `leave_request_submitted` (confirmacion al solicitante)
- `leave_request_pending_review` -- **implementado 2026-04-07** (notificacion al supervisor/HR para revisar)
- `leave_request_approved` -- **implementado 2026-04-07** como `leave_request_decision` (status: approved)
- `leave_request_rejected` -- **implementado 2026-04-07** como `leave_request_decision` (status: rejected)
- `leave_request_cancelled` -- **implementado 2026-04-07** como `leave_request_decision` (status: cancelled)
- `leave_review_confirmation` -- **implementado 2026-04-07** (email de confirmacion al revisor)
- `payroll_period_approved`
- `payroll_export_ready`

Notas:
- `payroll_period_approved` se usa como aviso de estado listo para exportar/revisar.
- `payroll_export_ready` debe entenderse como notificación downstream de cierre/exportación canonica de nómina, disparada desde `payroll_period.exported`, y puede incluir CSV/PDF adjuntos o enlaces seguros al portal.
- el reenvío de `payroll_export_ready` reutiliza el paquete documental persistido del período exportado; no debe volver a cerrar la nómina ni depender de un click de descarga manual

### AI Tooling

- `license_assigned`
- `license_revoked`
- `wallet_low_balance`
- `wallet_exhausted`

### Admin / Governance

- `user_invited_not_activated`
- `tenant_provisioning_completed`
- `scim_provisioning_issue`

## Priorizacion recomendada

## P0 -- inmediatamente despues del baseline transaccional

- `welcome_account_activated`
- `invite_reminder`
- `password_changed`
- `review_ready`
- `daily_executive_digest`
- `delivery_risk_alert`

## P1 -- cuando Data Node / digests y Creative Hub esten mas maduros

- `weekly_executive_digest` -- **ya implementado 2026-04-16** para leadership digest interno sobre Nexa/ICO
- `creative_feedback_pending`
- `campaign_milestone`
- `invoice_issued`
- `payment_received`
- `wallet_low_balance`

## P2 -- expansion por dominios

- `monthly_executive_summary`
- `invoice_overdue_alert`
- `aging_digest`
- `leave_request_*`
- `payroll_*`
- `scim_provisioning_issue`

## Audiencias

## Client users

Reciben:
- acceso
- digests ejecutivos
- riesgo operativo
- review notifications
- milestones

No deberian recibir:
- ruido de admin interno
- cambios tecnicos del sistema
- micro-eventos de backoffice

## Internal users

Reciben:
- seguridad
- invitaciones / onboarding
- alerts operativos
- governance
- notificaciones de dominio por rol

## Finance / HR / Admin specialists

Reciben:
- eventos especificos del dominio
- resúmenes operativos relevantes a su flujo

## Modelo de datos recomendado

Esta task no exige toda la implementacion ahora, pero define el shape recomendado.

### PostgreSQL

Tablas candidatas futuras:
- `greenhouse_core.user_email_preferences`
- `greenhouse_core.user_email_subscriptions`
- `greenhouse_sync.scheduled_email_jobs`
- `greenhouse_sync.email_delivery_events`

### BigQuery

Analitica y auditoria:
- `greenhouse.email_logs`
- futuros marts de entregabilidad, aperturas y clicks si se habilitan

## Relacion con Data Node

`Data Node` y esta task se tocan, pero no son lo mismo.

- `Data Node` usa email como canal de delivery de digests/reports
- esta task define el catalogo completo de emails del portal

Los `executive digests` y `scheduled reports` deben compartir:
- design system
- scheduling logic
- preferencias de recepcion

Pero no deben fusionarse en un solo brief.

## Relacion con Home + Nexa

`Home` y `Nexa` pueden reducir la necesidad de algunos emails de detalle.

Regla:
- si una señal funciona mejor como entrada diaria dentro del portal, no convertirla por defecto en email
- el email debe funcionar como empujon al portal, no como reemplazo del home

## Regla de diseño y copy

Todos los emails nuevos deben seguir:
- branding Greenhouse
- tono ejecutivo y claro
- CTA unico o muy pocos
- asunto entendible sin jerga interna
- version mobile legible

Evitar:
- correos demasiado largos
- tablas densas
- lenguaje operacional de Notion
- multiples CTA conflictivos

## Criterios de aceptacion

- existe un catalogo priorizado de emails de Greenhouse mas alla del baseline auth
- el equipo distingue claramente `transactional`, `security`, `executive digest` y `domain notifications`
- queda documentado que Greenhouse no debe enviar emails de micro-operacion indiscriminada
- `P0`, `P1` y `P2` quedan priorizados de forma explicita
- la task convive sin conflicto con `CODEX_TASK_Transactional_Email_System.md`

## Fuera de alcance

- implementar todos estos emails ahora mismo
- definir pricing comercial de digests enterprise
- tracking avanzado de open/clicks
- inbox interno del portal

## Proximo paso recomendado

Una vez cerrado el baseline tecnico de `Transactional Email`, abrir un task corto de ejecucion para:
- `welcome_account_activated`
- `invite_reminder`
- `password_changed`
- `review_ready`
- `daily_executive_digest`

Ese task deberia decidir:
- triggers exactos
- audiencias
- preferencias opt-in/opt-out
- templates concretos
