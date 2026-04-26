# GREENHOUSE_TEAMS_BOT_INTERACTION_V1

> **Tipo de documento:** Spec arquitectura canónica
> **Versión:** 1.1
> **Creado:** 2026-04-26 por TASK-671 (Claude)
> **Última actualización:** 2026-04-26 por TASK-671 (Claude) — bump a v1.1 con path correcto Bot Framework Connector + lessons learned del deploy
> **Estado:** vigente
> **Spec relacionada:** `GREENHOUSE_TEAMS_NOTIFICATIONS_V1.md` v1.1

## Delta v1.1 (2026-04-26 — verificado en producción)

Durante el deploy a `efeoncepro.com` aprendimos que la propuesta original
(Microsoft Graph `POST /v1.0/teams/{}/channels/{}/messages` con app token + RSC)
**NO funciona para bots proactivos**. Microsoft Graph reserva la application
permission `Teamwork.Migrate.All` para escenarios de migración únicamente; las
RSC `ChannelMessage.Send.Group` declaradas en el manifest son consentidas pero
Graph aún rechaza con `Forbidden — API requires Teamwork.Migrate.All`.

### Path correcto verificado por smoke

Greenhouse Teams Bot envía via **Bot Framework Connector API**, no Microsoft Graph:

| Aspecto | Valor verificado |
| --- | --- |
| Token audience | `https://api.botframework.com/.default` |
| Token endpoint | `https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token` (NO `botframework.com` para SingleTenant bots) |
| Service URL | `https://smba.trafficmanager.net/teams` (primary), `/amer`, `/emea`, `/apac` (fallbacks regionales) |
| Endpoint canal | `POST {serviceUrl}/v3/conversations` con body `{ isGroup: true, channelData: { channel, tenant, team? }, activity }` |
| Endpoint chat existente | `POST {serviceUrl}/v3/conversations/{chatId}/activities` |
| Endpoint crear DM | `POST {serviceUrl}/v3/conversations` con `members: [{ id: "29:<aadObjectId>" }]` |

Microsoft Graph **sí** se usa para 2 lookups ancilares (token aud
`https://graph.microsoft.com/.default`):

- `GET /v1.0/users?$filter=mail eq '<email>'` — recipient resolver fallback
- `POST /v1.0/users/{userId}/teamwork/installedApps` — auto-install para DM

### Robustness baked in

- **Region failover:** lista de candidatos (`/teams → /amer → /emea → /apac`); 404 "Unknown cloud" no se cuenta como error, salta al siguiente.
- **Conversation reference cache:** tabla `greenhouse_core.teams_bot_conversation_references` (migración `20260426220857590`) cachea per-target el `serviceUrl` + `conversationId` que funcionó. Cache de 2 niveles: in-process Map (TTL 5 min) + Postgres. Hot path evita la región-loop.
- **Circuit breaker:** `failure_count >= 3` en la cache row → `resolveConversationReference` retorna null y el dispatcher re-descubre. Self-healing en el próximo success.
- **Backoff con jitter:** 250ms × 4^(n-1) + jitter aleatorio ≤ 250ms en 429/5xx, máx 3 intentos. Respeta `Retry-After` con cap de 30s.
- **Token cache:** in-process Map por `(tenantId, clientId, scope)` con margen de seguridad de 60s antes de expiry. Soporta dos audiences (BF Connector + Graph) sin colisión.

### Manifest learnings

- `manifestVersion: "1.16"` es el más estable con RSC. `1.17` también funciona pero dispara warning "supportsChannelFeatures tier1" sin necesidad.
- `webApplicationInfo` con `id` + `resource: api://botid-<appId>` es **REQUERIDO** cuando el manifest declara `authorization.permissions.resourceSpecific[]`. Sin esto, el upload al Admin Center falla con error genérico "No podemos cargar la aplicación" (el detalle solo lo muestra `@microsoft/teamsapp-cli teamsapp validate --debug`).
- Scopes RSC inválidos rompen el upload entero. **`ChatMessage.Send.Chat` NO existe** — usar `Chat.Manage.Chat` para sends a chats con app token.
- RSC application scopes se conceden **per-team al instalar el bot**. Después de actualizar el manifest, los installs existentes NO heredan los nuevos scopes — hay que **uninstall + reinstall** desde Teams Desktop (no via Graph CLI con token delegado, que no tiene autoridad para consentir RSC en nombre del team).
- App registration debe ser `signInAudience=AzureADMyOrg` (single-tenant) para nuestro caso. NO multi-tenant a menos que el cliente Globe lo requiera explícitamente.

