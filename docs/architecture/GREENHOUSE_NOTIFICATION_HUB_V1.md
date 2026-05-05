# GREENHOUSE_NOTIFICATION_HUB_V1

> **Tipo de documento:** Spec arquitectura canónica
> **Versión:** 1.0
> **Creado:** 2026-04-26 por TASK-690 (Claude)
> **Estado:** propuesta vigente — implementación incremental TASK-690 a TASK-693
> **Specs relacionadas:** `GREENHOUSE_TEAMS_NOTIFICATIONS_V1.md` v1.1, `GREENHOUSE_TEAMS_BOT_INTERACTION_V1.md` v1.1, `GREENHOUSE_EVENT_CATALOG_V1.md`, `GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`

## 1. Propósito

Unificar las **3 superficies de notificación** que hoy viven independientes (in-app bell, email, Microsoft Teams) detrás de un solo registry de intentos + router de canales + adapters de delivery. El objetivo no es reemplazar las superficies — cada una sigue siendo dueña de su delivery — sino centralizar **quién recibe qué evento, por cuáles canales, con qué template y con qué preferencias**.

El Notification Hub es el "antes" del fan-out: una projection canónica consume el outbox, decide intentos por destinatario × canal según reglas + preferencias, y dispatcha a los adapters existentes. Cada adapter sigue siendo el dueño de su delivery (idempotencia, reintentos, métricas) — el hub es el orquestador.

## 2. Por qué (motivación)

Hoy cada evento que quiere llegar por más de una superficie requiere **3 projections paralelas**:

| Surface | Projection actual | Tabla destino |
| --- | --- | --- |
| In-app bell | `src/lib/sync/projections/notifications.ts` | `greenhouse_core.notifications` |
| Email | múltiples crons + helpers ad-hoc en `src/lib/email/` | colas + `email_log` |
| Microsoft Teams | `src/lib/sync/projections/teams-notify.ts` | `source_sync_runs` + Bot Framework Connector (TASK-671) |

Consecuencias:

1. **Duplicación de routing**. Cada projection re-implementa "qué eventos mando, a qué destinatarios, con qué severidad". El catálogo de eventos vive de facto fragmentado en 3 código bases.
2. **No hay preferencias por persona**. Si un colaborador quiere "approvals por DM en Teams en vez de email", no hay dónde declararlo. Cada surface decide sola.
3. **No hay audit unificado**. Para una pregunta tan básica como "este evento del 2026-04-25 ¿llegó al Director Financiero por algún canal?" hay que buscar en 3 tablas distintas.
4. **El loop bidireccional de Action.Submit (TASK-671) está aislado**. Cuando el handler `notification.mark_read` ejecuta una acción, solo actualiza `greenhouse_core.notifications` (in-app). La bell del portal se vacía pero el siguiente envío programado por email del mismo evento no sabe que ya fue leído → spam.
5. **Templating fragmentado**. El mismo evento "approval pendiente" tiene un Adaptive Card en `cards/finance-alert.ts`, un email MJML en otro lado, y un row JSON en `notifications`. Cambiar el wording requiere tocar 3 lugares.

## 3. Modelo de dominio

```text
[Outbox event] (greenhouse_sync.outbox_events)
    │
    ▼
[notifications projection] (canónico, una sola projection en el hub)
    │
    ├─ resolve recipients   (member_ids canónicos via Account 360 / project / business line / role)
    ├─ resolve preferences  (notification_preferences per member × kind × channel)
    ├─ render templates     (1 source per event_kind → variantes por canal)
    └─ persist intents      (notification_intents)
                                  │
                                  ▼
                    fan-out paralelo a delivery adapters
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
      [in-app adapter]      [email adapter]    [teams adapter]
       INSERT notifications    INSERT email_log   postTeamsCard()
                                                  (TASK-671 dispatcher)
                                  │
                                  ▼
                    persist deliveries   (notification_deliveries)
                                  │
                                  ▼
              cierre del loop bidireccional
              (Action.Submit / mark-read / snooze actualizan el INTENT,
               no la tabla legacy de cada surface)
```

## 4. Tablas canónicas

