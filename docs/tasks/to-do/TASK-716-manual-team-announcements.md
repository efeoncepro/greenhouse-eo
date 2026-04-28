# TASK-716 — Manual Team Announcements

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-690`
- Branch: `task/TASK-716-manual-team-announcements`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Crear una superficie de Greenhouse para redactar, previsualizar, aprobar y enviar comunicaciones manuales al equipo por Microsoft Teams usando el bot Greenhouse/Nexa. El humano decide contenido, destino, momento y mención; el sistema automatiza validación, auditoría, idempotencia, dispatch, retries, estado de entrega y observabilidad.

El MVP apunta a `EO Team` como canal `teams_bot` de group chat, con soporte explícito para `@todos` y con diseño preparado para crecer a múltiples canales, audiencias, plantillas, programación y Notification Hub.

## Why This Task Exists

El smoke del 2026-04-28 confirmó que Greenhouse ya puede publicar en el chat grupal `EO Team` desde el Bot Framework como remitente `Greenhouse`. El mensaje de prueba de Nexa funcionó y el transcript de Teams lo mostró como `[Greenhouse]`.

Ese aprendizaje desbloquea una capacidad operativa clara: que Admin/Nexa pueda iniciar comunicaciones generales desde Greenhouse sin depender de un humano copiando texto en Teams. El riesgo es que una implementación ingenua sea solo un textbox que postea al chat, sin permisos finos, sin confirmación de `@todos`, sin historial ni control de duplicados. Esta task formaliza la capacidad como una superficie institucional robusta y escalable.

## Goal

- Crear una UI de comunicaciones manuales para `EO Team` con composer, preview, confirmación y historial.
- Modelar el flujo como `manual request -> intent/outbox -> delivery adapter`, no como POST directo bloqueante desde la UI.
- Separar explícitamente qué queda manual y qué queda automatizado.
- Soportar `@todos` de forma controlada, auditable y verificable.
- Registrar permisos en ambos planos: `views` para la surface visible y `entitlements` para publicar/aprobar/administrar.
- Converger con `Notification Hub` y `Teams Bot` sin crear un canal paralelo difícil de retirar.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_TEAMS_NOTIFICATIONS_V1.md`
- `docs/architecture/GREENHOUSE_TEAMS_BOT_INTERACTION_V1.md`
- `docs/architecture/GREENHOUSE_NOTIFICATION_HUB_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_DEEP_LINK_PLATFORM_V1.md`

Reglas obligatorias:

- La UI no hace dispatch directo a Teams. Debe crear una solicitud/intento idempotente y dejar que backend/projection/adapter entregue.
- `postTeamsCard()` o el Bot Framework directo solo viven en adapters o sender shared, no dentro de componentes UI ni código de dominio.
- La feature debe declarar ambos planos de acceso:
  - `views` / `authorizedViews` / `view_code`: `administracion.communications` para la surface visible.
  - `entitlements` / `capabilities`: `admin.communications` con acciones `read`, `create`, `approve`, `manage` y scope `all`.
- `routeGroups`: usar `admin` como carril broad. No crear un route group nuevo.
- `startup policy`: no cambia.
- Todo envío debe tener audit trail: autor, aprobador si aplica, canal, texto, modo de mención, idempotency key, correlation id, Teams activity id, estado final y error redactado.
- `@todos` requiere protección adicional: preview, confirmación explícita y política de aprobación/configuración por canal.
- No loggear secretos, tokens ni payloads potencialmente sensibles sin pasar por redacción.
- Si la implementación extiende `teams_notification_channels`, debe preservar `provisioning_status` y los patrones de `pending_setup` / `configured_but_failing`.

## Normative Docs