## 1. Propósito

Definir el modelo de **interactividad bidireccional** del Greenhouse Teams Bot:

- Cómo se entrega un Adaptive Card con `Action.Submit` al usuario.
- Cómo el clic genera un POST autenticado al endpoint `/api/teams-bot/messaging`.
- Cómo se valida la identidad del que hizo clic, se mapea a un `TenantAccessRecord` y se ejecuta un handler idempotente con verificación de entitlements.
- Cómo se persiste el evento para audit + idempotency.

El bot **no** es un agente conversacional. Solo emite notificaciones y recibe `Action.Submit`. Cualquier futura conversación natural va por una task derivada.

## 2. Topología

```text
[Outbox event]                        [Usuario en Teams]
      │                                       │
      ▼                                       │ click "Aprobar"
[teams_notify projection]                     │
      │                                       ▼
      ▼                       [Bot Framework relay]
[postTeamsCard(channelCode, card)]            │
      │                                       │ POST /api/teams-bot/messaging
      ▼                                       │ Authorization: Bearer <BF JWT>
[sender dispatch by channel_kind]             │
   ├─ azure_logic_app → POST webhook          ▼
   └─ teams_bot ────► Microsoft Graph    [validateBotFrameworkJwt]
                          │                   │
                          ▼                   ▼
                    [Adaptive Card]    [getTenantAccessRecordByMicrosoftOid]
                                              │
                                              ▼
                                       [persist teams_bot_inbound_actions]
                                              │ idempotency_key UNIQUE
                                              ▼
                                       [dispatchTeamsBotAction]
                                              │
                                              ▼
                                       [handler runs idempotently]
                                              │
                                              ▼
                                       [200 OK + opcional updatedCard]
```

## 3. Tablas canónicas

### `greenhouse_core.teams_notification_channels` (extendida — TASK-669 + TASK-671)

| Columna                           | Tipo  | Notas                                                                 |
| --------------------------------- | ----- | --------------------------------------------------------------------- |
| `channel_code`                    | text  | PK estable. `ops-alerts`, `finance-alerts`, etc.                      |
| `channel_kind`                    | text  | `azure_logic_app` | `teams_bot` | `graph_rsc`                       |
| `bot_app_id`                      | text  | Azure AD client id del bot. Required para `teams_bot`.                |
| `team_id`                         | text  | Microsoft Graph team id. Required para `recipient_kind='channel'`.    |
| `channel_id`                      | text  | Microsoft Graph channel thread id.                                    |
| `azure_tenant_id`                 | text  | Tenant id (`a80bf6c1-…`).                                             |
| `recipient_kind`                  | text  | `channel` | `chat_1on1` | `chat_group` | `dynamic_user`              |
| `recipient_user_id`               | text  | Static `aadObjectId` para `chat_1on1`.                                |
| `recipient_chat_id`               | text  | Static chat id para `chat_group`.                                     |
| `recipient_routing_rule_json`     | jsonb | Para `dynamic_user`. Shape: `{"from":"payload.assigneeMemberId"}`.    |
| `secret_ref`                      | text  | GCP Secret Manager ref con `{clientId, clientSecret, tenantId}` JSON. |
| `provisioning_status`             | text  | `ready` | `pending_setup` | `configured_but_failing`               |

CHECK constraint compuesto:
- `channel_kind = 'azure_logic_app'` → siempre OK (legacy).
- `channel_kind ∈ {'teams_bot','graph_rsc'}` → exactamente uno de los 4 paths del recipient_kind debe estar bien formado.

### `greenhouse_core.teams_bot_inbound_actions` (nueva — TASK-671)

| Columna                  | Tipo                  | Notas                                                              |
| ------------------------ | --------------------- | ------------------------------------------------------------------ |
| `inbound_id`             | uuid PK               | Generado por defecto.                                              |
| `received_at`            | timestamptz           | Timestamp del POST inbound.                                        |
| `bot_app_id`             | text                  | App id que firmó el JWT.                                           |
| `azure_tenant_id`        | text                  | `tenantId` del activity.                                           |
| `from_aad_object_id`     | text                  | `aadObjectId` del que clickeó.                                     |
| `conversation_id`        | text                  | Conversation Bot Framework.                                        |
| `activity_id`            | text                  | Activity id (Bot Framework).                                       |
| `action_id`              | text                  | `data.actionId` del Action.Submit.                                 |
| `action_data_json`       | jsonb                 | Resto del payload `data`. Truncado a 64KB.                         |
| `idempotency_key`        | text UNIQUE           | sha256(`activity_id|action_id|from_aad_object_id`).                |
| `handler_status`         | text                  | `pending|succeeded|failed|rejected_unauthorized|rejected_unknown_action|rejected_disabled_action` |
| `handler_started_at`     | timestamptz           |                                                                    |
| `handler_finished_at`    | timestamptz           |                                                                    |
| `handler_error_summary`  | text                  | **Redactado** (sin tokens, emails, ni stacks completos).           |
| `resolved_user_id`       | text                  | `client_users.user_id` resuelto (si aplica).                       |
| `resolved_member_id`     | text                  | `members.member_id` resuelto.                                      |

