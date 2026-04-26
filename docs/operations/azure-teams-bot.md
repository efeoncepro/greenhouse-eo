# Runbook — Azure Teams Bot (TASK-671)

> Sibling de `docs/operations/azure-teams-notifications.md` (TASK-669, Logic Apps).
> Spec arquitectónica: `docs/architecture/GREENHOUSE_TEAMS_BOT_INTERACTION_V1.md`.

## Cuándo usar este runbook

- Provisionar el bot por primera vez en un tenant Azure (`efeoncepro.com`).
- Rotar el client_secret del app registration.
- Migrar federated credentials a una nueva fuente (Vercel, Cloud Run, GitHub Actions).
- Diagnóstico del endpoint inbound `/api/teams-bot/messaging` cuando un Action.Submit no se ejecuta.

## Pre-requisitos

| Requisito                                  | Comprobación                                                                |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| Azure CLI ≥ 2.55                           | `az version`                                                                |
| Bicep extension                            | `az bicep version`                                                          |
| Rol `Global Administrator` o `Cloud Application Administrator` en Azure AD | `az ad signed-in-user show` y validar `userPrincipalName` |
| Rol `Teams Service Administrator` en Teams Admin Center | <https://admin.teams.microsoft.com/>                          |
| Suscripción Azure activa                   | `az account show`                                                            |
| Logo definitivo (192×192 + 32×32 PNG)      | `infra/azure/teams-bot/manifest/icons/`                                     |

## Slice 1 — Provisioning del Bot Service

### 1.1 Crear el app registration de Azure AD

```bash
APP_ID=$(az ad app create \
  --display-name "Greenhouse" \
  --sign-in-audience "AzureADMyOrg" \
  --query appId -o tsv)
echo "APP_ID=$APP_ID"

# Crear service principal asociado
az ad sp create --id "$APP_ID"
```

> Capturar `APP_ID`. Será el valor de `botAppId` en `parameters.{prod,dev}.json` y de `manifest.json` (campo `id` y `bots[0].botId`).

### 1.2 Aplicar permisos de Microsoft Graph

```bash
GRAPH_APP_ID="00000003-0000-0000-c000-000000000000"

# Resolver los IDs de los application roles que necesitamos
az ad sp show --id "$GRAPH_APP_ID" --query 'appRoles[?value==`User.Read.All` || value==`Channel.ReadBasic.All` || value==`ChannelMessage.Send.Group` || value==`ChatMessage.Send.Chat` || value==`Team.ReadBasic.All` || value==`TeamsAppInstallation.ReadWriteForUser.All`]' \
  -o table
```

Para cada permiso aplicable (production: empezar con `User.Read.All` + `ChannelMessage.Send.Group` + `ChatMessage.Send.Chat`; agregar `TeamsAppInstallation.ReadWriteForUser.All` solo si Slice 7 se va a habilitar):

```bash
az ad app permission add --id "$APP_ID" \
  --api "$GRAPH_APP_ID" \
  --api-permissions "<role-uuid>=Role"

# Después de agregar todas:
az ad app permission grant --id "$APP_ID" --scope ".default" --api "$GRAPH_APP_ID"
az ad app permission admin-consent --id "$APP_ID"
```

> El comando `admin-consent` requiere el rol `Global Administrator`. Si la cuenta solo tiene `Cloud Application Administrator`, abrir <https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/CallAnAPI/appId/$APP_ID> y clickear "Grant admin consent".

### 1.3 Crear las credenciales de cliente (client_secret)

```bash
SECRET_PAYLOAD=$(az ad app credential reset --id "$APP_ID" --years 1 -o json)
CLIENT_SECRET=$(echo "$SECRET_PAYLOAD" | jq -r '.password')
TENANT_ID=$(echo "$SECRET_PAYLOAD" | jq -r '.tenant')

# Persistir como JSON blob en GCP Secret Manager (consume readBotFrameworkSecret)
printf '%s' "$(jq -nc \
  --arg cid "$APP_ID" \
  --arg sec "$CLIENT_SECRET" \
  --arg tid "$TENANT_ID" \
  '{clientId:$cid, clientSecret:$sec, tenantId:$tid}')" \
  | gcloud secrets versions add greenhouse-teams-bot-client-credentials --data-file=-
```