### `greenhouse_core.notification_intents` (NUEVA)

Una fila por evento × destinatario × superficie elegida. Es el log autoritativo de "qué se decidió enviar".

| Columna | Tipo | Notas |
| --- | --- | --- |
| `intent_id` | uuid PK | Generado por defecto. |
| `event_id` | text | Outbox event id (FK lógica a `greenhouse_sync.outbox_events`). |
| `event_type` | text | Stable kind: `finance.expense.approval_pending`, `payroll.period.calculated`, `ops.alert.raised`, etc. |
| `event_payload_json` | jsonb | Snapshot del payload relevante (no del evento crudo). Permite re-render al re-enviar. |
| `recipient_member_id` | text | Canonical 360 (`greenhouse_core.members.member_id`). NULL para deliveries no-member (canal estático). |
| `recipient_kind` | text | `member` \| `channel_static` (broadcast a canal Teams sin destinatario humano). |
| `severity` | text | `info` \| `warning` \| `critical`. |
| `domain` | text | `ops` \| `finance` \| `delivery` \| `hr` \| `people` \| `platform` (alineado con `RELIABILITY_MODULE_DOMAIN`). |
| `correlation_id` | text NULL | Para coalescing (ej. la misma alerta no dispara 3 veces si el outbox la replays). |
| `dedup_key` | text NULL UNIQUE | sha256(event_type + recipient + correlation). Bloquea duplicados al INSERT. |
| `status` | text | `pending` \| `dispatched` \| `acknowledged` \| `superseded` \| `expired`. |
| `acknowledged_at` | timestamptz NULL | Cuando el destinatario marcó leído (desde cualquier surface). |
| `acknowledged_via` | text NULL | `in_app` \| `email_link` \| `teams_action_submit`. Drives feedback back to the originating surface. |
| `expires_at` | timestamptz NULL | Para alerts que pierden valor (ej. daily pulse expira a las 24h). |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |

Índices: `(event_id)`, `(recipient_member_id, status, created_at DESC)`, `(status, created_at DESC) WHERE status IN ('pending','dispatched')`, UNIQUE `(dedup_key)`.

### `greenhouse_core.notification_deliveries` (NUEVA)

Una fila por intent × adapter ejecutado. Aquí vive la observabilidad granular ("¿llegó el email? ¿Teams devolvió 200?").

| Columna | Tipo | Notas |
| --- | --- | --- |
| `delivery_id` | uuid PK |  |
| `intent_id` | uuid FK | → `notification_intents.intent_id`. |
| `channel` | text | `in_app` \| `email` \| `teams_channel` \| `teams_dm` \| `push` (futuro). |
| `adapter_status` | text | `pending` \| `succeeded` \| `failed` \| `skipped_disabled_by_preference` \| `skipped_quiet_hours`. |
| `adapter_target` | text NULL | Identifier del target: `notifications.notification_id`, `email_log.email_id`, `teams_notification_channels.channel_code` + `teams_bot_inbound_actions.activity_id`. |
| `adapter_response_json` | jsonb NULL | Resultado del adapter (messageId, errorCode, etc.) — redactado. |
| `attempts` | integer | |
| `last_error_summary` | text NULL | Redacted (sin tokens, sin emails, sin stacks). |
| `dispatched_at` | timestamptz NULL |  |
| `succeeded_at` | timestamptz NULL |  |
| `created_at` | timestamptz |  |

Índices: `(intent_id)`, `(channel, adapter_status, created_at DESC)`, `(adapter_status, created_at DESC) WHERE adapter_status IN ('pending','failed')`.

### `greenhouse_core.notification_preferences` (NUEVA)

Preferencias granulares per member × event_kind × channel. Sustitutos de los defaults globales del catálogo.

| Columna | Tipo | Notas |
| --- | --- | --- |
| `preference_id` | uuid PK |  |
| `member_id` | text | FK lógica a `greenhouse_core.members.member_id`. |
| `event_kind` | text | Glob aceptado: `finance.expense.*`, `ops.alert.*`, `*` para "todo". |
| `channel` | text | `in_app` \| `email` \| `teams_dm` \| `teams_channel`. |
| `enabled` | boolean | `true` = habilitado, `false` = silenciado. |
| `quiet_hours_json` | jsonb NULL | `{ tz: "America/Santiago", windows: [{from: "20:00", to: "08:00"}] }`. Ignorado para severity=critical. |
| `min_severity` | text NULL | Solo entrega si severity ≥ `min_severity`. |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |

