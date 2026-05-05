# TASK-671 — Greenhouse Teams Bot Platform (Bot Framework + Microsoft Graph)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete` (closed 2026-05-05 — Azure deploy completo: secret greenhouse-teams-bot-client-credentials provisionado en GCP, 3 canales delivery-pulse + finance-alerts + ops-alerts migrados a channel_kind='teams_bot' con provisioning_status='ready' en producción)
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio-Alto`
- Type: `implementation`
- Status real: `Closed — Azure deploy + cutover completos en producción`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-669` (foundation transport-agnostic ya en develop)
- Branch: `develop` (entrega doc-friendly: code complete, cutover en runbook)
- Legacy ID: `none`

## Delta 2026-04-26 — código entregado

Implementación end-to-end disponible en `develop`. Falta solo el deploy interactivo a Azure + Teams Admin Center + cutover de los 3 canales (runbook en `docs/operations/azure-teams-bot.md`).

- Migraciones aplicadas: `20260426202326023_extend-teams-notification-channels-recipient-kind.sql` y `20260426202330684_create-teams-bot-inbound-actions.sql`
- Bot Framework helpers: `src/lib/integrations/teams/bot-framework/{token-cache,graph-client,jwt-validator,sender}.ts`
- Recipient resolver con cascada `members.teams_user_id → microsoft_oid → email` en `src/lib/integrations/teams/recipient-resolver.ts`
- Sender dispatcher extendido: `postTeamsCard()` rutea `channel_kind='teams_bot'` al nuevo bot framework sender; `azure_logic_app` queda igual
- Action.Submit endpoint: `src/app/api/teams-bot/messaging/route.ts` (JWT validation + idempotency + tenant access lookup + dispatch)
- Action registry pattern: `src/lib/teams-bot/action-registry.ts` con handlers `ops.alert.snooze` y `notification.mark_read`
- Reliability hookup: nuevo módulo `'integrations.teams'` en `RELIABILITY_REGISTRY` + subsystem map + breakdown por transporte en `getOperationsOverview` + UI copy actualizada
- IaC scaffolded: `infra/azure/teams-bot/{main.bicep,parameters.{prod,dev}.json,manifest/manifest.json,README.md}` + workflow `.github/workflows/azure-teams-bot-deploy.yml`
- Tests: 22 nuevos (token-cache, graph-client, recipient-resolver, action-registry, ops/notification handlers); test legacy de `unsupported_channel_kind` actualizado a `missing_bot_app_config`
- Docs: `docs/architecture/GREENHOUSE_TEAMS_BOT_INTERACTION_V1.md` v1.0 + `docs/operations/azure-teams-bot.md` runbook + bump de `GREENHOUSE_TEAMS_NOTIFICATIONS_V1.md` a v1.1
- Decisión arquitectónica: NO se instaló `botbuilder` SDK (~25 deps). Implementación nativa con `jose` + fetch alineada con `src/lib/webhooks/signing.ts` y `src/lib/entra/graph-client.ts`

Pendientes operativos (no son código):
- Crear app registration en Azure AD (`az ad app create`, runbook step 1)
- Subir el blob `{clientId, clientSecret, tenantId}` a GCP Secret Manager `greenhouse-teams-bot-client-credentials`
- Deploy del Bicep stack (`az deployment group create`)
- Upload del manifest `greenhouse-teams.zip` a Teams Admin Center (Global Admin)
- UPDATE de los 3 canales existentes a `channel_kind='teams_bot'` con `team_id` + `channel_id` reales
- Validación de 1 semana antes de decommissionar Logic Apps

## Summary

Convertir el canal de notificaciones outbound a Microsoft Teams en una **plataforma bidireccional con identidad de marca propia "Greenhouse"**, basada en Bot Framework + Microsoft Graph en lugar de Power Automate / Logic Apps. Habilita postear a **canales de team, chats 1:1 individuales y chats grupales**; routing por persona (mapping `team_members.member_id` → Microsoft Graph user → mensaje DM); interactividad real con `Action.Submit` (botones que ejecutan acciones server-side en Greenhouse); y attribution como "Greenhouse" con avatar custom (sin "via Workflows").