- `docs/tasks/to-do/TASK-690-notification-hub-architecture-contract.md`
- `docs/tasks/to-do/TASK-691-notification-hub-shadow-mode.md`
- `docs/tasks/to-do/TASK-692-notification-hub-cutover.md`
- `docs/tasks/to-do/TASK-693-notification-hub-bidirectional-ui.md`
- `docs/operations/azure-teams-bot.md`
- `docs/operations/RELEASE_CHANNELS_OPERATING_MODEL_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-690` — Notification Hub foundation. Esta task debe usar `notification_intents` / `notification_deliveries` cuando existan. Si el agente decide desbloquearla antes de TASK-690, debe documentar en Plan Mode un mini-slice equivalente que no contradiga `GREENHOUSE_NOTIFICATION_HUB_V1.md`.
- `TASK-671` — Greenhouse Teams Bot Platform. El dispatcher Bot Framework ya soporta `recipient_kind='chat_group'`, conversation reference cache, retries y `source_sync_runs`.
- `greenhouse_core.teams_notification_channels` — registry canónico de canales Teams.
- `src/lib/integrations/teams/bot-framework/connector-client.ts` — transporte Bot Framework.
- `src/lib/integrations/teams/bot-framework/sender.ts` — dispatch por `recipient_kind`.
- `src/lib/integrations/teams/sender.ts` — API `postTeamsCard(channelCode, card, options)`.
- `src/app/api/admin/teams/test/route.ts` — endpoint de smoke existente; no debe convertirse en la feature final.
- `src/config/entitlements-catalog.ts` — catálogo code-versioned de capabilities.
- `src/lib/admin/view-access-catalog.ts` — registry de views visibles.

### Blocks / Impacts

- `TASK-691` / `TASK-692` — debe ser compatible con shadow/cutover del Notification Hub.
- `TASK-693` — preferencias UI y bidireccionalidad deben reconocer que manual announcements son una categoría distinta de alertas automáticas.
- `integrations.teams` en Reliability Control Plane — debe sumar señales de manual announcements sin contaminar los health checks de canales automáticos.
- Admin Center navigation y access governance.
- Documentación funcional de plataforma/comunicaciones.

### Files owned

- `migrations/*manual-announcements*.sql`
- `src/config/entitlements-catalog.ts`
- `src/lib/admin/view-access-catalog.ts`
- `src/config/greenhouse-nomenclature.ts`
- `src/app/(dashboard)/admin/communications/page.tsx`
- `src/views/greenhouse/admin/AdminCommunicationsView.tsx`
- `src/app/api/admin/communications/route.ts`
- `src/app/api/admin/communications/[announcementId]/preview/route.ts`
- `src/app/api/admin/communications/[announcementId]/approve/route.ts`
- `src/app/api/admin/communications/[announcementId]/publish/route.ts`
- `src/lib/communications/manual-announcements.ts`
- `src/lib/communications/manual-announcements.test.ts`
- `src/lib/integrations/teams/bot-framework/connector-client.ts`
- `src/lib/integrations/teams/bot-framework/sender.ts`
- `src/lib/integrations/teams/types.ts`
- `src/lib/notifications/hub/**`
- `src/lib/reliability/registry.ts`
- `src/lib/operations/get-operations-overview.ts`
- `docs/documentation/plataforma/manual-communications.md`

## Current Repo State

### Already exists

- Teams Bot transport operativo:
  - `src/lib/integrations/teams/bot-framework/connector-client.ts`
  - `src/lib/integrations/teams/bot-framework/sender.ts`
  - `src/lib/integrations/teams/sender.ts`
- Registry de canales Teams:
  - `greenhouse_core.teams_notification_channels`
  - `channel_kind='teams_bot'`
  - `recipient_kind='channel' | 'chat_1on1' | 'chat_group' | 'dynamic_user'`
- Endpoint de prueba admin:
  - `POST /api/admin/teams/test`
- Arquitectura Notification Hub:
  - `docs/architecture/GREENHOUSE_NOTIFICATION_HUB_V1.md`
  - `TASK-690` a `TASK-693`
- Admin access patterns:
  - `src/config/entitlements-catalog.ts`
  - `src/lib/admin/view-access-catalog.ts`
  - `requireAdminTenantContext()`

### Gap