Índices: UNIQUE `(member_id, event_kind, channel)`, `(member_id)`.

Defaults: NO se persisten — viven en `notification-defaults.ts`. Una preferencia explícita gana sobre el default.

### Tablas existentes que se preservan

- `greenhouse_core.notifications` — sigue siendo el target del adapter `in_app`. El hub escribe acá vía adapter.
- `greenhouse_core.teams_notification_channels` — sigue siendo el registry del canal Teams (TASK-669/671). El adapter `teams_channel` lo lee.
- `greenhouse_core.teams_bot_inbound_actions` — el endpoint `/api/teams-bot/messaging` actualiza `notification_intents.status='acknowledged'` cuando el handler ejecuta la acción.
- `greenhouse_sync.source_sync_runs` — sigue siendo el log de ops por adapter (Teams sender ya escribe).

## 5. Componentes de código (interfaces)

### `src/lib/notifications/hub/router.ts` (NUEVO)

```ts
export interface NotificationIntent {
  intentId: string
  eventType: string
  recipientMemberId: string | null
  recipientKind: 'member' | 'channel_static'
  severity: 'info' | 'warning' | 'critical'
  domain: NotificationDomain
  payload: Record<string, unknown>
  correlationId?: string
}

export interface RoutingDecision {
  intent: NotificationIntent
  channels: NotificationChannel[]   // ej. ['in_app', 'teams_dm']
  skipped: { channel: NotificationChannel; reason: string }[]
}

export const decideChannels = (
  intent: NotificationIntent,
  preferences: NotificationPreferenceResolution
): RoutingDecision
```

Pure function, fácil de testear, sin side effects. Combina:
- `notification_kind_defaults.ts` (canales default por event_type).
- preferencias persistidas del recipient.
- quiet hours + severity gating.

### `src/lib/notifications/hub/adapters.ts` (NUEVO)

```ts
export interface DeliveryAdapter {
  channel: NotificationChannel
  deliver(intent: NotificationIntent, ctx: DeliveryContext): Promise<DeliveryOutcome>
}

// Adapters concretos:
// - InAppAdapter      → INSERT en greenhouse_core.notifications
// - EmailAdapter      → src/lib/email/sendTransactionalEmail()
// - TeamsChannelAdapter → postTeamsCard(channelCode, card) (TASK-671)
// - TeamsDmAdapter    → postTeamsCard con recipient_kind='dynamic_user'
```

Cada adapter es responsable de:
- Idempotencia per `intent_id × channel`.
- Persistir el outcome en `notification_deliveries`.
- Reintentos transitorios (heredan del transport — Teams ya hace retry con jitter, email ya tiene cola).
- Redactar errores antes de persistir.

### `src/lib/notifications/hub/templating.ts` (NUEVO)

Un solo source of truth per `event_type`:

```ts
export interface NotificationTemplate {
  eventType: string
  variants: {
    in_app:        (intent: NotificationIntent) => InAppNotificationDraft
    email:         (intent: NotificationIntent) => EmailDraft
    teams_card:    (intent: NotificationIntent) => TeamsAdaptiveCard
    teams_dm:      (intent: NotificationIntent) => TeamsAdaptiveCard
  }
}

export const registerTemplate = (template: NotificationTemplate): void
```

Patrón clonado de `src/lib/sync/projection-registry.ts`. Cada template archivo se auto-registra al ser importado.

### `src/lib/sync/projections/notifications.ts` (REWRITE)

Reemplaza la projection actual. Consume eventos del outbox, los pasa por el router + adapters, persiste intents + deliveries.

## 6. Sinergia con TASK-671 (Teams Bot)

El bot ya provee dos pieces que el hub aprovecha:

1. **DM 1:1 con `recipient_kind='dynamic_user'`** + `recipient_routing_rule_json: { from: 'payload.assigneeMemberId' }`. El hub usa esto cuando el `RoutingDecision.channels` incluye `teams_dm`: define un canal "phantom" `teams-bot-dm` con esa rule, el dispatcher resuelve el member al runtime y postea.

2. **Action.Submit handlers** vía `/api/teams-bot/messaging` y `action-registry.ts`. El handler `notification.mark_read` ya existe pero hoy es no-op. Refactor: cuando llega un Action.Submit con `actionId='notification.mark_read'` y `data.intentId`, el handler hace:

```ts
UPDATE greenhouse_core.notification_intents
   SET status='acknowledged', acknowledged_at=now(), acknowledged_via='teams_action_submit'
 WHERE intent_id = $1 AND recipient_member_id = $2;
```

Esto cierra el loop: el row de `notifications` (in-app) muestra checkmark, el follow-up email programado lo skipea, los próximos sends del mismo evento al mismo member ven `status='acknowledged'` y no se disparan de nuevo.

Análogamente, `ops.alert.snooze` actualiza `notification_intents` con `status='superseded'` + un row paralelo en `notification_snoozes` (futuro) que el router consulta antes de dispatchar el siguiente evento del mismo `correlation_id`.

## 7. Sinergia con Reliability Control Plane

El hub publica un nuevo módulo `'notifications.hub'` en `RELIABILITY_REGISTRY` con `incidentDomainTag='notifications.hub'`. Signals esperados:

- `subsystem` — counts de intents/deliveries succeeded/failed/skipped en 24h.
- `data_quality` — counts de intents `pending` viejos (> 5min — backlog).
- `freshness` — last_dispatched_at por adapter (alerta si email/Teams se quedó silencioso por > 1h con eventos pendientes).
- `incident` — `captureWithDomain(err, 'notifications.hub', ...)` cuando un adapter explota.

Admin Ops Health gana un tile "Notification Hub" con breakdown por adapter (in-app `123`, email `45`, teams `67`) — analogous al breakdown que TASK-671 ya añadió para Teams.

## 8. Casos de uso piloto (Fase 4 del plan)

Demuestran el valor sin romper nada:

| Caso | Hoy | Con el hub |
| --- | --- | --- |
| Approval gasto Finance | Email + nadie en Teams | Email + Teams DM al approver con `Action.Submit` "Aprobar / Rechazar". Click → handler ejecuta + cierra el loop en in-app + email follow-up se skipea. |
| Daily pulse | Solo `delivery-pulse` channel | Channel + DM 1:1 a managers con `min_severity='warning'` configurado. |
| Payroll periodo calculado | Solo email al colaborador | Email + DM. Si el colaborador silencia `payroll.*` en email pero deja Teams DM ON, solo llega DM. |
| Alerta crítica ops | Solo `ops-alerts` channel | Channel + email a oncall + Teams DM con `Action.Submit` "Snooze 24h". Snooze actualiza el intent → próxima vez el router lo skipea para esos members. |
| Sentry issue asignado | Email | DM al asignado con `Action.Submit` "Take over / Snooze". |
| Notification mark-read en Teams | No existe | Click en card → handler actualiza el intent → bell del portal se vacía sincrónicamente. |

## 9. Fases de implementación (incremental, no big-bang)

Cada fase es ≤ 2 semanas y no rompe lo existente. Migración inversa: el flow viejo sigue funcionando hasta que la nueva projection lo reemplaza.

### Fase 1 — Foundations sin breakage (TASK-690, esta task)

- Crear las 3 tablas (intents, deliveries, preferences) con migrations.
- Crear el `router.ts` (pure function) + tests.
- Crear los 3 adapters wrappeando el código existente — sin cambiar emisores.
- Crear el contract spec (este doc) + diagrama del flujo.
- Reliability registry: agregar módulo `'notifications.hub'` con `expectedSignalKinds=['subsystem','freshness','incident']` (kill-switch para no contar nada hasta que la projection corra).

### Fase 2 — Sombra (TASK-691)