Construye sobre el schema transport-agnostic ya entregado en TASK-669: la migración a `channel_kind='teams_bot'` se hace fila por fila con un `UPDATE`, sin DDL. El call site `postTeamsCard(channelCode, card)` queda igual; el sender despacha por discriminator.

## Why This Task Exists

TASK-669 entregó la foundation con Logic Apps + Bicep como Slice 1, suficiente para el 80% del valor (canal funcionando, IaC, observabilidad). Los gaps que TASK-671 cierra:

1. **Branding** — los posts hoy aparecen como `<owner-humano> a través de Flujos de trabajo`. Microsoft no permite quitar esa attribution en Logic Apps / Power Automate. Bot Framework permite postear con display name `Greenhouse` y avatar custom, sin suffix de Workflows.

2. **Owner-less governance** — los Logic Apps + Power Automate dependen de un usuario humano dueño. Si esa persona deja la org, los flows mueren. Los bots viven como **service principal** en Azure AD; sobreviven cambios de personal.

3. **Interactividad bidireccional** — Logic Apps no entrega al backend la respuesta de un `Action.Submit` de un Adaptive Card. Bot Framework sí: clickear un botón en Teams ejecuta un POST contra el endpoint del bot, que puede aprobar una solicitud, descartar una alerta, escalar un ticket, etc. Esto convierte Teams en un **inbox de aprobaciones** además de canal de notificaciones.

4. **Routing por persona, no solo por canal** — hoy mandamos a 3 canales fijos. Con bot, podemos mandar el evento "tu período de payroll fue calculado" como **chat 1:1 al colaborador específico**, mapeando `team_members.member_id` → `client_users.microsoft_oid` → user del tenant Microsoft. El destinatario lo decide el evento, no el canal.

5. **Multi-tenant futuro** — si en algún momento queremos notificar a clientes Globe en sus tenants externos (ej. account managers de la marca cliente), Bot Framework con Resource-Specific Consent (RSC) es el único camino soportado por Microsoft.

## Goal

- Bot de Teams registrado como app del tenant `efeoncepro.com` con identidad `Greenhouse` + logo + capacidades de canal/chat/DM
- Bicep IaC versionado en `infra/azure/teams-bot/` que provisiona Bot Service + Azure AD app registration + Federated Credentials + RSC permissions
- Manifest `manifest.json` empaquetado y publicado al Teams Admin Center (instalación interna del tenant, no público)
- Sender dispatcher `sendViaBotFramework(channel, card)` integrado al `postTeamsCard` existente del repo, sin cambios al call site
- Routing por persona: helper `resolveTeamsUserForMember(memberId)` que mapea identidad canónica → Microsoft Graph user para envío 1:1
- Migración de los 3 canales actuales (`ops-alerts`, `finance-alerts`, `delivery-pulse`) de `azure_logic_app` a `teams_bot` con un `UPDATE` por fila
- Decommission progresivo de los Logic Apps de TASK-669 después de validación en producción
- Action.Submit handlers para flujos de aprobación 1:1 (opt-in, Slice 6)
- Auto-install via Graph admin API para usuarios target (sin requerir que cada persona instale el bot manualmente, Slice 7)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_TEAMS_NOTIFICATIONS_V1.md` — la spec de TASK-669 documenta el trigger condicional para esta migración. Actualizar a v1.1 cuando TASK-671 se cierre con el nuevo `channel_kind='teams_bot'` ya operativo
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — el routing por persona depende del modelo de identidad canónica
- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md` — separación entre auth principal (Azure AD / Google) y canonical identity de Greenhouse
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` — populaciones A/B/C; quién recibe qué tipo de notificación 1:1
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` — donde encaja el Bot Service en el inventario de cloud assets
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md` — postura para nuevo OAuth client + federated credentials
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md` — higiene del client secret / federated credential

Reglas obligatorias:

- **Auth**: app-only via OAuth2 client_credentials con federated credential (no client secret en GitHub). Token cacheado server-side con refresh proactivo
- **RSC scopes**: usar Resource-Specific Consent (`ChannelMessage.Send.Group`, `ChatMessage.Send.Chat`) en vez de tenant-wide consent cuando sea posible. Esto reduce blast radius si la app se compromete
- **Validación de Action.Submit**: cada request inbound desde el bot al endpoint Greenhouse debe validar el JWT del Bot Framework con `microsoftAppId` + `tenantId` esperados antes de ejecutar acciones
- **Anti-leak de identidad**: el bot autentica usando service principal; los Action.Submit traen identidad del usuario que clickeó (Azure AD `aadObjectId`) que debe mapearse a `client_users.microsoft_oid` y validarse contra entitlements antes de ejecutar
- **Reuso del schema TASK-669**: NO crear tabla paralela. Extender `teams_notification_channels` con columnas nuevas (`recipient_kind`, `recipient_user_id`, `recipient_chat_id`) si justifica
- **Test pyramid**: tests unitarios con MSW + tests de contrato del Action.Submit handler (validación de JWT, mapping de identidad, ejecución idempotente)
- **No PII en logs**: tokens, ids de usuarios y payloads nunca se loggean en claro; solo hashes o references

## Normative Docs

- `docs/architecture/GREENHOUSE_TEAMS_NOTIFICATIONS_V1.md` (v1.0 al cerrar TASK-669; subirá a v1.1 cuando TASK-671 se cierre con bot operativo)
- (a crear) `docs/architecture/GREENHOUSE_TEAMS_BOT_INTERACTION_V1.md` — diseño del modelo de interactividad: Action.Submit handlers, mapping de identidad, action registry pattern
- (a crear) `docs/operations/azure-teams-bot.md` — runbook operativo: provisioning, manifest publication, IT Admin approvals, RSC consent flow, secret rotation, troubleshooting
- (a actualizar) `docs/operations/azure-teams-notifications.md` — agregar sección "Migración de canal de Logic App a Bot Framework" con el procedimiento

## Dependencies & Impact

### Depends on

- TASK-669 cerrada (foundation transport-agnostic, schema con `channel_kind`, sender con dispatch por discriminator)
- Microsoft Graph API access aprobado por IT Admin del tenant `efeoncepro.com`
- Acceso a Teams Admin Center para subir manifest (rol Global Admin o Teams Admin)
- Logo definitivo en formato Teams: `icon_color.png` 192x192 + `icon_outline.png` 32x32, ambos PNG transparente
- ~~Decisión de naming del bot: `Greenhouse` vs `Greenhouse Notifications` vs `Greenhouse Bot`~~ → **CERRADA 2026-04-26: `Greenhouse`** (decisión del usuario)
- Resolución de la Open Question de TASK-669 sobre cuenta de servicio (alineada con el bot owner)

### Blocks / Impacts

- TASK-669 no se "rompe", se enriquece. Los canales en `channel_kind='azure_logic_app'` siguen funcionando hasta migrar
- TASK-149 (capacity engine alerts) — gana destinatarios DM 1:1 a managers afectados
- TASK-128 (webhook consumers roadmap) — el bot es un consumer outbound más
- TASK-135 (ops health Sentry reactive refresh) — el tile "Teams Notifications" del Admin > Ops Health debe diferenciar `kind=azure_logic_app` vs `kind=teams_bot` en breakdown
- HR / Payroll notifications a colaboradores específicos — habilita DM 1:1 al miembro
- Finance approvals (cotizaciones, gastos) — habilita Action.Submit para aprobaciones inline en Teams

### Files owned

- `infra/azure/teams-bot/main.bicep`
- `infra/azure/teams-bot/modules/bot-service.bicep`
- `infra/azure/teams-bot/modules/app-registration.bicep`
- `infra/azure/teams-bot/manifest/manifest.json`
- `infra/azure/teams-bot/manifest/icons/icon_color.png`
- `infra/azure/teams-bot/manifest/icons/icon_outline.png`
- `infra/azure/teams-bot/parameters.{prod,dev}.json`
- `infra/azure/teams-bot/README.md`
- `.github/workflows/azure-teams-bot-deploy.yml`
- `migrations/*-extend-teams-notification-channels-recipient-kind.sql`
- `src/lib/integrations/teams/sender.ts` (nuevo dispatcher `sendViaBotFramework`)
- `src/lib/integrations/teams/bot-framework/{graph-client.ts, token-cache.ts, conversation-resolver.ts}`
- `src/lib/integrations/teams/bot-framework/__tests__/`
- `src/lib/integrations/teams/recipient-resolver.ts` (mapping member_id → Microsoft Graph user)
- `src/app/api/teams-bot/messaging/route.ts` (endpoint inbound del bot, valida JWT)
- `src/app/api/teams-bot/messaging/__tests__/`
- `src/lib/teams-bot/action-registry.ts` (registry de handlers por `actionId`)
- `src/lib/teams-bot/handlers/*.ts` (uno por dominio: approvals, dismissals, escalations)
- `docs/architecture/GREENHOUSE_TEAMS_BOT_INTERACTION_V1.md`
- `docs/operations/azure-teams-bot.md`