> ⚠️ **Higiene**: nunca pasar el secret por argumento posicional ni por `echo` (queda en shell history). Usar `printf '%s'` o leer desde `$SECRET_PAYLOAD` y borrar la variable después.

### 1.4 Deploy del Bicep stack

```bash
cd /Users/jreye/Documents/greenhouse-eo

# Setear el botAppId en parameters.prod.json
sed -i.bak "s|\"<set by post-deploy: see runbook step 1>\"|\"$APP_ID\"|" \
  infra/azure/teams-bot/parameters.prod.json

az group create --name rg-greenhouse-teams-bot-prod --location eastus

az deployment group create \
  --resource-group rg-greenhouse-teams-bot-prod \
  --template-file infra/azure/teams-bot/main.bicep \
  --parameters @infra/azure/teams-bot/parameters.prod.json
```

### 1.5 Federated credentials (recomendado para producción)

Para evitar rotar client_secret manualmente, cambiar el flow a federated credential:

```bash
# GitHub Actions (deploy desde main / develop)
az ad app federated-credential create --id "$APP_ID" --parameters @- <<EOF
{
  "name": "github-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:efeoncepro/greenhouse-eo:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}
EOF

# Cloud Run (ops-worker)
# ver: docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md §federated
```

> Nota: el code path de runtime aún consume el client_secret blob; reemplazar el blob por el resultado del federated assertion exchange es follow-up de TASK-671.

## Slice 2 — Manifest y publicación interna en Teams Admin Center

### 2.1 Reemplazar placeholders del manifest

```bash
sed -i.bak "s|REPLACE_WITH_BOT_APP_ID|$APP_ID|g" \
  infra/azure/teams-bot/manifest/manifest.json
```

### 2.2 Construir el zip

```bash
cd infra/azure/teams-bot/manifest
zip greenhouse-teams.zip manifest.json icons/icon_color.png icons/icon_outline.png
```

### 2.3 Validar antes de subir

Abrir <https://dev.teams.microsoft.com/appvalidation.html> → "Upload" → seleccionar `greenhouse-teams.zip`. Debe responder **"App package is valid"**. Si reporta errores, corregirlos antes de continuar.

### 2.4 Upload a Teams Admin Center (interactivo)

1. Login en <https://admin.teams.microsoft.com/policies/manage-apps> con cuenta `Global Administrator` o `Teams Service Administrator`.
2. Sidebar → **Teams apps** → **Manage apps**.
3. Click **"+ Upload new app"** → modal **"Upload"** (no "Submit to app catalog").
4. Subir `greenhouse-teams.zip`. Esperar el toast `Greenhouse uploaded successfully`.
5. Click sobre la app en el listado. Verificar **status = "Allowed"**. Si está "Blocked", revisar app permission policies.

### 2.5 Setup policy (opcional pero recomendado)

1. Sidebar → **Teams apps** → **Setup policies**.
2. Editar `Global (Org-wide default)` o crear `Greenhouse-internal`.
3. Bajo "Installed apps" → **Add** → Greenhouse → para auto-instalar en cada team relevante.

### 2.6 Instalación por team

Para cada team destino (Alineación, Finance ops chat, Delivery ops chat):

1. Teams desktop → click en team → `…` → **Manage team** → tab **Apps** → click **More apps**.
2. Buscar **Greenhouse** → click **Add**.

## Slice 3 — Validación post-deploy

```bash
# Probar el dispatcher contra un canal recién migrado
pnpm staging:request POST /api/admin/teams/test '{"channelCode":"ops-alerts"}'
```

Confirmar:
- El card aparece en el canal `Alineación`.
- La attribution dice **Greenhouse** (no `<usuario> a través de Flujos`).
- `source_sync_runs` registra `notes LIKE '%transport=bot_framework%surface=channel%'`.