- La projection actual `notifications.ts` sigue dueña del INSERT en `notifications`. En paralelo, escribe el `intent_id` + `delivery` en las tablas nuevas (modo "tee").
- Comparar shadow vs real durante 1 semana. Métricas: counts diarios, recipient parity, latencia.
- Action.Submit `mark-read` empieza a actualizar AMBOS (intent + notifications) para verificar que el dual-write funciona.

### Fase 3 — Cutover (TASK-692)

- Invertir el flow: la projection escribe primero el intent, luego dispatcha al adapter (que sigue insertando en `notifications`).
- Email + Teams projections viejas se borran. Solo queda la projection canónica del hub.
- `notification_preferences` empieza a impactar el routing.

### Fase 4 — Bidireccional + UI (TASK-693)

- Casos piloto del §8.
- UI de preferences en `/settings/notifications` (Vuexy primitives). Guarda en `notification_preferences`.
- Templating unificado por `event_type` con variantes para los 3 surfaces.
- `Action.Submit` handlers cierran el loop: mark-read, snooze, approve.

## 10. Reglas duras

- **NO** crear projections de notificación nuevas fuera del hub. Cualquier evento que quiera notificar va por la projection canónica.
- **NO** insertar directo en `greenhouse_core.notifications` desde código de dominio — pasa por el adapter `in_app` del hub.
- **NO** llamar `postTeamsCard()` directo desde código de dominio una vez que el hub esté en Fase 3. Solo el adapter `teams_channel` / `teams_dm` lo hace.
- **NO** loggear `event_payload_json` en claro a observabilidad. Pasa por `redactSensitive` antes de surfacear.
- **NO** romper la idempotencia: el `dedup_key` UNIQUE bloquea duplicados al INSERT. Si surge un duplicado real, el caller debe usar un nuevo `correlation_id`.
- **Sí** mantener el adapter de Teams compatible con TASK-671 (Connector + cache de conv refs + circuit breaker). El hub no rescribe ese transport — solo lo invoca.
- **Sí** publicar `notification.intent.dispatched` y `notification.intent.acknowledged` al outbox para que el reliability registry y futuros consumers reaccionen.

## 11. Out of scope V1

- Push notifications (mobile, web push). Adapter futuro cuando Greenhouse tenga app o PWA con permission.
- Aggregation / digest (ej. "1 email diario con todos los approvals"). El hub V1 dispatcha 1 intent → N deliveries; aggregation requiere un jobber separado.
- AI-assisted prioritization (el agente decide cuál evento mandar primero). Dejar para una iteración con Reliability AI Observer.
- Multi-tenant externo (clientes Globe). Hoy el hub vive en el tenant interno; multi-tenant es follow-up cuando exista demanda.

## 13. Mentions y notificaciones push

El bot **puede** arrobar usuarios y/o el canal entero. La mención dispara el ping push real (notification + badge) — sin ella, un card en un canal queda silencioso para el destinatario que no está mirando ese tab. Es la palanca clave para que approvals lleguen "en vivo" sin que el approver tenga que abrir el portal.

### Reglas verificadas (público commercial cloud, Bot Framework Connector)

1. **Mentions a nivel del Activity body**: el `text` del activity contiene `<at>Display Name</at>` y el activity declara `entities[]` con tipo `mention`. El `mentioned.id` **debe** ser `"29:<aadObjectId>"` — el prefijo `29:` es obligatorio. Sin él, Teams renderiza el `<at>` como texto plano sin notification.

   ```jsonc
   {
     "activity": {
       "type": "message",
       "text": "Hola <at>Julio Reyes</at>, hay un gasto pendiente.",
       "textFormat": "xml",
       "entities": [
         {
           "type": "mention",
           "text": "<at>Julio Reyes</at>",
           "mentioned": { "id": "29:<aadObjectId>", "name": "Julio Reyes" }
         }
       ],
       "attachments": [{ "contentType": "application/vnd.microsoft.card.adaptive", "content": <card> }]
     }
   }
   ```

2. **`text` y `<at>` tag deben coincidir exactamente** (mismo string entre `<at>...</at>`, whitespace incluido). Mismatch silencia la mention.

3. **`textFormat: "xml"`** (o `"plain"`, NO `"markdown"`). Sin esto Teams puede escapar el `<at>` y mostrar el literal.