## Current Repo State

### Already exists (gracias a TASK-669)

- `greenhouse_core.teams_notification_channels` con `channel_kind` discriminator (`azure_logic_app | teams_bot | graph_rsc`) y CHECK constraints sobre `bot_app_id`, `team_id`, `channel_id`, `azure_tenant_id` cuando `kind='teams_bot'`
- `postTeamsCard(channelCode, card)` con dispatch por discriminator; ya retorna `unsupported_channel_kind` para `teams_bot` hoy y solo necesita ser extendido con el dispatcher real
- Card builders `ops-alert`, `finance-alert`, `delivery-pulse` reusables sin cambios (Adaptive Card 1.5 es compatible con bots y Logic Apps)
- Tabla `client_users` con `microsoft_oid` para mapping de identidad
- Helper `resolveSecretByRef` en `secret-manager.ts`, reusable para token federation
- Patrón de Cloud Run `ops-worker` + Vercel sharing del bundle de `src/lib/`

### Gap

- No hay app registration en Azure AD para Greenhouse Bot
- No hay Bot Service provisionado
- No hay manifest de Teams app publicado
- No hay handler inbound en `/api/teams-bot/messaging` para Action.Submit
- No hay mapping `member_id → microsoft_oid → bot conversation reference`
- No hay action registry para mapear `actionId` del card a un handler de dominio

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (vacío al crear)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Bot Service + App Registration via Bicep

- `infra/azure/teams-bot/main.bicep` con:
  - `Microsoft.BotService/botServices` (kind `azurebot`, channel `MsTeamsChannel` enabled)
  - `Microsoft.Graph/applications` (extension Microsoft Graph) con display name `Greenhouse` y `signInAudience='AzureADMyOrg'` (single-tenant, solo efeoncepro)
  - API permissions: `Teamwork.Migrate.All` no, sino RSC scopes específicos: `ChannelMessage.Send.Group`, `ChatMessage.Send.Chat`, `Team.ReadBasic.All`, `Channel.ReadBasic.All`, `User.Read.All` (para resolver microsoft_oid → display name)
  - Federated Credential apuntando a GitHub repo `efeoncepro/greenhouse-eo` + branches `main` y `develop`
  - Federated Credential apuntando a Vercel runtime (OIDC issuer de Vercel → Azure AD)
  - Federated Credential apuntando a Cloud Run `ops-worker` (federación GCP → Azure AD vía Workload Identity)
- `.github/workflows/azure-teams-bot-deploy.yml` con WIF + validate (`az bicep build`) + deploy (`az deployment group create`)
- `infra/azure/teams-bot/parameters.prod.json` con region `eastus`, naming `gh-bot-prod`
- `infra/azure/teams-bot/README.md` con prerequisitos, runbook de deploy y consent inicial
- IT Admin acepta consent global UNA sola vez tras el primer deploy

### Slice 2 — Teams app manifest + publicación interna

- `infra/azure/teams-bot/manifest/manifest.json` v1.17 con:
  - `name.short: "Greenhouse"`, `name.full: "Greenhouse Notifications & Actions"`
  - `description.short` y `description.full` en español
  - `developer` con info de Efeonce
  - `bots[0].botId` apuntando al app registration de Slice 1
  - `bots[0].scopes`: `["team", "personal", "groupChat"]` para soportar las 3 superficies
  - `permissions: ["identity", "messageTeamMembers"]`
  - `validDomains: ["greenhouse.efeoncepro.com", "dev-greenhouse.efeoncepro.com"]`
  - `webApplicationInfo.id` y `webApplicationInfo.resource` para SSO si aplica