- No existe una surface para comunicaciones manuales.
- No existe un canal registry de anuncios manuales para `EO Team`.
- El sender actual postea Adaptive Cards; no tiene un contrato formal para mensajes de texto con menciones reales (`@todos`) en group chat.
- No hay flujo de draft/approval/publish para mensajes institucionales.
- No hay audit trail específico para comunicaciones manuales.
- No hay rate limiting/cooldown ni política de doble confirmación para menciones amplias.
- No hay historial de publicaciones ni estado de entrega visible para el operador.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Access Model + Channel Registry

- Agregar view visible:
  - `view_code='administracion.communications'`
  - route `/admin/communications`
  - `routeGroup='admin'`
  - label sugerido: `Comunicaciones`
- Agregar capability:
  - `key='admin.communications'`
  - `module='admin'`
  - `actions=['read','create','approve','manage']`
  - `defaultScope='all'`
- Definir si `administracion.notifications` enlaza hacia esta nueva surface o queda como overview técnico separado.
- Seed/configurar el canal `eo-team-announcements` en `greenhouse_core.teams_notification_channels`:
  - `channel_kind='teams_bot'`
  - `recipient_kind='chat_group'`
  - `recipient_chat_id` del chat `EO Team`
  - `secret_ref='greenhouse-teams-bot-client-credentials'`
  - `provisioning_status='ready'`
  - `display_name='EO Team Announcements'`
- Añadir metadata de gobierno para canales manuales. Opción preferida:
  - extender `teams_notification_channels` con columnas aditivas:
    - `manual_send_enabled boolean default false`
    - `manual_send_policy text` (`self_publish` | `four_eyes_for_broadcast` | `four_eyes_always` | `disabled`)
    - `allowed_mention_modes text[]` o jsonb equivalente
    - `owner_domain text`
  - si el agente decide otra tabla, debe justificar por qué no duplica registry.

### Slice 2 — Manual Announcement Domain Model

- Crear tabla mínima de workflow manual si `TASK-690` ya existe:
  - `greenhouse_core.manual_announcement_requests`
  - columnas:
    - `announcement_id uuid/text PK`
    - `channel_code text`
    - `author_user_id text`
    - `approver_user_id text NULL`
    - `status text` (`draft` | `pending_approval` | `queued` | `sent` | `failed` | `cancelled`)
    - `message_plaintext text`
    - `mention_mode text` (`none` | `everyone_in_chat` | `channel`)
    - `preview_json jsonb`
    - `idempotency_key text UNIQUE`
    - `correlation_id text`
    - `notification_intent_id uuid/text NULL`
    - `teams_activity_id text NULL`
    - `delivery_status text NULL`
    - `last_error_summary text NULL`
    - `created_at`, `updated_at`, `queued_at`, `sent_at`
- Delivery state debe vivir preferentemente en `notification_deliveries` cuando `TASK-690` esté disponible.
- Si `TASK-690` sigue pendiente y se desbloquea esta task, crear un adapter temporal explícitamente migrable hacia `notification_intents` / `notification_deliveries`, con nota de deuda en `Handoff.md`.
- Crear outbox event canónico:
  - `communications.manual_announcement.requested`
  - payload sin secretos y con `announcementId`, `channelCode`, `mentionMode`, `authorUserId`.

### Slice 3 — Teams Text + Mention Adapter

- Extender el Bot Framework Connector para soportar actividad textual además de Adaptive Card:
  - `postChatTextMessage({ chatId, text, entities, textFormat })`
  - `postChannelTextMessage({ channelId, teamId, text, entities, textFormat })`
- Agregar contrato tipado:
  - `TeamsMentionMode = 'none' | 'everyone_in_chat' | 'channel'`
  - `TeamsTextActivity`
  - `TeamsMentionEntity`
- Implementar `@todos` para group chat basado en el aprendizaje verificado:
  - `text` contiene `<at>todos</at>`
  - `textFormat='xml'`
  - `entities[].type='mention'`
  - `entities[].text='<at>todos</at>'`
  - `entities[].mentioned.name='todos'`
  - `entities[].mentioned.id` usa el `chatId` del group chat cuando `mention_mode='everyone_in_chat'`