4. **Mentions dentro de Adaptive Cards** usan un canal distinto: el card declara `msteams.entities` y el `TextBlock` contiene el mismo `<at>` tag.

   ```jsonc
   {
     "type": "AdaptiveCard", "version": "1.5",
     "body": [{ "type": "TextBlock", "text": "Aprobado por <at>Julio Reyes</at>" }],
     "msteams": {
       "entities": [
         { "type": "mention", "text": "<at>Julio Reyes</at>",
           "mentioned": { "id": "29:<aadObjectId>", "name": "Julio Reyes" } }
       ]
     }
   }
   ```

5. **El bot NO puede mencionar usuarios fuera del team/chat** donde está posteando. Si el `aadObjectId` no es miembro, Teams renderiza el `<at>` como texto plano. El Hub debe validar membership o aceptar que la mention puede caer silenciosa.

6. **DM 1:1 no necesita `<at>`** — Teams ya pinguea al destinatario por el solo hecho de ser un mensaje directo.

7. **Channel-wide mention** (al canal entero como "@channel"): `mentioned.id = "<channelId>"`, `mentioned.name = "<channelDisplayName>"`. Algunos tenants lo deshabilitan a nivel team (Settings → @mentions). Si no funciona en un team específico, no es bug del bot — es config del team owner.

8. **Activity feed notification (la campana)** es un canal complementario: vía RSC `TeamsActivity.Send.Group` (ya consentida en TASK-671), endpoint `POST {serviceUrl}/v3/conversations/{convId}/activities` con `activityType: 'taskCreated'` (o uno custom). Útil cuando NO quieres escribir mensaje en el canal pero sí avisar al usuario en su feed.

### Diseño en el Hub

`NotificationTemplate.variants.teams_card` y `variants.teams_dm` ganan un retorno enriquecido:

```ts
export interface TeamsTemplateOutput {
  card: TeamsAdaptiveCard
  /** Mentions a renderizar en el text del activity body (precede al card). Vacío si solo es card-only. */
  mentions?: Array<{ aadObjectId: string; displayName: string }>
  /** Plantilla del text con `{N}` placeholders por mention. Ej: "Hola {0}, gasto pendiente." */
  textTemplate?: string
  /** Si true, agrega activity feed notification además del mensaje. Default: false. */
  alsoActivityFeed?: boolean
}
```

El adapter `teams-channel.ts` / `teams-dm.ts` construye el activity body:
- Si `mentions` está vacío y no hay `textTemplate`, el body queda solo con `attachments` (comportamiento actual de TASK-671).
- Si hay mentions, sustituye `{N}` por `<at>{displayName}</at>` y construye el `entities[]` con `id: "29:" + aadObjectId`.
- Si `alsoActivityFeed=true`, después del POST a conversations, hace POST adicional al endpoint de activities con `TeamsActivity.Send.Group`.

### Resolución del aadObjectId desde el intent

**No llamar Graph de nuevo.** El Hub ya tiene `recipient_member_id` en el intent. Reusar `resolveTeamsUserForMember(memberId)` de TASK-671 (`src/lib/integrations/teams/recipient-resolver.ts`) — devuelve `{ aadObjectId, source, email }` con la cascada `members.teams_user_id` → `client_users.microsoft_oid` → email lookup. Hot path: el primer source es directo de PG sin Graph hit.

Para mentions de **terceros** dentro del card (ej. "asignado a <at>otro miembro</at>"), el template recibe los memberIds adicionales en `intent.event_payload_json.mentionedMemberIds[]`, los resuelve uno por uno con el mismo helper, y los mete en `mentions[]`. El emisor del evento es responsable de poblar la lista.

### Casos de uso piloto que lo aprovechan

| Caso | Mentions | Por qué |
| --- | --- | --- |
| Approval gasto Finance | `<at>approver</at>` en card al canal | Sin mention el approver no se entera; con mention recibe push y abre el card en segundos |
| Daily pulse con anomalías | `<at>scope_owner</at>` por anomalía | El pulse es read-mostly; menciones puntúan los items que requieren acción |
| Sentry issue asignado | `<at>assignee</at>` en card al canal de delivery | Pinguea sin necesidad de DM separado |
| Snooze ejecutado por X | `<at>X</at>` en update card | El equipo ve quién silenció y puede revertir |
| Aprobado/rechazado | Update con `<at>actor</at>` en feedback card | Cierre del loop visible para todo el canal |

