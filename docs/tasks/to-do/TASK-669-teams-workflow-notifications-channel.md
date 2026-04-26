# TASK-669 — Teams Workflow Notifications Channel

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-669-teams-workflow-notifications`
- Legacy ID: `none`

## Summary

Construir el canal canónico de notificaciones a Microsoft Teams usando **Azure Logic Apps Consumption provisionados vía Bicep** (IaC versionado en git), que actúan como bridge HTTP-trigger → Adaptive Card en canal de Teams. Reemplaza a los Office 365 Connectors deprecados (corte final 30-abril-2026) sin caer en la fragilidad de Power Automate Workflows (owner humano = punto único de falla). Greenhouse expone un sender server-side (Vercel + Cloud Run `ops-worker`) que postea Adaptive Cards 1.5 a los Logic Apps configurados, con higiene de secretos, rate limiting y observabilidad en `source_sync_runs`.

## Architectural Decision

Se evaluaron 4 caminos (ver Detailed Spec). Decisión: **Logic Apps Consumption + Bicep**.

Razones:

- IaC versionado en git (alineado con cultura del repo: GHA WIF, Cloud Run via gcloud, Terraform-friendly)
- Service principal como owner — sin riesgo de baja humana matando el workflow (vs Power Automate Workflows)
- Costo $1-5 USD/mes para escenarios realistas (4500-18000 ejecuciones/mes a $0.000025 trigger + $0.000125 Teams connector)
- Suscripción Azure ya provisionada (`e1cfff3e-8c21-4170-8b28-ad083b741266`, tenant `efeoncepro.com`)
- Migración futura a Bot Framework (más robusto pero costoso) se documenta como trigger condicional: si crecemos a >15 canales o necesitamos `Action.Submit` interactivo

Trigger para migrar a Bot Framework / Graph RSC (documentar en spec arquitectura):

- >15 canales activos, o
- Necesidad de interacción bidireccional (botones que ejecutan acciones en Greenhouse), o
- Multi-tenant externo (clientes Globe recibiendo notificaciones).

## Why This Task Exists

Hoy Greenhouse no tiene un canal first-class para notificar humanos en Teams. Los caminos disponibles son frágiles:

- Los **Office 365 Connectors / Incoming Webhooks clásicos** quedan retirados el **30-abril-2026** y Microsoft no extenderá más el deadline.
- **Power Automate Workflows app** (reemplazo oficial first-party) tiene un anti-patrón duro: el flow es propiedad de un **usuario humano individual** y muere si esa persona deja la org. Sin IaC, sin versionado, sin auditoría.
- Microsoft Graph API requiere auth delegada (usuario humano interactivo) — inviable desde backend headless.
- Bot Framework / Graph RSC son las soluciones más robustas pero cuestan 1-2 días de setup (manifest, Bot Service registration, app catalog approval, install per team) — overkill para 3-5 canales internos.
- **Azure Logic Apps Consumption** es el sweet spot: IaC en Bicep, service principal como owner (sin humano), costo $1-5/mes, suscripción Azure ya provisionada para `efeoncepro.com`.

Faltan: (1) helper canónico `postTeamsWorkflowCard` que valide tamaño <28KB, maneje 429 con backoff y registre en `source_sync_runs`; (2) tabla `greenhouse_core.teams_notification_channels` para mapear `channel_code → secret_ref + display`; (3) catálogo de notificaciones que defina qué eventos del outbox se envían a qué canales; (4) infra Bicep versionada en `infra/azure/teams-notifications/` con Logic App por canal + parametrización; (5) GitHub Action que despliega los Logic Apps a Azure usando WIF.

## Goal

- Sender canónico `postTeamsWorkflowCard` reutilizable desde Vercel y Cloud Run `ops-worker`, sin duplicar bundling
- Catálogo declarativo de canales (`teams_notification_channels`) con secret refs en GCP Secret Manager (URLs HTTP-trigger de Logic Apps)
- Infra Bicep para 3 Logic Apps Consumption (`ops-alerts`, `finance-alerts`, `delivery-pulse`) + Resource Group dedicado + Teams API connection compartida
- 3 canales productivos cableados al outbox: `ops-alerts` (errores/recovery), `finance-alerts` (cierres VAT, anomalías), `delivery-pulse` (resúmenes diarios de ICO)
- Adaptive Card schema versionado en `src/lib/integrations/teams/cards/` con templates por tipo de evento
- Observabilidad: cada envío deja fila en `source_sync_runs` con `source_system='teams_notification'`, visible en Admin > Ops Health
- GitHub Action `infra-azure-teams-deploy.yml` con Workload Identity Federation (sin client secret en GitHub)
- Spec arquitectura `GREENHOUSE_TEAMS_NOTIFICATIONS_V1.md` con trigger documentado de migración a Bot Framework

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` — patrón de webhooks outbound, retry, dead-lettering
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — catálogo de eventos outbox que pueden disparar notificaciones
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — patrón reactivo + recovery; integrar como projection consumer
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` §4.9 (Cloud Run `ops-worker`) — plataforma donde corren los crons reactivos
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md` — postura para nuevos secret refs
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md` — higiene de secretos: scalar crudo, sin `\n`, verificación post-rotación

Reglas obligatorias:

- **Secretos**: URLs de workflow se publican como scalar crudo vía `printf %s "$URL" | gcloud secrets versions add ...`; nunca con comillas envolventes ni newline literal
- **Rate limit Teams**: máx **4 req/s por webhook**; implementar token bucket en memoria + retry exponencial sobre 429
- **Tamaño máximo**: 28,672 bytes; truncar/resumir card antes del POST con margen (~26KB)
- **Owner del workflow**: NO crear con cuenta personal — usar service account compartida + agregar 2 co-owners por canal; documentar rotation playbook
- **Acciones de card**: solo `Action.OpenUrl` funciona (Action.Submit no entrega respuesta al backend)
- **No PII en logs**: el body del card se loggea por hash, no en claro (puede contener nombres de clientes/montos)
- **Reuso ESM/CJS**: el helper debe correr en Vercel Node runtime y en Cloud Run `ops-worker` con esbuild — sin imports que rompan el bundling (ver `services/ops-worker/Dockerfile` para shims)

## Normative Docs

- (a crear) `docs/architecture/GREENHOUSE_TEAMS_NOTIFICATIONS_V1.md` — spec del canal: schema de canales, contrato del sender, catálogo de eventos suscritos, owner rotation playbook
- (a crear) `docs/operations/teams-workflow-provisioning.md` — guía step-by-step para crear un workflow en Teams (UI manual), capturar URL, publicarla en Secret Manager, registrar el canal

## Dependencies & Impact

### Depends on

- Outbox + projection registry: `src/lib/sync/outbox-consumer.ts`, `src/lib/sync/projection-registry.ts`
- `source_sync_runs` table en `greenhouse_sync` schema (para observabilidad)
- GCP Secret Manager + binding existente para Vercel y Cloud Run service accounts
- Cloud Run `ops-worker` deploy pipeline (`services/ops-worker/`)

### Blocks / Impacts

- TASK-128 (Webhook Consumers Roadmap) — este es el primer consumer outbound real con humano en el loop
- TASK-135 (Ops Health Sentry Reactive Refresh) — agregar tile/row con Teams send health
- TASK-149 (Capacity Engine Alerts) — futuro consumer del canal `delivery-pulse`
- Finance VAT reactive lane — futuro consumer del canal `finance-alerts`

### Files owned

- `src/lib/integrations/teams/sender.ts`
- `src/lib/integrations/teams/cards/`
- `src/lib/integrations/teams/cards/index.ts`
- `src/lib/integrations/teams/types.ts`
- `src/lib/integrations/teams/__tests__/`
- `src/lib/sync/handlers/teams-notify.ts`
- `migrations/*-create-teams-notification-channels.sql`
- `infra/azure/teams-notifications/main.bicep`
- `infra/azure/teams-notifications/modules/logic-app-channel.bicep`
- `infra/azure/teams-notifications/parameters.*.json`
- `infra/azure/teams-notifications/README.md`
- `.github/workflows/azure-teams-deploy.yml`
- `docs/architecture/GREENHOUSE_TEAMS_NOTIFICATIONS_V1.md`
- `docs/operations/azure-teams-notifications.md`

## Current Repo State

### Already exists

- Outbox pipeline reactivo en Cloud Run `ops-worker` (TASK-148, ya en producción)
- Projection registry y patrón consumer (`src/lib/sync/projection-registry.ts`)
- `source_sync_runs` con `source_system` discriminator
- Helpers de Secret Manager para `*_SECRET_REF`
- Patrón ESM/CJS shim para reuso de `src/lib/` desde Cloud Run (`services/ops-worker/Dockerfile`)

### Gap

- No hay `src/lib/integrations/teams/` ni helper de envío
- No hay tabla `teams_notification_channels` ni mapping `event_type → channel`
- No hay templates Adaptive Card definidos
- No hay playbook documentado para provisioning manual + owner rotation
- No hay observabilidad en Ops Health para envíos a Teams

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (vacío al crear)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Sender canónico + tabla de canales

- Migration: `greenhouse_core.teams_notification_channels` con columnas `channel_code` (PK), `display_name`, `secret_ref`, `logic_app_resource_id` (texto, ARM resource ID), `description`, `created_at`, `disabled_at`
- Kysely types regenerados (`pnpm db:generate-types`)
- `src/lib/integrations/teams/sender.ts` exporta `postTeamsWorkflowCard(channelCode, card)`:
  - Resuelve URL desde Secret Manager por `secret_ref` declarado en la fila del canal
  - Valida `Buffer.byteLength(body) < 26_000`; si excede, lanza `TeamsCardTooLarge`
  - POST con `Content-Type: application/json`; sobre 429, retry 3x con backoff exponencial (250ms, 1s, 4s)
  - Sobre `4xx` no-429 o `5xx` final, lanza `TeamsWorkflowError(status, body)`
  - Registra en `source_sync_runs` con `source_system='teams_notification'`, `source_object_type='teams_channel'`, success/failure y duración
- Tests Vitest con `fetch` mockeado: happy path, 429 retry, 413 oversize, missing secret, malformed card

### Slice 2 — Card templates + IaC Bicep + provisioning

- `src/lib/integrations/teams/cards/` con módulos por familia:
  - `ops-alert.ts` — error genérico con título, severity, body, deep-link a Sentry/Greenhouse
  - `finance-alert.ts` — VAT cierre, anomalía detectada, monto + período + link
  - `delivery-pulse.ts` — resumen diario de ICO con 3-5 KPIs y link al dashboard
- `src/lib/integrations/teams/types.ts` con tipos discriminados de input por template
- **Infra Bicep** en `infra/azure/teams-notifications/`:
  - `main.bicep` — orquesta RG `rg-greenhouse-teams-notifications-prod` (region `eastus`), API connection `teams-shared`, y `module` por canal
  - `modules/logic-app-channel.bicep` — recibe `channelCode`, `targetTeamId`, `targetChannelId`, crea Logic App con HTTP trigger + acción `Post adaptive card in chat or channel`
  - `parameters.prod.json` / `parameters.dev.json` — un parameter file por entorno
  - `README.md` — runbook con `az group create`, `az deployment group create`, registro de provider, OAuth interactiva inicial del Teams connector
- **GitHub Action** `.github/workflows/azure-teams-deploy.yml`: WIF (federated credential) → `az login` → `az deployment group create`. Trigger en `workflow_dispatch` y push a `main` que toque `infra/azure/teams-notifications/**`
- Migration de seed: 3 filas en `teams_notification_channels` con `secret_ref` placeholder; URLs HTTP-trigger reales se publican vía `gcloud secrets versions add` después del primer despliegue Bicep (los HTTP triggers de Logic Apps emiten URL firmada con SAS recuperable vía `az rest --method post --url <listCallbackUrl>`)
- Playbook `docs/operations/azure-teams-notifications.md`:
  - Pre-requisitos: suscripción Azure activa, providers `Microsoft.Logic` + `Microsoft.Web` registrados
  - Despliegue inicial: `gh workflow run azure-teams-deploy.yml` o manual `az deployment group create -g rg-greenhouse-teams-notifications-prod -f infra/azure/teams-notifications/main.bicep`
  - Autorización OAuth de Teams API connection (one-time, vía Azure Portal — único paso interactivo)
  - Recuperar URL del HTTP trigger: `az rest --method post --url "https://management.azure.com/<resourceId>/triggers/manual/listCallbackUrl?api-version=2016-06-01"`
  - Publicar en Secret Manager: `printf %s "$URL" | gcloud secrets versions add greenhouse-teams-<code>-webhook --data-file=-`
  - Verificación: `pnpm staging:request POST /api/admin/teams/test '{"channelCode":"ops-alerts"}'`

### Slice 3 — Outbox consumer + observabilidad

- `src/lib/sync/handlers/teams-notify.ts` registrado en `projection-registry.ts`
- Mapping declarativo `event_type → channel_code → card_template`:
  - `ops.error.unhandled` → `ops-alerts` → `ops-alert`
  - `finance.vat_position.period_materialized` → `finance-alerts` → `finance-alert`
  - `delivery.daily-pulse` (nuevo evento, emitido por cron en `ops-worker`) → `delivery-pulse` → `delivery-pulse`
- Consumer respeta `anti-ping-pong.ts`
- Tile en Admin > Ops Health: "Teams Notifications — last 24h" con success/failure count y último error por canal
- Spec arquitectura `GREENHOUSE_TEAMS_NOTIFICATIONS_V1.md` v1.0 publicada con: contrato del sender, schema de canales, infra Bicep, catálogo de eventos suscritos, troubleshooting, **trigger condicional de migración a Bot Framework / Graph RSC**

## Out of Scope

- Logic Apps / Bicep / Terraform para provisionar workflows — descartado por costo/fricción para 3-5 canales (revisitar si crece a >10)
- Microsoft Graph API directo o Bot Framework — requieren auth delegada o app registration; fuera de alcance actual
- Bidireccional / Action.Submit — los workflows webhook no entregan respuesta al backend; descartado
- Notificaciones a chats individuales o privados — empezamos con channels de Teams; chats DM en una task posterior si surge demanda
- UI in-app para que admins agreguen canales nuevos — el provisioning es manual + migration; UI puede venir después si justifica
- Migración o coexistencia con webhooks legacy — no tenemos legacy en el repo

## Detailed Spec

### Schema `teams_notification_channels` (transport-agnostic)

El schema soporta `channel_kind` discriminator desde V1 para que la migración futura a Bot Framework / Graph RSC no requiera DDL ni rewrite del sender.

```sql
CREATE TABLE greenhouse_core.teams_notification_channels (
  channel_code            text PRIMARY KEY,
  channel_kind            text NOT NULL DEFAULT 'azure_logic_app',
  display_name            text NOT NULL,
  description             text,
  secret_ref              text NOT NULL,
  logic_app_resource_id   text,
  bot_app_id              text,
  team_id                 text,
  channel_id              text,
  azure_tenant_id         text,
  azure_subscription_id   text,
  azure_resource_group    text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  disabled_at             timestamptz,
  CONSTRAINT teams_notification_channels_code_format CHECK (channel_code ~ '^[a-z0-9-]+$'),
  CONSTRAINT teams_notification_channels_kind_check CHECK (
    channel_kind IN ('azure_logic_app', 'teams_bot', 'graph_rsc')
  ),
  CONSTRAINT teams_notification_channels_kind_bot_check CHECK (
    channel_kind NOT IN ('teams_bot', 'graph_rsc')
    OR (bot_app_id IS NOT NULL AND team_id IS NOT NULL AND channel_id IS NOT NULL AND azure_tenant_id IS NOT NULL)
  )
);
```

**`channel_kind` semantics:**

| Kind | When | Transport |
|---|---|---|
| `azure_logic_app` | V1 (current) | Logic App HTTP trigger URL (Adaptive Card via Teams connector) |
| `teams_bot` | V2 (future trigger) | Bot Framework registration + Microsoft Graph `POST /teams/{team_id}/channels/{channel_id}/messages` con app-only auth |
| `graph_rsc` | V2 alt | Resource-Specific Consent (Graph app-only sin full Bot Framework) |

**Migración futura a `teams_bot`:**
1. Crear app registration en Azure AD (Bicep nuevo en `infra/azure/teams-bot/`) con `Teams.SendMessages.All` o RSC scope
2. Publicar manifest de Teams app + instalar en cada team
3. Para cada canal a migrar: `UPDATE teams_notification_channels SET channel_kind='teams_bot', bot_app_id='...', team_id='...', channel_id='...', azure_tenant_id='...', secret_ref='greenhouse-teams-bot-client-secret' WHERE channel_code='...'`
4. El sender despacha automáticamente a `sendViaBotFramework()` por el discriminator — **el call site no cambia**
5. Logic App se elimina cuando todos los canales de su RG migraron

### Sender dispatch

```ts
// src/lib/integrations/teams/sender.ts (V1)
async function postTeamsCard(channelCode: string, card: TeamsAdaptiveCard) {
  const channel = await loadChannel(channelCode)
  switch (channel.channel_kind) {
    case 'azure_logic_app': return sendViaLogicApp(channel, card)
    case 'teams_bot':       return sendViaBotFramework(channel, card)  // V2
    case 'graph_rsc':       return sendViaGraphRsc(channel, card)      // V2
  }
}
```

V1 implementa solo `sendViaLogicApp`; los otros dispatchers se agregan en TASK futura sin tocar el call site.

### Contrato del sender

```ts
// src/lib/integrations/teams/sender.ts
export interface TeamsAdaptiveCard {
  $schema?: string
  type: 'AdaptiveCard'
  version: '1.5'
  body: unknown[]
  actions?: { type: 'Action.OpenUrl'; title: string; url: string }[]
}

export async function postTeamsWorkflowCard(
  channelCode: string,
  card: TeamsAdaptiveCard,
  options?: { runContext?: { sourceEntity?: string; correlationId?: string } }
): Promise<{ ok: true; durationMs: number } | { ok: false; reason: string }>
```

### Payload final hacia el workflow

```json
{
  "type": "message",
  "attachments": [{
    "contentType": "application/vnd.microsoft.card.adaptive",
    "contentUrl": null,
    "content": { /* TeamsAdaptiveCard */ }
  }]
}
```

### Owner rotation playbook (resumen — detalle en doc operativo)

1. Antes de bajar al owner actual: agregar nuevo co-owner desde la UI de Power Automate
2. Si owner ya se fue y no hay co-owners: el workflow está perdido — recrear desde cero con misma URL output (la URL cambia; secret debe rotarse)
3. Verificación post-rotación: `pnpm staging:request POST /api/admin/teams/test '{"channelCode":"<code>"}'` debe responder 200

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Migration `teams_notification_channels` aplicada en staging y dev local
- [ ] `postTeamsWorkflowCard` enviando con éxito a los 3 canales productivos en staging
- [ ] Tests Vitest cubren: happy path, 429 retry, 413 oversize, secret missing, malformed card
- [ ] Outbox consumer `teams-notify` registrado y procesando los 3 event types definidos
- [ ] Tile "Teams Notifications" visible en Admin > Ops Health con métricas de últimas 24h
- [ ] `GREENHOUSE_TEAMS_NOTIFICATIONS_V1.md` v1.0 publicado en `docs/architecture/`
- [ ] `teams-workflow-provisioning.md` publicado en `docs/operations/` con steps reproducibles
- [ ] 3 workflows creados en Teams con service account + 2 co-owners cada uno
- [ ] Secrets `greenhouse-teams-<code>-webhook` publicados en GCP Secret Manager (efeonce-group)
- [ ] Smoke en staging: forzar un evento de cada tipo y confirmar entrega visual en el canal correspondiente

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm migrate:status` (ver nueva migration aplicada)
- `pnpm staging:request POST /api/admin/teams/test '{"channelCode":"ops-alerts"}'` → 200 + mensaje visible en canal
- `bash services/ops-worker/deploy.sh` (verificar que el bundle no rompe con el nuevo helper)
- Forzar un evento outbox de cada tipo en staging y verificar entrega visual + fila en `source_sync_runs`

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con estado real
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con learnings (especialmente owner rotation gotcha)
- [ ] `changelog.md` actualizado: nuevo canal de notificaciones outbound
- [ ] chequeo de impacto cruzado sobre TASK-128, TASK-135, TASK-149
- [ ] `TASK_ID_REGISTRY.md` actualizado a `complete`

- [ ] secrets rotables documentados en `GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md` (sección de inventario de secretos)

## Follow-ups

- Considerar Logic Apps + IaC si crecemos a >10 canales o si necesitamos VNet/managed identity
- Evaluar `Action.OpenUrl` con deep-links a vistas filtradas por evento (requiere coordinación con TASK-650 API platform read surfaces)
- Si surge demanda: enviar a chats DM (1:1) usando template `Post to a chat when a webhook request is received`
- Considerar throttling/dedup de eventos ruidosos (ej. agrupar N errores del mismo type en una sola card)

## Open Questions

- ¿Cuál es la cuenta de servicio que será owner de los workflows? (sugerido: `notifications@efeonce.org` o similar — confirmar con IT)
- ¿Qué co-owners operativos por canal? (ej. ops-alerts → 2 personas de plataforma; finance-alerts → CFO + alguien de finance ops)
- ¿Mantener un endpoint debug `/api/admin/teams/test` permanente o solo durante implementación? (default: permanente, gated a `efeonce_admin`)
- ¿El evento `delivery.daily-pulse` se emite desde un cron en `ops-worker` o desde Vercel cron? (ver constraints de duración del cron y consistencia con TASK-149)