- Mantener fallback explícito:
  - si Teams devuelve 2xx pero no se puede confirmar mención real desde API, el historial debe marcar `mentionVerification='unverified'`, no prometer push.
  - si el tenant deshabilita group/channel mentions, registrar `configured_but_failing` o error claro según corresponda.
- Tests unitarios con fetch mock validando body exacto de la actividad, sin exponer token.

### Slice 4 — Backend API

- `GET /api/admin/communications`:
  - lista canales manuales permitidos, requests recientes, counts por estado.
  - requiere `admin.communications:read`.
- `POST /api/admin/communications`:
  - crea draft o queued request.
  - valida `channelCode`, `message_plaintext`, `mention_mode`, longitud, secret patterns, permisos y política de canal.
  - requiere `admin.communications:create`.
- `POST /api/admin/communications/[announcementId]/preview`:
  - renderiza preview estable, no envía.
- `POST /api/admin/communications/[announcementId]/approve`:
  - aprueba si la política exige four-eyes.
  - requiere `admin.communications:approve`.
  - no permite que `approver_user_id === author_user_id` cuando la política es four-eyes.
- `POST /api/admin/communications/[announcementId]/publish`:
  - mueve a `queued` o emite outbox event idempotente.
  - nunca hace doble envío si el request se repite con misma idempotency key.
- Reusar `requireAdminTenantContext()` y el runtime de entitlements. No confiar solo en route group.

### Slice 5 — Dispatcher / Hub Adapter

- Agregar adapter `manual_announcement -> teams_channel/chat` en `src/lib/notifications/hub/**` si `TASK-690` ya existe.
- Si no existe hub runtime:
  - crear projection pequeña y explícita bajo dominio `notifications` o `integrations.teams`, con deuda de convergencia documentada.
  - mantener los mismos nombres de evento/intent para migrar sin cambio de UI.
- Dispatch automatizado:
  - lee `queued` requests.
  - resuelve canal desde registry.
  - arma actividad Teams.
  - envía con retries/backoff del sender.
  - guarda `teams_activity_id`, `delivery_status`, `last_error_summary`.
  - escribe `source_sync_runs` con `source_system='teams_notification'`, `sync_mode='manual'`, `triggered_by='admin:<userId>'`.
- Incluir job/retry path para requests `failed` retryables.

### Slice 6 — Admin UI

- Crear `/admin/communications`.
- UI principal:
  - Composer con selector de canal.
  - Campo de mensaje.
  - Segment control de mención: `Sin mención` / `@todos`.
  - Preview del mensaje como lo verá Teams.
  - Estado del canal (`ready`, `pending_setup`, `configured_but_failing`, `disabled`).
  - Confirmación explícita para `@todos`.
  - Botón `Guardar borrador`, `Enviar prueba` si aplica, `Publicar`.
  - Si la política requiere aprobación: `Enviar a aprobación` y sección de aprobación.
- Historial:
  - autor, canal, fecha, estado, mention mode, activity id, error resumido.
  - filtros por estado/canal/autor.
  - botón retry solo para usuarios con `admin.communications:manage`.
- UX:
  - no usar hero/landing.
  - layout de herramienta operativa densa y escaneable.
  - no ocultar fallas técnicas detrás de toasts genéricos.
  - `aria-live` para cambio de estado de envío.

### Slice 7 — Safety, Rate Limits, Audit

- Rate limits:
  - máximo configurable por usuario/canal por ventana.
  - cooldown separado para `@todos`.
  - bloqueo de doble click/retry mediante idempotency key.
- Validaciones:
  - longitud máxima de mensaje.
  - sanitización de HTML.
  - detección básica de secretos/tokens (`Bearer`, `sk_`, JWT, GCP secret refs, passwords).
  - advertencia si el mensaje contiene links sin `https://`.
- Audit:
  - todas las transiciones de estado quedan registradas.
  - publicar/cancelar/aprobar/reintentar son acciones separadas.
  - errores técnicos se redactan.
