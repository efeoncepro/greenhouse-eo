# Comunicaciones y Notificaciones end-to-end

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-06-15 por Codex
> **Modulo:** Comunicaciones / Email / Notificaciones / Teams
> **Rutas principales:** `/notifications`, `/notifications/preferences`, `/admin/notifications`, `/admin/email-delivery`, `/admin/emails/preview`, `/api/notifications`, `/api/admin/email-deliveries`, `/api/webhooks/resend`, `/api/teams-bot`
> **Arquitectura relacionada:** `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md`, `docs/architecture/GREENHOUSE_EMAIL_PREVIEW_V1.md`, `docs/architecture/GREENHOUSE_NOTIFICATION_HUB_V1.md`, `docs/architecture/GREENHOUSE_TEAMS_NOTIFICATIONS_V1.md`, `docs/architecture/GREENHOUSE_TEAMS_BOT_INTERACTION_V1.md`

## Estado de verificacion

Documento reconciliado el 2026-06-15 contra codigo, arquitectura, schema/migrations y DB viva con datos agregados sin PII. La conexion Postgres respondio desde `greenhouse_app` con usuario runtime `greenhouse_app` a las 2026-06-15 10:50 UTC. Evidencia revisada: `src/lib/email/**`, `src/lib/notifications/**`, `src/lib/integrations/teams/**`, `src/lib/teams-bot/**`, rutas de notifications/email delivery, webhook Resend, scripts Teams y tablas `greenhouse_notifications.*` / `greenhouse_core.teams_*`.

Snapshot DB agregado del ambiente consultado:

- Notificaciones in-app: 81 leidas y 128 no leidas.
- `greenhouse_notifications.notification_log` ultimos 30 dias: 16 envios por email y 48 in-app con estado `sent`.
- `greenhouse_notifications.email_deliveries` ultimos 30 dias: 53 `sent`.
- `greenhouse_core.teams_notification_channels`: 3 canales `teams_bot` con `provisioning_status='ready'`.
- `greenhouse_core.teams_bot_conversation_references`: 8 referencias.

## Que es

Comunicaciones es el dominio que convierte eventos operativos en mensajes entregables por canal. Cubre tres carriles principales:

- **In-app notifications:** alertas dentro del portal.
- **Email transaccional/operacional/broadcast limitado:** envio por Resend con tracking y politicas.
- **Teams notifications / TeamBot:** anuncios y tarjetas operativas en Teams.

Greenhouse no debe tratar estos canales como botones sueltos. Cada envio debe tener destinatario, categoria, preferencia, delivery log, retry/dead-letter cuando aplique y trazabilidad hacia el evento fuente.

## Entidades principales

- **Notification:** registro in-app en `greenhouse_notifications.notifications` o proyecciones relacionadas.
- **Notification preference:** preferencias por usuario/categoria/canal.
- **Notification log:** bitacora de dispatch/projection por canal.
- **Email delivery:** fila persistida en `greenhouse_notifications.email_deliveries` con estado, errores, provider ids y metadata.
- **Email type config:** configuracion por tipo de correo, incluyendo kill switch, rate limit y politica.
- **Email subscription:** opt-in/opt-out y unsubscribe para broadcast.
- **Teams notification channel:** `greenhouse_core.teams_notification_channels`, define canal, recipient kind, transport y readiness.
- **Teams bot conversation reference:** `greenhouse_core.teams_bot_conversation_references`, necesario para mensajes proactivos Bot Framework.
- **Teams inbound action:** acciones Action.Submit recibidas por TeamBot.

## Que hace automatico Greenhouse

- Resuelve destinatarios desde userId, identityProfileId, memberId o email externo cuando la categoria lo permite.
- Evalua preferencias antes de emitir notificaciones.
- Persiste emails en `email_deliveries` antes/durante el envio para auditoria.
- Aplica kill switch por `email_type` para detener clases de correo sin apagar todo Resend.
- Aplica rate limit y dead-letter cuando corresponde.
- Agrega headers de unsubscribe en broadcast.
- Procesa webhooks Resend con verificacion Svix/HMAC para bounce, complaint, delivered y eventos relacionados.
- Marca usuarios o emails como undeliverable/unsubscribed cuando corresponde.
- En Teams, resuelve canal configurado y transport (`teams_bot`, `azure_logic_app` legacy o `graph_rsc` donde aplique).
- Registra run logs de envios Teams en `source_sync_runs` con source system `teams_notification`.

## Que hace el operador