- `manifest/icons/icon_color.png` 192x192 + `icon_outline.png` 32x32 (logo de marca)
- Validar manifest con [Teams App Validator](https://dev.teams.microsoft.com/appvalidation.html) (sube el zip antes de publicarlo, debe responder "App package is valid")
- Empaquetar como zip: `manifest.json` + 2 iconos en la **raíz del zip** (sin subdirectorios). Comando referencia: `cd infra/azure/teams-bot/manifest && zip greenhouse-teams.zip manifest.json icons/icon_color.png icons/icon_outline.png`
- **Upload del manifest** — paso interactivo manual del Global Admin / Teams Admin de `efeoncepro.com`:
  1. URL: <https://admin.teams.microsoft.com/policies/manage-apps>
  2. Login con cuenta con rol Global Administrator o Teams Service Administrator
  3. Sidebar → **Teams apps** → **Manage apps**
  4. Click **"+ Upload new app"** (arriba a la derecha) → en el modal click el botón **"Upload"** (no "Submit to app catalog")
  5. Seleccionar el zip `greenhouse-teams.zip` → wait toast "Greenhouse uploaded successfully"
  6. La app aparece en el listado. Click sobre ella → confirmar status **"Allowed"** (si está "Blocked" hay app permission policies que requieren explicit allow)
  7. Verificar: la app está disponible para instalar en cada team / chat por usuarios del tenant
- **Setup de installation policy** (también en Teams Admin Center):
  1. Sidebar → **Teams apps** → **Setup policies**
  2. Editar la política `Global (Org-wide default)` o crear `Greenhouse-internal`
  3. En "Installed apps" → Add → Greenhouse → para que se auto-instale en los teams correspondientes (opcional, alternativa: instalación manual por team)
- **Instalación en cada team destino**:
  1. Teams desktop → click en team (ej. `Alineación`) → `…` → **Manage team** → tab **Apps** → click **More apps**
  2. Buscar **Greenhouse** → click **Add**
  3. Repetir para cada team que va a recibir notificaciones (ops, finance, delivery)

### Slice 3 — Sender dispatcher `sendViaBotFramework` con soporte de 3 superficies

- Migration: `ALTER TABLE greenhouse_core.teams_notification_channels`:
  - `recipient_kind text NOT NULL DEFAULT 'channel' CHECK (recipient_kind IN ('channel','chat_1on1','chat_group','dynamic_user'))`
  - `recipient_user_id text` (Microsoft Graph user id para chat_1on1 estático)
  - `recipient_chat_id text` (chat id estable para chat_group fijo)
  - `recipient_routing_rule_json jsonb` (para `dynamic_user`: regla de mapeo del payload del evento a un member_id que se resuelve a runtime)
- `src/lib/integrations/teams/bot-framework/token-cache.ts`: mint OAuth2 client_credentials token contra `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token` con scope `https://graph.microsoft.com/.default`. Cache en memoria con `expires_in - 60s` margin
- `src/lib/integrations/teams/bot-framework/graph-client.ts`: helpers `postChannelMessage(teamId, channelId, card)`, `postChatMessage(chatId, card)`, `getOrCreateOneOnOneChat(userId)` (POST a `/users/{userId}/chats` con `chatType: 'oneOnOne'` y bot member)
- `src/lib/integrations/teams/sender.ts`: extender el dispatcher actual con caso `case 'teams_bot': return sendViaBotFramework(channel, card)`. La función:
  - Resuelve el chat/channel target según `recipient_kind`
  - Llama al graph-client correspondiente
  - Maneja 429 con backoff (Graph también tiene throttling)
  - Registra en `source_sync_runs` con `source_system='teams_notification'` (mismo discriminator que TASK-669)
  - Diferencia en `notes`: `transport=bot_framework; surface=channel|chat_1on1|chat_group`
- Tests Vitest con MSW: happy path por superficie, 429 retry, token refresh on expiry, missing app registration
- Auto-install proactivo: cuando un canal `recipient_kind='dynamic_user'` apunta a un usuario sin la app, llamar `POST /users/{userId}/teamwork/installedApps` antes de postear (necesita `TeamsAppInstallation.ReadWriteForUser.All` con admin consent)

### Slice 4 — Migración de los 3 canales TASK-669 a `teams_bot`

- Pre-requisito: bot publicado e instalado en los teams target. IT Admin confirma installation policy permite a la app aparecer en `Alineación`, en el team de Finance, y en el de Delivery Operations
- Para cada canal, capturar `team_id` y `channel_id` reales (Teams desktop → click derecho → "Get link to channel" → parsear groupId y thread id)
- Capturar el `app_registration_client_id` del Slice 1
- Para cada canal:
  ```sql
  UPDATE greenhouse_core.teams_notification_channels
     SET channel_kind = 'teams_bot',
         recipient_kind = 'channel',
         bot_app_id = '<azure-ad-client-id>',
         team_id = '<team-guid>',
         channel_id = '<channel-guid>',
         azure_tenant_id = 'a80bf6c1-7c45-4d70-b043-51389622a0e4',
         secret_ref = 'greenhouse-teams-bot-fed-credential'
   WHERE channel_code = 'ops-alerts';
  -- repetir para finance-alerts y delivery-pulse
  ```
- Validación: `pnpm staging:request POST /api/admin/teams/test '{"channelCode":"ops-alerts"}'` debe entregar el card en `Alineación` con attribution `Greenhouse` (no `<usuario> a través de Flujos`)
- Validar 1 semana en producción con tráfico real
- Decommission de los 3 Logic Apps: `az group delete --name rg-greenhouse-teams-notifications-prod --yes` (o, mejor, `az resource delete` selectivo dejando el RG con los recursos del bot)

### Slice 5 — Routing por persona: helper + modo `dynamic_user`

- `src/lib/integrations/teams/recipient-resolver.ts`:
  - `resolveTeamsUserForMember(memberId: string): Promise<{ aadObjectId: string; chatId?: string } | null>`
  - Lógica: `member_id → team_members → identity_profile_id → client_users.microsoft_oid` (FK chain). Si falla, fallback a `client_users.email` y resolver via Graph `/users?$filter=mail eq '{email}'`
  - Cache en memoria con TTL 5 min
- Canales `recipient_kind='dynamic_user'` no tienen `team_id` ni `channel_id` ni `recipient_user_id` fijos; tienen `recipient_routing_rule_json` que describe cómo extraer el `memberId` del payload del evento (ej: `{ "from": "payload.assigneeMemberId" }`)
- En `sendViaBotFramework`, cuando `recipient_kind='dynamic_user'`:
  1. Aplicar `recipient_routing_rule_json` al payload del evento → `memberId`
  2. `resolveTeamsUserForMember(memberId)` → `aadObjectId`
  3. `getOrCreateOneOnOneChat(aadObjectId)` → `chatId`
  4. `postChatMessage(chatId, card)`
- Caso de uso pilot: agregar canal `payroll-personal` con `recipient_kind='dynamic_user'`, suscrito al evento `payroll_period.calculated`, que envía DM 1:1 al colaborador del período

### Slice 6 — Action.Submit handlers (interactividad)

- Endpoint inbound `/api/teams-bot/messaging` que recibe POSTs del Bot Framework cuando un usuario clickea un botón `Action.Submit`:
  - Valida JWT del request usando `BotFrameworkAuthentication` (verifica `iss`, `aud`, `appId` esperado)
  - Extrae `aadObjectId` del usuario que clickeó + `actionId` del card + `data` del submit
  - Mapea `aadObjectId → client_users.user_id` para obtener `tenantContext` (entitlements, scopes)
  - Despacha al handler registrado por `actionId`
- `src/lib/teams-bot/action-registry.ts`: registry pattern similar a `projection-registry.ts`
  ```ts
  registerAction({
    actionId: 'finance.expense.approve',
    requiredCapability: 'finance:approve_expense',
    handler: async (data, tenantContext) => { /* ... */ }
  })
  ```
- Handlers iniciales bajo `src/lib/teams-bot/handlers/`:
  - `finance-expense-approve.ts` (placeholder, integra con TASK-651)
  - `ops-alert-snooze.ts` (silenciar alerta por 24h)
  - `notification-mark-read.ts` (marca leído sin abrir el portal)
- Cada handler debe ser **idempotente** (puede llegar 2x si el bot reintenta) y debe verificar entitlements antes de ejecutar
- Después de ejecutar, opcional: `updateAdaptiveCard(activityId, newCard)` para mostrar feedback visual ("✓ Aprobado por Julio el 2026-04-26 14:32")
- Tests E2E con un bot stub que firma JWT con cert de prueba

### Slice 7 — Auto-install via Graph admin (sin fricción para destinatarios DM)

- Para canales `recipient_kind='chat_1on1'` o `dynamic_user`, antes de postear el primer mensaje, llamar:
  ```
  POST https://graph.microsoft.com/v1.0/users/{userId}/teamwork/installedApps
  Body: { "teamsApp@odata.bind": "https://graph.microsoft.com/v1.0/appCatalogs/teamsApps/{appId}" }
  ```
- Cachear resultado por usuario (TTL 24h) para no repetir la llamada
- Manejo de errores: si user no existe, marcar el evento como `failed:user_not_in_tenant`; si app no está en el catalog, alertar via canal `ops-alerts` para que IT Admin re-publique
- Esto requiere permission `TeamsAppInstallation.ReadWriteForUser.All` con admin consent — IT Admin lo aprueba en Slice 1

## Out of Scope

- **Multi-tenant externo** (notificar a usuarios fuera de efeoncepro.com) — requiere RSC + admin consent de cada tenant cliente. Si surge demanda con clientes Globe específicos, se abre task derivada
- **Conversational AI** dentro del bot (responder mensajes naturales del usuario) — fuera de alcance, el bot es solo emisor de notificaciones + receptor de Action.Submit
- **Voice / video calls** — el bot no maneja calls
- **File uploads** desde el bot — los cards pueden tener `Action.OpenUrl` que linkea a archivos, pero no embed binario
- **Migración de canales legacy de Slack u otros** — TASK-671 es solo Teams. Slack se evalúa aparte si surge

## Detailed Spec

### Schema extension propuesta

```sql
ALTER TABLE greenhouse_core.teams_notification_channels
  ADD COLUMN recipient_kind text NOT NULL DEFAULT 'channel',
  ADD COLUMN recipient_user_id text,
  ADD COLUMN recipient_chat_id text,
  ADD COLUMN recipient_routing_rule_json jsonb,
  ADD CONSTRAINT teams_notification_channels_recipient_kind_check CHECK (
    recipient_kind IN ('channel', 'chat_1on1', 'chat_group', 'dynamic_user')
  ),
  ADD CONSTRAINT teams_notification_channels_recipient_consistency_check CHECK (
    (recipient_kind = 'channel' AND team_id IS NOT NULL AND channel_id IS NOT NULL)
    OR (recipient_kind = 'chat_1on1' AND recipient_user_id IS NOT NULL)
    OR (recipient_kind = 'chat_group' AND recipient_chat_id IS NOT NULL)
    OR (recipient_kind = 'dynamic_user' AND recipient_routing_rule_json IS NOT NULL)
  );
```

### Auth flow runtime

```
Greenhouse runtime (Vercel / Cloud Run)
  → resolveSecretByRef('greenhouse-teams-bot-fed-credential')
    [returns: client_id + tenant_id + federated assertion config]
  → mintGraphToken(client_id, tenant_id, federated_assertion)
    [POST https://login.microsoftonline.com/{tid}/oauth2/v2.0/token
     grant=client_credentials, scope=https://graph.microsoft.com/.default,
     client_assertion=<federated jwt>]
  → cached token (in-memory, TTL = expires_in - 60s)
  → Graph API call (POST /teams/{}/channels/{}/messages or /chats/{}/messages)
```

### Action.Submit flow

```
User clicks button in Adaptive Card in Teams
  → Bot Framework POSTs to /api/teams-bot/messaging
    [Authorization: Bearer <jwt signed by Bot Framework>]
  → endpoint validates JWT (aud=botAppId, iss=https://login.botframework.com, expired check)
  → extracts: actionId, data, fromAadObjectId, conversationId
  → maps aadObjectId → client_users.user_id (PG lookup) → TenantContext
  → action-registry.dispatch(actionId, data, tenantContext)
  → handler verifies entitlement, executes idempotently
  → optionally: updateAdaptiveCard(activityId, feedbackCard)
```

### Identity bridge

```
team_members.member_id (canonical Greenhouse identity)
  → identity_profiles.identity_profile_id (canonical 360 person)
  → client_users.user_id (auth principal)
  → client_users.microsoft_oid (Azure AD aadObjectId)
  → Microsoft Graph /users/{aadObjectId}
  → 1:1 chat resolution
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Bicep stack `infra/azure/teams-bot/` desplegado en `eastus` con Bot Service + App Registration + Federated Credentials
- [ ] Manifest `Greenhouse` publicado en Teams Admin Center y aprobado por IT Admin
- [ ] Bot instalable en teams del tenant (mínimo: Alineación, Finance ops chat, Delivery ops chat)
- [ ] Migration `extend-teams-notification-channels-recipient-kind.sql` aplicada y tipos Kysely regenerados
- [ ] Sender dispatcher `sendViaBotFramework` integrado, con soporte para `channel`, `chat_1on1`, `chat_group`, `dynamic_user`
- [ ] Tests Vitest cubren: happy path por superficie, 429 retry, token refresh, missing app, user not in tenant
- [ ] 3 canales de TASK-669 migrados a `channel_kind='teams_bot'` con attribution `Greenhouse` en producción
- [ ] Logic Apps de TASK-669 decomisionados (después de 1 semana de validación en bot)
- [ ] Helper `resolveTeamsUserForMember` operativo y cubierto por tests
- [ ] Endpoint `/api/teams-bot/messaging` validando JWT correctamente, action-registry con al menos 1 handler real (`ops-alert-snooze`)
- [ ] Tile en Admin > Ops Health diferencia `kind=azure_logic_app` vs `kind=teams_bot` en breakdown
- [ ] `GREENHOUSE_TEAMS_BOT_INTERACTION_V1.md` v1.0 publicado
- [ ] `azure-teams-bot.md` runbook publicado con runbook de provisioning, manifest publication, Action.Submit testing, secret rotation
- [ ] `GREENHOUSE_TEAMS_NOTIFICATIONS_V1.md` actualizado a v1.1 con bot operativo y trigger condicional ya cumplido

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm migrate:status`
- `pnpm staging:request POST /api/admin/teams/test '{"channelCode":"ops-alerts"}'` → entrega card con attribution `Greenhouse`
- E2E manual: clickear `Action.Submit` en un card de prueba → verificar que el endpoint inbound ejecuta el handler y actualiza el card
- E2E DM: forzar evento `payroll_period.calculated` en staging → confirmar que el colaborador recibe DM 1:1 del bot
- Validación visual: capture de los 3 surfaces (canal, chat_group, chat_1on1) confirmando branding `Greenhouse` con avatar correcto

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con estado real
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado: nuevo canal interactivo bidireccional Teams Bot
- [ ] chequeo de impacto cruzado sobre TASK-128, TASK-135, TASK-149, TASK-651, TASK-669
- [ ] `TASK_ID_REGISTRY.md` actualizado a `complete`
- [ ] `GREENHOUSE_TEAMS_NOTIFICATIONS_V1.md` actualizado a v1.1
- [ ] secrets rotables documentados en `GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`

## Follow-ups

- Action.Submit handlers adicionales para flujos específicos (TASK-651 finance approvals, TASK-149 capacity alerts)
- Multi-tenant externo si surge caso de uso con un cliente Globe específico
- Bot conversational (NLP / Copilot integration) si la organización lo demanda
- Migración de notificaciones por email a DM 1:1 del bot en casos donde aplica (más immediate y trackeable)

## Open Questions

- ~~Decisión final de naming del bot~~ → **CERRADA 2026-04-26: `Greenhouse`** (`name.short = "Greenhouse"`, `name.full = "Greenhouse Notifications & Actions"`)
- Logo definitivo en formato Teams (192x192 + 32x32) — coordinar con design
- ¿Qué cuenta de servicio firma el manifest? (probablemente la misma que se decida en TASK-669 Open Question)
- ¿`signInAudience='AzureADMyOrg'` (single-tenant, solo efeoncepro) o `AzureADMultipleOrgs`? Default: single. Multi-tenant si crecemos con clientes Globe
- ¿Action.Submit feedback debería ser `replyToActivity` (responder en el thread) o `updateActivity` (actualizar el card original)? Default: `updateActivity` para que el card "marque check"
- ¿Auto-install via Graph admin requiere consent global del tenant? Confirmar con IT Admin antes de Slice 7