- Policy:
  - `@todos` debe exigir doble confirmación en UI.
  - canales con `manual_send_policy='four_eyes_for_broadcast'` requieren aprobación para `mention_mode!='none'`.

### Slice 8 — Observability + Docs

- Reliability/Ops:
  - sumar métricas de manual announcements en `integrations.teams` o `notifications.hub`, según el estado de TASK-690.
  - últimos envíos manuales, fallas 24h, canales manuales no ready, backlog queued.
- Documentación funcional:
  - `docs/documentation/plataforma/manual-communications.md`
  - explicar qué es manual, qué se automatiza, quién puede enviar y cómo se audita.
- Documentación operativa:
  - actualizar `docs/operations/azure-teams-bot.md` con nota de `@todos` en group chat y smoke esperado.
- Changelog:
  - actualizar `changelog.md` cuando la feature cambie comportamiento real.
  - evaluar `docs/changelog/CLIENT_CHANGELOG.md` solo si se expone fuera del equipo interno Efeonce.

## Out of Scope

- Conversación natural de Nexa dentro de Teams.
- Mensajes a clientes externos o tenants de clientes.
- Segmentación por personas/roles más allá de `EO Team` en el MVP.
- Programación compleja de campañas o calendario editorial.
- Push mobile/web.
- Sustituir todos los eventos automáticos de Notification Hub.
- Crear plantillas comerciales/client-facing.
- Enviar archivos o imágenes.

## Detailed Spec

### Manual vs Automatizado

Debe quedar así:

| Etapa | Manual | Automatizado |
| --- | --- | --- |
| Elección de destino | El operador elige canal permitido | Sistema filtra canales por permisos, estado y policy |
| Redacción | El operador escribe el mensaje | Sistema valida longitud, sanitiza y detecta secretos obvios |
| Mención | El operador decide `none` o `@todos` | Sistema aplica confirmación, policy, entidad Teams correcta |
| Preview | El operador revisa | Sistema renderiza shape final y muestra riesgos |
| Aprobación | Humano aprueba si policy lo exige | Sistema bloquea self-approval cuando corresponde |
| Publicación | Humano confirma publicar | Sistema crea intent/outbox idempotente |
| Entrega | No manual | Adapter Teams envía, reintenta, guarda activity id |
| Seguimiento | Humano revisa historial/retry | Sistema actualiza status y Ops Health |

### Estados

```text
draft -> pending_approval -> queued -> sent
draft -> queued -> sent
queued -> failed -> queued -> sent
draft|pending_approval|failed -> cancelled
```

Reglas:

- `sent` es terminal.
- `cancelled` es terminal.
- `failed` puede reintentarse si el error es retryable y el canal sigue `ready`.
- Un request con `idempotency_key` ya publicado no puede crear otro Teams activity.

### Event / Intent Contract

Evento outbox:

```json
{
  "eventType": "communications.manual_announcement.requested",
  "aggregateType": "manual_announcement",
  "aggregateId": "<announcementId>",
  "payload": {
    "announcementId": "<announcementId>",
    "channelCode": "eo-team-announcements",
    "mentionMode": "everyone_in_chat",
    "authorUserId": "<userId>",
    "correlationId": "manual-announcement:<announcementId>"
  }
}
```

Notification Hub mapping objetivo:

- `event_type='communications.manual_announcement.requested'`
- `recipient_kind='channel_static'`
- `channel='teams_channel'` o `teams_chat` según adapter naming final
- `severity='info'`
- `domain='platform'`
- `dedup_key=sha256(event_type + channelCode + announcementId)`

### Teams @todos Contract

El implementation plan debe validar este contrato contra Teams real:

```json
{
  "type": "message",
  "textFormat": "xml",
  "text": "Hola, <at>todos</at><br/>Mensaje...",
  "entities": [
    {
      "type": "mention",
      "text": "<at>todos</at>",
      "mentioned": {
        "id": "<chatId>",
        "name": "todos"
      }
    }
  ]
}
```