- Usa `/admin/email-delivery` para ver entregas, fallas, pendientes, retries y KPIs.
- Usa `/admin/emails/preview` para revisar templates antes de enviar pruebas.
- Revisa `/admin/notifications` o surfaces relacionadas para estado de notificaciones internas.
- Usa scripts o runbooks Teams solo con destino y mensaje aprobados.
- No reenvia correos desde proveedor externo sin dejar trazabilidad en Greenhouse.
- No desactiva Resend globalmente si basta un kill switch de tipo.
- No usa TeamBot como bot conversacional general; hoy es canal de notificacion y acciones acotadas.

## Email: flujo funcional

1. Un dominio publica evento o llama la capa `sendEmail`.
2. Greenhouse resuelve tipo de email, template, destinatario y contexto.
3. Revisa kill switch, rate limit, subscription/preference y undeliverable status.
4. Persiste `email_deliveries` con estado inicial.
5. Renderiza template React Email con tokens/brand permitidos.
6. Envia por Resend si la configuracion esta lista.
7. Actualiza estado con provider response.
8. Si falla, clasifica error, retry/dead-letter o alerta segun politica.
9. Resend webhook actualiza delivered/bounced/complained y politicas derivadas.

## In-app notifications: flujo funcional

1. Un evento o servicio llama `dispatchNotification`.
2. Se resuelven recipients reales.
3. Se evalua categoria y preferencias.
4. Se crea notification/log.
5. La API `/api/notifications` entrega lista paginada y filtros por estado/categoria.
6. El usuario marca leidas o ajusta preferencias desde la UI habilitada.

## Teams: flujo funcional

1. Un evento/proyeccion o script solicita envio Teams.
2. Greenhouse busca `teams_notification_channels` por `channel_code`.
3. Verifica readiness, recipient kind y configuracion del bot/canal.
4. Si es Bot Framework, usa conversation reference y credenciales de Bot Service.
5. Construye Adaptive Card con menciones validas si aplica.
6. Envia y registra outcome.
7. Si hay Action.Submit, TeamBot registra inbound action y el handler decide si es soportada.

## Estados y diagnostico

- **pending:** delivery creado pero aun no enviado o esperando retry.
- **sent:** provider acepto el envio.
- **delivered:** provider reporto entrega.
- **failed:** error de envio.
- **dead_letter:** agotado o bloqueado por politica.
- **bounced/complained:** Resend reporto rebote o queja; requiere revisar destinatario/lista.
- **rate_limited:** Greenhouse freno por politica de volumen.
- **skipped:** no se envio por preferencias, unsubscribe, kill switch o destinatario no resoluble.

## Fronteras importantes

- Email delivery no prueba que la persona leyo el mensaje.
- Sent no siempre es delivered.
- Un bounce debe afectar futuras entregas al destinatario, no ignorarse.
- TeamBot no es Nexa ni chatbot general.
- Teams mentions en Adaptive Cards requieren ids/UPN correctos; no se improvisan `29:` si el helper no los valida.
- Preview de correo no es envio productivo.
- Broadcast no es marketing automation completo.

## Preguntas que Nexa debe responder bien

- "Como reviso si un email fallo?"
- "Que significa dead-letter en email?"
- "Como apago un tipo de correo sin apagar todo Resend?"
- "Que pasa cuando Resend manda bounce o complaint?"
- "In-app notification y email son lo mismo?"
- "TeamBot puede conversar?"
- "Como mando un anuncio Teams manual?"
- "Sent significa delivered?"

## Referencias de codigo y DB

- `src/lib/email/delivery.ts`
- `src/lib/notifications/notification-service.ts`
- `src/app/api/notifications/route.ts`
- `src/app/api/admin/email-deliveries/route.ts`
- `src/app/api/webhooks/resend/route.ts`
- `src/lib/integrations/teams/sender.ts`
- `src/lib/integrations/teams/bot-framework/sender.ts`
- `src/lib/integrations/teams/bot-framework/conversation-references.ts`
- `src/lib/teams-bot/**`
- `scripts/send-manual-teams-announcement.ts`
- `scripts/send-payroll-payment-teams-announcements.ts`
- `scripts/setup-postgres-notifications.sql`
- `scripts/setup-postgres-transactional-email.sql`
- `migrations/20260426220857590_create-teams-bot-conversation-references.sql`
- Tablas: `greenhouse_notifications.notifications`, `notification_preferences`, `notification_log`, `email_deliveries`, `email_subscriptions`, `greenhouse_core.teams_notification_channels`, `teams_bot_conversation_references`, `teams_bot_inbound_actions`