## 4. Flow de Action.Submit (paso a paso)

1. **Card publicado** con `actions[].type='Action.Submit'` y `data.actionId='ops.alert.snooze'`.
2. **Usuario clickea** el botón en Teams. El cliente Teams genera una activity `invoke` y la POSTea al endpoint del bot con un JWT firmado por `https://login.botframework.com`.
3. **Endpoint recibe el POST** en `/api/teams-bot/messaging`:
   - Lee `Authorization: Bearer <jwt>`.
   - `validateBotFrameworkJwt({ token, expectedAppId: env.GREENHOUSE_TEAMS_BOT_APP_ID })`:
     - Resuelve JWKS desde `https://login.botframework.com/v1/.well-known/openidconfiguration` (cache).
     - Verifica `iss ∈ {api.botframework.com, …}`, `aud === expectedAppId`, `exp/nbf` con tolerancia 60s.
     - Si falla → 401.
4. **Parse activity body**: extrae `id`, `from.aadObjectId`, `conversation.id`, `value.actionId`, `value.data`.
5. **Sanitización**: `actionId` debe matchear `/^[a-z0-9._-]{1,128}$/i`. Caso contrario → 400.
6. **Identity reverse-lookup**:
   - `getTenantAccessRecordByMicrosoftOid(fromAadObjectId)`.
   - Si null → persistir como `rejected_unauthorized` y devolver 403.
7. **Persistir inbound** (`INSERT … ON CONFLICT (idempotency_key) DO NOTHING`):
   - Si `inserted: false` → es un retry; devolver 200 sin re-ejecutar.
8. **Dispatch** a `action-registry`:
   - `getTeamsBotAction(actionId)`. Si null → marcar `rejected_unknown_action`, devolver 400.
   - Verificar `requiredRoleCodes` y `requiredRouteGroups` contra el tenant context.
   - Si gating falla → marcar `rejected_unauthorized`, devolver 403.
   - Si `validateData(data)` retorna false → marcar `rejected_unknown_action`, devolver 400.
   - Ejecutar `handler(data, ctx)`.
9. **Persistir outcome** con `handler_status` final + `handler_finished_at`.
10. **Respuesta**: `{ ok: true, message?: string, updatedCard?: AdaptiveCard | null }`.

## 5. Action registry

Patrón clonado de `src/lib/sync/projection-registry.ts`. Cada handler vive en
`src/lib/teams-bot/handlers/<dominio>-<acción>.ts` y se auto-registra al ser importado.

```typescript
registerTeamsBotAction({
  actionId: 'finance.expense.approve',
  description: 'Approve a flagged expense from a Teams card.',
  domain: 'finance',
  requiredRoleCodes: ['finance_manager'],
  validateData: (d): d is { expenseId: string } => typeof (d as any).expenseId === 'string',
  handler: async (data, ctx) => {
    // … idempotente, verifica entitlement fino, marca el expense como aprobado
    return { ok: true, message: `✓ Aprobado por ${ctx.tenantContext.fullName}` }
  }
})
```

Reglas:
- **Idempotencia**: el endpoint ya bloquea retries por `idempotency_key`, pero el handler tampoco debe asumirlo: implementar `INSERT … ON CONFLICT DO NOTHING` o checks explícitos.
- **Sin side-effects fuera del request**: nada de timers, nada de fire-and-forget. Si el handler quiere disparar otro evento, hace `appendOutboxEvent(...)` síncrono.
- **Verificación de capability fina**: si la acción depende de un capability de `entitlements-catalog`, el handler debe llamar `getTenantEntitlements(tenantContext)` y verificar la clave compuesta. Las gates declarativas (`requiredRoleCodes`, `requiredRouteGroups`) son solo un primer filtro grueso.