Nota: el transcript puede renderizarlo como `todos` sin `@`; la validación real debe revisar delivery status y un smoke visual/manual cuando se toque esta zona.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `/admin/communications` existe, está protegida por `view_code='administracion.communications'` y no aparece a usuarios sin acceso.
- [ ] `admin.communications` existe en `entitlements-catalog` con acciones `read`, `create`, `approve`, `manage`.
- [ ] `EO Team` está modelado como canal manual `eo-team-announcements` en `teams_notification_channels` o registry equivalente sin hardcode en UI.
- [ ] Un admin autorizado puede crear un draft, previsualizarlo y publicarlo sin bloquear la UI durante el dispatch.
- [ ] Un envío con `@todos` exige confirmación explícita y respeta la policy de aprobación.
- [ ] Doble click / retry del request HTTP no duplica el mensaje en Teams.
- [ ] El mensaje se envía desde Greenhouse/Nexa via Bot Framework, no desde el usuario humano ni desde Graph.
- [ ] El historial muestra estado, actor, canal, mention mode, timestamp y Teams activity id o error redactado.
- [ ] Los errores de Teams quedan observables en `source_sync_runs` y en la UI.
- [ ] Rate limit/cooldown bloquea ráfagas manuales, especialmente con `@todos`.
- [ ] Secrets/tokens obvios en el mensaje son bloqueados antes de publicar.
- [ ] Tests cubren permisos, validaciones, idempotencia y shape del payload Teams con mention entity.
- [ ] Documentación funcional y handoff quedan actualizados.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm staging:request POST /api/admin/communications/...` para el happy path de staging cuando exista endpoint.
- Smoke manual o Playwright sobre `/admin/communications`.
- Smoke real Teams con `mention_mode='none'`.
- Smoke real Teams con `mention_mode='everyone_in_chat'`, validando que el mensaje aparece desde `Greenhouse` y que el historial captura `activityId`.

## Closing Protocol

Cerrar una task es obligatorio y forma parte de Definition of Done. Si la implementación terminó pero estos items no se ejecutaron, la task sigue abierta.

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla).
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`).
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre.
- [ ] `Handoff.md` quedó actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes.
- [ ] `changelog.md` quedó actualizado si cambió comportamiento, estructura o protocolo visible.
- [ ] `docs/changelog/CLIENT_CHANGELOG.md` fue evaluado; actualizar solo si se comunica fuera del equipo interno.
- [ ] `docs/documentation/plataforma/manual-communications.md` creado o actualizado.
- [ ] `docs/operations/azure-teams-bot.md` actualizado si se confirmó/ajustó el contrato de `@todos`.
- [ ] Se ejecutó chequeo de impacto cruzado sobre `TASK-690`, `TASK-691`, `TASK-692`, `TASK-693` y `TASK-695`.
- [ ] Se documentó si la implementación vive ya sobre Notification Hub o si queda un adapter temporal con plan de convergencia.

## Follow-ups

- Plantillas aprobadas para mensajes recurrentes.
- Programación de anuncios.
- Segmentación por roles/personas.
- Approval queue con four-eyes permanente para mensajes masivos.
- Métricas de lectura/acknowledgement si Teams expone señales suficientes.
- Multi-canal: email + in-app + Teams desde el mismo anuncio.
- Cliente-facing announcements con release channels y cohortes.

## Delta 2026-04-28

- Task creada a partir del smoke exitoso del Bot Framework contra el chat `EO Team`, donde Greenhouse/Nexa publicó un mensaje manual inicial. El diseño conserva el aprendizaje técnico de `@todos`, pero exige formalizarlo como adapter auditable antes de abrirlo en UI.

## Open Questions

- ¿La primera versión debe permitir self-publish sin aprobación para mensajes sin `@todos`, o todo anuncio debe pasar por four-eyes?
- ¿`/admin/communications` debe vivir como subpestaña de `Admin > Notificaciones` o como surface propia en Admin Center?
- ¿Se quiere exponer `Enviar prueba` en MVP o reservarlo para usuarios con `admin.communications:manage`?
- ¿El copy público debe decir siempre `Nexa` aunque el remitente técnico sea `Greenhouse`, o conviene configurar el sender label por canal?
