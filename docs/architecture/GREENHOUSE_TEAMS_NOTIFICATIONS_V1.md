# GREENHOUSE_TEAMS_NOTIFICATIONS_V1

> **Tipo de documento:** Spec arquitectura canónica
> **Versión:** 1.0
> **Creado:** 2026-04-26 por TASK-669 (Claude)
> **Estado:** vigente

## 1. Propósito

Definir el canal canónico de notificaciones outbound de Greenhouse hacia Microsoft Teams: cómo el backend (Vercel + Cloud Run `ops-worker`) postea Adaptive Cards 1.5 a canales específicos en respuesta a eventos del outbox, con higiene de secretos, observabilidad y un schema transport-agnostic que permite migrar a Bot Framework / Graph RSC sin DDL ni rewrite del call site.

## 2. Decisión arquitectónica

| Aspecto | Decisión | Razón |
|---|---|---|
| Transport V1 | Azure Logic Apps Consumption (uno por canal) provisionados vía Bicep | IaC en git, service principal como owner, costo $1-5/mes, suscripción Azure ya provisionada |
| Schema | `greenhouse_core.teams_notification_channels` con `channel_kind` discriminator | Permite swap a `teams_bot` / `graph_rsc` actualizando una fila + secret, sin migración |
| Adaptive Card | Versión 1.5 | Versión soportada estable en Teams 2026 |
| Auth backend → Logic App | URL HTTP-trigger firmada con SAS, almacenada en GCP Secret Manager | Sin headers extra, sin OAuth, sin token refresh |
| Auth Teams API connection | OAuth interactivo one-time (Azure Portal) por la cuenta de servicio | Limitación inherente del connector Teams; no automatizable hoy |
| Observabilidad | `greenhouse_sync.source_sync_runs` con `source_system='teams_notification'` | Reutiliza la misma instrumentación que outbox, projections y reactive worker |
| Trigger condicional para migrar a Bot Framework / Graph RSC | >15 canales activos OR `Action.Submit` interactivo OR multi-tenant externo | Sweet spot pragmático para el alcance actual (3-5 canales internos one-way) |

> Detalle técnico: la decisión completa con comparativa entre Workflows app (Power Automate), Logic Apps, Bot Framework y Graph RSC vive en [`docs/tasks/to-do/TASK-669-teams-workflow-notifications-channel.md`](../tasks/to-do/TASK-669-teams-workflow-notifications-channel.md) sección "Architectural Decision".

## 3. Modelo de datos

### `greenhouse_core.teams_notification_channels`

Lookup transport-agnostic. Un row por canal de Teams.

| Columna | Tipo | Notas |
|---|---|---|
| `channel_code` | text PK | Snake-kebab, ej. `ops-alerts`, `finance-alerts`, `delivery-pulse`. Lo usa el sender como key. |
| `channel_kind` | text | `azure_logic_app` (V1) \| `teams_bot` (V2) \| `graph_rsc` (V2 alt). CHECK constraint. |
| `display_name` | text | Para UI de admin. |
| `description` | text \| null | Qué tipo de eventos recibe. |
| `secret_ref` | text | Nombre del secret en GCP Secret Manager (URL HTTP trigger para `azure_logic_app`; client secret/federated cred para `teams_bot`). |
| `logic_app_resource_id` | text \| null | ARM resource ID del Logic App provisionado (informativo, traceability). |
| `bot_app_id` | text \| null | Azure AD app registration client id cuando `channel_kind='teams_bot'`. |
| `team_id` | text \| null | Required para `teams_bot` / `graph_rsc`. |
| `channel_id` | text \| null | Required para `teams_bot` / `graph_rsc`. |
| `azure_tenant_id` | text \| null | Required para `teams_bot` / `graph_rsc`. |
| `azure_subscription_id`, `azure_resource_group` | text \| null | Para traceability. |
| `disabled_at` | timestamptz \| null | Soft disable; el sender retorna `channel_disabled` sin postear. |