## 6. Routing por persona (`recipient_kind = 'dynamic_user'`)

```typescript
// channel row
{
  channel_code: 'payroll-personal',
  channel_kind: 'teams_bot',
  recipient_kind: 'dynamic_user',
  recipient_routing_rule_json: { from: 'payload.assigneeMemberId' }
}

// event payload (the outbox emitter chooses the path)
{
  _eventType: 'payroll_period.calculated',
  assigneeMemberId: 'mem-julio-001',
  …
}
```

El sender:
1. `extractMemberIdFromPayload(payload, rule)` → `'mem-julio-001'`.
2. `resolveTeamsUserForMember('mem-julio-001')` con cascada:
   - `members.teams_user_id` (preferido — populated por People sync).
   - `client_users.microsoft_oid` (fallback — populated por Azure SSO).
   - `client_users.email` → Graph `/users?$filter=mail eq '<email>'` (último fallback).
3. `getOrCreateOneOnOneChat({ botUserId, recipientUserId })` → `chatId`.
4. `postChatMessage({ chatId, card })`.

Si la cascada se queda sin opciones, el outcome es `recipient_unresolved` o `recipient_not_in_tenant` y se loggea en `source_sync_runs.notes`.

## 7. Auth runtime

```text
Greenhouse runtime
  → resolveSecretByRef('greenhouse-teams-bot-client-credentials')
    [returns JSON: { clientId, clientSecret, tenantId }]
  → acquireBotFrameworkToken({ clientId, clientSecret, tenantId })
    [POST login.microsoftonline.com/{tid}/oauth2/v2.0/token
     scope=https://graph.microsoft.com/.default,
     grant_type=client_credentials]
  → cached token (in-memory, expires_in - 60s)
  → graph-client.ts call
```

**Federated credentials** (TASK-671 follow-up): el secret blob actual usa client_secret. La spec de Cloud Security Posture pide migrar a federated credential (Vercel OIDC + Cloud Run WIF + GitHub Actions) para no tener client_secret rotable manualmente. La migración no requiere cambiar el code path — solo el blob almacenado en Secret Manager (un cliente de federated credential trade `assertion → token`).

## 8. Reliability hookup

- `RELIABILITY_REGISTRY` ya tiene module `'integrations.teams'` con `incidentDomainTag='integrations.teams'`.
- `SUBSYSTEM_MODULE_MAP` mapea `'Teams Notifications'` al módulo nuevo.
- `getOperationsOverview()` produce el subsystem con `metrics`:
  - `logic_app_sent_24h`
  - `bot_framework_sent_24h`
  - `pending_setup_channels` (`status='warning'` si > 0)
- Sentry incidents: code paths del módulo deben usar `captureWithDomain(err, 'integrations.teams', ...)` para que aparezcan en el signal `incident` del módulo.

## 9. Reglas duras

- **NO** crear `new Pool()` para la auth de bot — todo pasa por `runGreenhousePostgresQuery`.
- **NO** loggear el JWT del bot ni el client_secret. El helper `redactError()` en el endpoint cubre el path obvio; cualquier nuevo log explícito debe pasar por el mismo redact.
- **NO** dispatch directo de `action_data_json` a SQL — todos los handlers deben validar el shape antes de tocar la DB.
- **NO** ejecutar handlers que no estén registrados (la rama `invalid_data` en el endpoint cubre esto, pero los nuevos handlers deben importarse en `src/lib/teams-bot/handlers/index.ts`).
- **NO** mover el endpoint a `runtime='edge'`. El Bot Framework JWT requiere fetch a JWKS + crypto verify; el path Node.js es el correcto.

## 10. Out of scope

- Conversational AI / NLP en el bot — separate task si surge demanda.
- Multi-tenant externo (DM a usuarios en tenants Globe) — requiere RSC + admin consent del cliente; abrir task derivada cuando surja un cliente piloto.
- Sustituir el endpoint inbound por un Cloud Run dedicado — el path actual en Vercel cubre el throughput esperado (< 100 acciones/día). Migrar si la carga crece.

## Referencias

- Código: `src/lib/integrations/teams/bot-framework/`, `src/lib/teams-bot/`, `src/app/api/teams-bot/messaging/`
- Migraciones: `migrations/20260426202326023_*.sql`, `migrations/20260426202330684_*.sql`
- IaC: `infra/azure/teams-bot/`
- Workflow: `.github/workflows/azure-teams-bot-deploy.yml`
- Runbook: `docs/operations/azure-teams-bot.md`