### Reglas duras de mentions

- **Validar membership antes de mention**: el adapter debe consultar `permissionGrants` del team o tabla `members` con `teams_user_id` antes de incluir la mention. Si el usuario no es miembro, drop la mention y postea sin ella (logueado como `mention_dropped_not_in_team` en `notification_deliveries.adapter_response_json`).
- **Mention al canal entero** solo si `severity ∈ {critical, warning}` y la preference `disable_channel_wide_mentions` no está activa para ese channel_code. Default: deshabilitado para `delivery-pulse` (es ruidoso), habilitado para `ops-alerts` (es exigible).
- **No abusar de mentions**: si el mismo intent tiene `severity=info` y un mention, drop el mention. Mentions son para acción requerida, no para informar.
- **Al-mismo-actor mention en update cards**: si el `actor` que ejecutó el Action.Submit es el mismo que ya está leyendo, NO mention en el update card (sería redundante y molesto).

### Acceptance pendiente

- TASK-690: extender la interfaz `NotificationTemplate.variants.teams_*` para devolver `TeamsTemplateOutput` (no solo card). Adapter teams-channel/teams-dm parsea el output y construye el activity. Tests: validar `entities[].mentioned.id` empieza con `29:`, `text` matches `<at>` tag exactly, mismatch surface as warning.
- TASK-693: implementar `mentionedMemberIds` en los 6 event types prioritarios + UI preferences gain `disable_channel_wide_mentions` per channel.

## 11.5. Open Questions V2+ (declaradas tras auditoría arch-architect 2026-05-05)

5 issues identificados que NO bloquean V1 ni V1.5 (TASK-694) pero deben resolverse antes de V2 al escalar el Hub. Declarados explícitamente para evitar que se escondan como deuda técnica silenciosa.

### Open Q V2-1 — Email bounce handling y SPF/DKIM/DMARC alignment

V1 wrappea `sendEmail` sin tratar bounces ni hard delivery failures explícitamente. Riesgos no resueltos:

- **Bounces**: email rebotó (address inválido, mailbox full). ¿Se persiste en `notification_deliveries.adapter_status='bounced'`? ¿Auto-retry?
- **Spam marking** del provider del recipient (Outlook/Gmail/etc.) no es observable hoy.
- **SPF/DKIM/DMARC alignment**: ¿los emails del Hub pasan por el mismo dominio de envío que `sendEmail` actual? Mal alignment = silenciosamente droppeados.

**Propuesta V2**:

- Mapping `provider.bounce_event` → `adapter_status='bounced'` con `error_code` específico.
- Auto-suspension de email channel para users con > 3 bounces consecutivos (cambio a Teams/in-app fallback automático).
- Reliability signal `notifications.hub.email_bounce_rate` (warning si > 5% trailing 7d).
- Doc explícito SPF/DKIM/DMARC setup heredado del transport.

**Trigger para V2**: cuando email volume > 1000/día o cuando primer incidente real de bounces silenciosos surja.

### Open Q V2-2 — Throughput limits del transport Teams

Bot Framework Connector tiene rate limits oficiales de Microsoft (~1800 req/min per bot). Si el Hub bursts más (ej. payroll period close emite 200 notifications en 30s), Microsoft empieza a 429.

**Propuesta V2**:

- Token bucket interno en `teams-channel.ts` y `teams-dm.ts` con cap < limit Microsoft.
- Reliability signal `notifications.hub.teams_rate_limit_hit` (steady=0).
- Documentar el rate limit upstream en spec §6.
- Considerar batch mode si Microsoft expone API de bulk (verificar docs Bot Framework).

**Trigger para V2**: cuando 1er 429 real de Teams se observe en `notification_deliveries.adapter_response_json`, o cuando volume estimado > 500 Teams DMs/min.

### Open Q V2-3 — Template versioning explícito