CHECK constraints:
- `channel_code` matches `^[a-z0-9-]+$`
- `channel_kind IN ('azure_logic_app', 'teams_bot', 'graph_rsc')`
- Si `channel_kind ∈ {'teams_bot','graph_rsc'}` → `bot_app_id`, `team_id`, `channel_id`, `azure_tenant_id` NOT NULL

> Detalle técnico: migración en [`migrations/20260426113919596_create-teams-notification-channels.sql`](../../migrations/20260426113919596_create-teams-notification-channels.sql). Tipos generados en [`src/types/db.d.ts`](../../src/types/db.d.ts) como `GreenhouseCoreTeamsNotificationChannels`.

## 4. Contrato del sender

### API canónica

```ts
import { postTeamsCard, type TeamsAdaptiveCard } from '@/lib/integrations/teams'

await postTeamsCard('ops-alerts', card, {
  correlationId: 'event-id-or-similar',
  triggeredBy: 'projection:teams_notify',
  syncMode: 'reactive' | 'manual' | 'cron'
})
```

El sender retorna un `TeamsSendOutcome` discriminated union:

```ts
| { ok: true; channelCode; channelKind; durationMs; attempts }
| { ok: false; reason: 'channel_not_found' | 'channel_disabled' | 'unsupported_channel_kind' |
                       'missing_secret' | 'card_too_large' | 'http_error' | 'transport_error';
    channelCode; channelKind; durationMs; attempts; detail }
```

### Garantías del sender

- **Tamaño**: rechaza payloads >26.000 bytes con `card_too_large` (margen vs el límite de Teams de 28.672 bytes).
- **Rate limit**: maneja 429 con backoff exponencial 250ms → 1s → 4s, máximo 3 intentos.
- **5xx**: idéntico al 429.
- **Sync run**: cada llamada inserta un row en `greenhouse_sync.source_sync_runs` con `source_system='teams_notification'`, `source_object_type='teams_channel'`, `triggered_by`, `notes` (correlation/channel/kind), y actualiza `status` + `finished_at` al cerrar.
- **Dispatch por `channel_kind`**: V1 implementa solo `sendViaLogicApp`. `teams_bot` y `graph_rsc` retornan `unsupported_channel_kind` hasta que se materialicen los dispatchers.

> Detalle técnico: implementación en [`src/lib/integrations/teams/sender.ts`](../../src/lib/integrations/teams/sender.ts). Tipos en [`src/lib/integrations/teams/types.ts`](../../src/lib/integrations/teams/types.ts). Tests en [`src/lib/integrations/teams/__tests__/`](../../src/lib/integrations/teams/__tests__/).

### Card builders disponibles

| Builder | Canal target | Input principal |
|---|---|---|
| `buildOpsAlertCard` | `ops-alerts` | `{ title, message, severity, source, occurredAt, environment?, facts?, actionUrl? }` |
| `buildFinanceAlertCard` | `finance-alerts` | `{ kind, title, summary, period?, amountCLP?, amountUSD?, entity?, occurredAt, detailUrl? }` |
| `buildDeliveryPulseCard` | `delivery-pulse` | `{ date, headline, summary, kpis[], alerts?, dashboardUrl? }` |

> Detalle técnico: builders en [`src/lib/integrations/teams/cards/`](../../src/lib/integrations/teams/cards/). Todos producen `TeamsAdaptiveCard` (Adaptive Card 1.5 con `Container`, `TextBlock`, `FactSet` y `Action.OpenUrl`).

## 5. Catálogo de eventos suscritos

La projection `teams_notify` ([`src/lib/sync/projections/teams-notify.ts`](../../src/lib/sync/projections/teams-notify.ts)) consume los siguientes eventos del outbox y los enruta al canal correspondiente:

| Evento | Canal | Card builder |
|---|---|---|
| `ops.error.unhandled` | `ops-alerts` | `buildOpsAlertCard` |
| `ops.recovery.executed` | `ops-alerts` | `buildOpsAlertCard` |
| `platform.alert.raised` | `ops-alerts` | `buildOpsAlertCard` |
| `finance.vat_position.period_materialized` | `finance-alerts` | `buildFinanceAlertCard` |
| `finance.balance_divergence.detected` | `finance-alerts` | `buildFinanceAlertCard` |
| `finance.sii_claim.detected` | `finance-alerts` | `buildFinanceAlertCard` |
| `finance.fx_sync.all_providers_failed` | `finance-alerts` | `buildFinanceAlertCard` |
| `accounting.margin_alert.triggered` | `finance-alerts` | `buildFinanceAlertCard` |
| `finance.dte.discrepancy_found` | `finance-alerts` | `buildFinanceAlertCard` |
| `delivery.daily_pulse.materialized` | `delivery-pulse` | `buildDeliveryPulseCard` |

Para agregar un evento nuevo: editar el mapping en `teams-notify.ts` (no requiere migración ni cambio en la registry de projections).

## 6. Infraestructura Azure

### Stack Bicep

```
infra/azure/teams-notifications/
├── main.bicep                      # RG-scope orchestrator: API connection + N Logic Apps
├── modules/logic-app-channel.bicep # Per-channel Logic App (HTTP trigger -> Teams connector)
├── parameters.prod.json
└── parameters.dev.json
```

Provisiona:
1. `Microsoft.Web/connections` (uno compartido) — connector Teams
2. `Microsoft.Logic/workflows` (uno por canal) — Logic App Consumption con HTTP trigger + acción `Post adaptive card in chat or channel`

### Pipeline de despliegue

`.github/workflows/azure-teams-deploy.yml` ejecuta:
1. `az bicep build` (validate)
2. `az login` vía Workload Identity Federation (sin client secret)
3. `az provider register --namespace Microsoft.Logic --wait`
4. `az group create` (idempotente)
5. `az deployment group create` con el parameters file del entorno

> Detalle técnico: runbook completo (incluyendo OAuth one-time del Teams connector y publicación de URLs en Secret Manager) en [`docs/operations/azure-teams-notifications.md`](../operations/azure-teams-notifications.md) y [`infra/azure/teams-notifications/README.md`](../../infra/azure/teams-notifications/README.md).

### Secretos requeridos

| Secret (GCP Secret Manager) | Contenido | Consumer |
|---|---|---|
| `greenhouse-teams-ops-alerts-webhook` | URL HTTP-trigger del Logic App `gh-prod-ops-alerts` | `postTeamsCard('ops-alerts', ...)` |
| `greenhouse-teams-finance-alerts-webhook` | URL HTTP-trigger del Logic App `gh-prod-finance-alerts` | `postTeamsCard('finance-alerts', ...)` |
| `greenhouse-teams-delivery-pulse-webhook` | URL HTTP-trigger del Logic App `gh-prod-delivery-pulse` | `postTeamsCard('delivery-pulse', ...)` |

Higiene canónica (idéntica al resto del repo): scalar crudo, sin comillas envolventes, sin `\n` literal:

```bash
printf %s "$URL" | gcloud secrets versions add greenhouse-teams-<code>-webhook --data-file=-
```

Secret Manager bindings (Vercel runtime + Cloud Run `ops-worker`) ya tienen `roles/secretmanager.secretAccessor` sobre los secrets `greenhouse-*`; no requiere IAM nuevo.

## 7. Observabilidad

### Tile en Admin > Ops Health

Subsistema "Teams Notifications" en `/admin/ops-health` con:
- Status: `healthy` / `degraded` / `idle` / `not_configured` (lógica `deriveHealth` compartida)
- Procesados / Fallidos en las últimas 24 horas
- Last run timestamp (max `COALESCE(finished_at, started_at)` sobre `source_sync_runs`)

> Detalle técnico: query en [`src/lib/operations/get-operations-overview.ts`](../../src/lib/operations/get-operations-overview.ts), render en [`src/views/greenhouse/admin/AdminOpsHealthView.tsx`](../../src/views/greenhouse/admin/AdminOpsHealthView.tsx).