```bash
# Verificación rápida desde la DB
pnpm pg:connect:shell <<'SQL'
SELECT started_at, status, notes
  FROM greenhouse_sync.source_sync_runs
 WHERE source_system = 'teams_notification'
 ORDER BY started_at DESC
 LIMIT 5;
SQL
```

## Slice 4 — Cutover de los 3 canales

> Pre-requisito: bot publicado e instalado en `Alineación`, Finance ops chat y Delivery ops chat. Capturar `team_id` y `channel_id` reales (Teams desktop → click derecho en el canal → "Get link to channel" → parsear `groupId` y `threadId`).

```sql
-- Conectar via pnpm pg:connect:shell (profile: ops)

UPDATE greenhouse_core.teams_notification_channels
   SET channel_kind = 'teams_bot',
       recipient_kind = 'channel',
       bot_app_id = '<APP_ID>',
       team_id = '<team-guid-alineacion>',
       channel_id = '<channel-thread-id-alineacion>',
       azure_tenant_id = 'a80bf6c1-7c45-4d70-b043-51389622a0e4',
       secret_ref = 'greenhouse-teams-bot-client-credentials',
       updated_at = now()
 WHERE channel_code = 'ops-alerts';

-- Repetir para finance-alerts y delivery-pulse con sus team_id/channel_id propios.
```

Validar 1 semana en producción con tráfico real antes del decommission.

## Slice 5 — Decommission de Logic Apps (post 1-semana de validación)

```bash
# Listar los Logic Apps todavía vivos
az resource list --resource-group rg-greenhouse-teams-notifications-prod \
  --resource-type Microsoft.Logic/workflows -o table

# Eliminar uno por uno (preserva el RG y la connection compartida por si rollback)
az resource delete --resource-group rg-greenhouse-teams-notifications-prod \
  --name gh-teams-ops-alerts-prod --resource-type Microsoft.Logic/workflows
```

Marcar TASK-669 como cerrado en `docs/tasks/README.md` y mover el archivo a `complete/`.

## Diagnóstico

### "JWT validation failed" en `/api/teams-bot/messaging`

- Revisar `process.env.GREENHOUSE_TEAMS_BOT_APP_ID` — debe matchear el `appId` del bot.
- Verificar `iss` del token; si Bot Framework introduce un nuevo issuer, agregarlo a `EXPECTED_ISSUERS` en `jwt-validator.ts`.
- Refrescar JWKS: `__resetBotFrameworkJwks()` (test only) o redeploy de Vercel.

### "missing_secret" al postear

- `gcloud secrets versions list greenhouse-teams-bot-client-credentials` — verificar que la versión `latest` no esté `DESTROYED`.
- Validar que el blob es JSON válido con las 3 claves `clientId`, `clientSecret`, `tenantId`.

### Action.Submit no ejecuta

- Buscar la fila en `teams_bot_inbound_actions` por `idempotency_key` (sha256 del activity_id|action_id|aadObjectId).
- Inspeccionar `handler_status` y `handler_error_summary` (campo redactado).
- Si `handler_status='rejected_unauthorized'` → revisar `roleCodes` / `routeGroups` del principal.

### Channel queda silencioso post-cutover

- Verificar `provisioning_status`: si está `pending_setup`, el sender hace skip silencioso (no es bug).
- `pnpm staging:request POST /api/admin/teams/test '{"channelCode":"ops-alerts"}'` para forzar un envío y leer `notes` del último `source_sync_runs`.

## Rotaciones programadas

| Recurso                                          | Frecuencia | Comando                                                                         |
| ------------------------------------------------ | ---------- | ------------------------------------------------------------------------------- |
| `greenhouse-teams-bot-client-credentials`        | 6 meses    | Slice 1.3 (regenerar `az ad app credential reset`, regenerar el blob)           |
| Federated credentials (cuando esté en operación) | N/A        | Solo se rotan si cambia el repo path o el OIDC issuer                           |

Documentar la rotación en `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`.