Hoy si cambia el copy de un template, los users que ya recibieron el viejo y los nuevos ven copy distinto. Sin tracking, no hay reproducibilidad ni rollback de templates.

**Propuesta V2**:

- `notification_intents.template_version` (string) persiste qué versión se usó al dispatch.
- Templates declarados con `version: 1`, `version: 2`, etc.
- Helper `resolveTemplate(eventType, version?)` con default a la última versión + override per-test.
- Reliability signal `notifications.hub.template_version_drift` (detecta cuando dispatches activos usan template_versions distintas para el mismo event_type — indica rollout incompleto).

**Trigger para V2**: cuando primera revisión real de copy ocurra y operadores quieran rollback automático.

### Open Q V2-4 — i18n / multi-language support

Hoy users de Greenhouse son chilenos (es-CL). Pero los Globe clients (Sky, etc.) son multinacionales — mañana un cliente Globe alemán recibe notificaciones en español por default.

**Propuesta V2**:

- Per-template `variants[locale]` en lugar de variant único (`variants.in_app['es-CL']`, `variants.in_app['en-US']`).
- `members.preferred_locale` columna (si no existe) o `notification_preferences.locale`.
- Default fallback: locale del template → `es-CL` → `en-US`.
- Considerar i18n library (`next-intl`, `react-intl`, `i18next`) — alineación con el resto del portal.

**Trigger para V2**: cuando primer cliente Globe non-Spanish-speaking sea onboarded como tenant del portal (no solo del bridge HubSpot).

### Open Q V2-5 — Action.Submit security nivel 2 (anti-replay + JWT validation explícito)

V1 valida `recipient_member_id = principal.memberId` (anti-spoofing básico). Pero gaps no resueltos:

- ¿Validación explícita de JWT signature + expiry en `handlers/notification-mark-read.ts`? V1 lo asume del Bot Framework SDK.
- **Replay attacks**: un Action.Submit puede ser capturado por proxy y re-enviado. Hoy no hay nonce.
- **Rate limit per (memberId, action_type)** para prevenir replay storms (mismo user clickeando 100x "approve" — bug o ataque).
- Pentest mínimo del flow Action.Submit nunca se ejecutó.

**Propuesta V2**:

- Validación explícita JWT signature + expiry con assertion + audit log si fail.
- Nonce + timestamp en cada Action.Submit (idempotency key derivada — replay ataca un nonce ya consumido).
- Rate limit `platform.notifications.hub.action_submit` per (memberId, action_type) con backoff.
- Test de seguridad explícito en backlog separado (TASK-696 candidate).

**Trigger para V2**: cuando primer pentest formal se programe, o cuando un Action.Submit muta state crítico ($ amounts, role grants, etc.).

### Cómo se actualiza esta sección

Cada Open Q se mueve a "Resuelto" con TASK-### asignada cuando el trigger condition se materialice. NO se borran históricamente — si una Q se descarta (ej. multi-language deferral indefinido), se marca `STATUS: deferido por <razón>` con fecha y autor. Audit trail de decisiones.

## 12. Referencias

- Código (Fase 1, a crear en TASK-690):
  - `migrations/<ts>_create-notification-hub-tables.sql`
  - `src/lib/notifications/hub/router.ts`
  - `src/lib/notifications/hub/adapters/{in-app,email,teams-channel,teams-dm}.ts`
  - `src/lib/notifications/hub/templating.ts`
  - `src/lib/sync/projections/notifications-v2.ts` (rewrite, Fase 3)
- Specs:
  - `GREENHOUSE_TEAMS_NOTIFICATIONS_V1.md` v1.1 (transport)
  - `GREENHOUSE_TEAMS_BOT_INTERACTION_V1.md` v1.1 (interactividad)
  - `GREENHOUSE_EVENT_CATALOG_V1.md` (eventos canónicos)
  - `GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` (patrón de projection)
- Tasks derivadas:
  - TASK-690 — Notification Hub Architecture Contract (esta spec).
  - TASK-691 — Notification Hub Shadow Mode (dual-write).
  - TASK-692 — Notification Hub Cutover.
  - TASK-693 — Notification Hub Bidirectional + UI Preferences.