### Endpoint de prueba

`POST /api/admin/teams/test` (gated a `requireAdminTenantContext`):

```bash
pnpm staging:request POST /api/admin/teams/test '{"channelCode":"ops-alerts"}'
```

Postea un Adaptive Card `info` con metadata del entorno y el actor que lo dispara. Útil para validar URL secret + Logic App + Teams connector end-to-end después de un despliegue Bicep o rotación de secret.

## 8. Migración futura a Bot Framework

> **Status (2026-04-26):** programada como [TASK-671 — Greenhouse Teams Bot Platform](../tasks/to-do/TASK-671-greenhouse-teams-bot-platform.md). El trigger #4 (branding canónico) ya se cumplió en el live test de TASK-669, donde el post salió como `<usuario humano> a través de Flujos de trabajo` — feedback explícito del usuario que justificó priorizar la migración a P2.

Triggers condicionales documentados (cualquiera basta para promover la migración):

1. **>15 canales activos** — provisioning manual + connector OAuth se vuelve inmanejable
2. **`Action.Submit` interactivo** — necesidad de botones que ejecuten acciones en Greenhouse (aprobaciones, snooze, mark-read)
3. **Multi-tenant externo** — clientes Globe recibiendo notificaciones desde Greenhouse en sus tenants
4. **Branding canónico** — eliminar la attribution "via Flujos de trabajo" y postear como bot `Greenhouse` con avatar custom (Microsoft no permite quitar esa attribution en Logic Apps / Power Automate)
5. **Routing 1:1 por persona** — postear DM al colaborador específico (no solo a canales fijos), mapeando `team_members.member_id → client_users.microsoft_oid → Microsoft Graph user`

Camino:
1. Crear `infra/azure/teams-bot/` Bicep stack: Azure AD app registration + Bot Service + Federated Credentials
2. Subir manifest de Teams app + IT Admin de efeoncepro aprueba + instalar app en cada team
3. Implementar `sendViaBotFramework(channel, card)` en el sender (auth app-only via OAuth2 client_credentials)
4. Para cada canal a migrar:
   ```sql
   UPDATE greenhouse_core.teams_notification_channels
      SET channel_kind = 'teams_bot',
          bot_app_id = '<azure-ad-client-id>',
          team_id = '<team-guid>',
          channel_id = '<channel-guid>',
          azure_tenant_id = '<tenant-id>',
          secret_ref = 'greenhouse-teams-bot-client-secret'
    WHERE channel_code = '<code>';
   ```
5. **Call sites de `postTeamsCard` no cambian** — el sender despacha por `channel_kind`
6. Decommissionar Logic App correspondiente cuando el canal esté en `teams_bot`

## 9. Limitaciones conocidas

- **OAuth one-time del Teams connector**: la primera vez que se crea `Microsoft.Web/connections` para Teams, una persona debe autorizar manualmente desde Azure Portal con una cuenta que tenga acceso a los Teams target. Cuenta de servicio recomendada: `notifications@efeoncepro.com` (a confirmar con IT — Open Question en TASK-669).
- **Rate limit**: 4 req/s por Logic App. Si en algún momento se quiere ráfaga >4 cards/s, hay que dispersar entre Logic Apps o migrar a Bot Framework.
- **`Action.Submit` no funciona**: los workflows webhook (Logic App o Power Automate) no entregan respuesta del botón al backend. Solo `Action.OpenUrl` es útil. Migrar a Bot Framework si se necesita interactividad.
- **Tamaño máximo 28.672 bytes**: el sender rechaza >26.000 con margen. Cards muy ricos (sankey, calendar) probablemente excedan; mantener cards en 5-8 elementos.

## 10. Documentación funcional

Documento funcional en lenguaje simple para usuarios operativos: pendiente. Se redactará como follow-up cuando los canales estén productivos y se haya validado el playbook de OAuth.

## 11. Cambios

- **v1.0 (2026-04-26)** — Documento inicial. Spec creada junto con TASK-669.
