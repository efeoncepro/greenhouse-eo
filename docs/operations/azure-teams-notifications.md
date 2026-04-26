# Azure Teams Notifications — Runbook operativo (TASK-669)

Runbook para provisionar, autorizar, rotar y verificar el canal outbound de
notificaciones a Microsoft Teams construido sobre **Azure Logic Apps Consumption**.

Spec arquitectura canónica:
[`docs/architecture/GREENHOUSE_TEAMS_NOTIFICATIONS_V1.md`](../architecture/GREENHOUSE_TEAMS_NOTIFICATIONS_V1.md).

## 1. Pre-requisitos

| Recurso | Detalle |
|---|---|
| Suscripción Azure | `Suscripción de Azure 1` (`e1cfff3e-8c21-4170-8b28-ad083b741266`) |
| Tenant | `a80bf6c1-7c45-4d70-b043-51389622a0e4` (efeoncepro.com) |
| Cuenta interactiva | `jreyes@efeoncepro.com` (admin de la suscripción) |
| Azure CLI | 2.80+ (extension `logic` se instala on-demand) |
| `gcloud` autenticado | Para publicar URLs en Secret Manager |
| Cuenta de servicio Teams | A definir (TBD por Open Question en TASK-669) — owner del Teams connector |

## 2. Despliegue inicial

### 2.1 Registrar providers (one-time per subscription)

```bash
az login
az account set --subscription "e1cfff3e-8c21-4170-8b28-ad083b741266"

az provider register --namespace Microsoft.Logic --wait
az provider register --namespace Microsoft.Web --wait
```

### 2.2 Configurar Workload Identity Federation para GitHub Actions

```bash
# 1. Crear Azure AD app registration
APP_ID=$(az ad app create --display-name "greenhouse-azure-teams-deploy" --query appId -o tsv)
SP_ID=$(az ad sp create --id "$APP_ID" --query id -o tsv)

# 2. Asignar role Contributor sobre la suscripción
az role assignment create \
  --assignee "$APP_ID" \
  --role "Contributor" \
  --scope "/subscriptions/e1cfff3e-8c21-4170-8b28-ad083b741266"

# 3. Crear federated credential (un credential por branch a permitir)
cat > /tmp/fed-cred-main.json <<EOF
{
  "name": "greenhouse-eo-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:efeoncepro/greenhouse-eo:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}
EOF

az ad app federated-credential create --id "$APP_ID" --parameters /tmp/fed-cred-main.json

# Repetir para refs/heads/develop si el GHA lo va a correr en staging
```

### 2.3 Configurar secrets en GitHub

Repo settings -> Secrets and variables -> Actions -> add:

| Secret | Valor |
|---|---|
| `AZURE_CLIENT_ID` | `$APP_ID` (output del paso 2.2) |
| `AZURE_TENANT_ID` | `a80bf6c1-7c45-4d70-b043-51389622a0e4` |
| `AZURE_SUBSCRIPTION_ID` | `e1cfff3e-8c21-4170-8b28-ad083b741266` |

### 2.4 Llenar parameters file

Editar `infra/azure/teams-notifications/parameters.prod.json` y reemplazar
`REPLACE_TEAM_GUID` / `REPLACE_CHANNEL_GUID` con los GUIDs de Teams.

**Cómo obtener los GUIDs:**
1. Abrir Teams desktop
2. Click derecho sobre el canal -> "Get link to channel"
3. La URL es del estilo `https://teams.microsoft.com/l/channel/19%3A...%40thread.tacv2/Ops%20Alerts?groupId=<TEAM_GUID>&tenantId=...`
4. `groupId` (URL-decodeado) = `team_id`
5. La porción `19:...@thread.tacv2` = `channel_id`

### 2.5 Desplegar

```bash
# Vía GitHub Actions (recomendado)
gh workflow run azure-teams-deploy.yml -f environment=production

# O manual (break-glass)
az group create \
  --name rg-greenhouse-teams-notifications-prod \
  --location eastus

az deployment group create \
  --resource-group rg-greenhouse-teams-notifications-prod \
  --template-file infra/azure/teams-notifications/main.bicep \
  --parameters infra/azure/teams-notifications/parameters.prod.json
```

## 3. Autorización OAuth del Teams connector (one-time)

> **Es el único paso interactivo del setup. No automatizable hoy.**

1. Azure Portal -> Resource Group `rg-greenhouse-teams-notifications-prod`
2. Click en el recurso `gh-teams-prod` (tipo `Microsoft.Web/connections`)
3. "Edit API connection" -> botón "Authorize"
4. Sign in con la **cuenta de servicio** que tiene membership en los Teams target
   (no usar cuenta personal de un humano que pueda dejar la org)
5. Aceptar permisos -> "Save"

Después de este paso, todos los Logic Apps en el RG pueden postear via la connection compartida.

## 4. Recuperar URL HTTP-trigger y publicar en Secret Manager

```bash
SUB_ID="e1cfff3e-8c21-4170-8b28-ad083b741266"
RG="rg-greenhouse-teams-notifications-prod"

for CODE in ops-alerts finance-alerts delivery-pulse; do
  WORKFLOW="gh-prod-${CODE}"
  echo "Recuperando callback URL para ${WORKFLOW}..."

  CALLBACK_URL=$(az rest --method post \
    --url "https://management.azure.com/subscriptions/${SUB_ID}/resourceGroups/${RG}/providers/Microsoft.Logic/workflows/${WORKFLOW}/triggers/manual/listCallbackUrl?api-version=2016-06-01" \
    --query value -o tsv)

  if [ -z "$CALLBACK_URL" ]; then
    echo "ERROR: callback URL vacia para $WORKFLOW"
    continue
  fi

  printf %s "$CALLBACK_URL" | gcloud secrets versions add \
    "greenhouse-teams-${CODE}-webhook" \
    --data-file=- \
    --project=efeonce-group

  echo "Publicado greenhouse-teams-${CODE}-webhook"
done
```

> **Hygiene check obligatorio**: las URLs deben quedar como scalar crudo, sin
> comillas envolventes ni `\n`. Verificar con `gcloud secrets versions access latest --secret=greenhouse-teams-<code>-webhook | head -c 80`.

## 5. Actualizar el registry de canales

```sql
UPDATE greenhouse_core.teams_notification_channels
   SET logic_app_resource_id = '/subscriptions/e1cfff3e-8c21-4170-8b28-ad083b741266/resourceGroups/rg-greenhouse-teams-notifications-prod/providers/Microsoft.Logic/workflows/gh-prod-ops-alerts',
       azure_subscription_id = 'e1cfff3e-8c21-4170-8b28-ad083b741266',
       azure_resource_group = 'rg-greenhouse-teams-notifications-prod'
 WHERE channel_code = 'ops-alerts';

-- Repetir para finance-alerts y delivery-pulse cambiando el workflow name.
```

Conexión a la DB:

```bash
pnpm pg:connect:shell
```

## 6. Smoke end-to-end

```bash
# Local (dev server corriendo en :3000)
curl -s -X POST http://localhost:3000/api/admin/teams/test \
  -H 'Content-Type: application/json' \
  -b "next-auth.session-token=<your-session>" \
  -d '{"channelCode":"ops-alerts"}'

# Staging (con bypass de Vercel SSO)
pnpm staging:request POST /api/admin/teams/test '{"channelCode":"ops-alerts"}'
```

Respuesta esperada:

```json
{
  "ok": true,
  "channelCode": "ops-alerts",
  "channelKind": "azure_logic_app",
  "durationMs": 540,
  "attempts": 1
}
```

Verificación visual: el card aparece en el canal Teams en <2 segundos.

Verificar tracking en `source_sync_runs`:

```sql
SELECT sync_run_id, status, started_at, finished_at, notes
  FROM greenhouse_sync.source_sync_runs
 WHERE source_system = 'teams_notification'
 ORDER BY started_at DESC
 LIMIT 5;
```

## 7. Rotación de secretos

### 7.1 URL HTTP-trigger del Logic App

Las URLs HTTP-trigger no expiran automáticamente, pero pueden regenerarse si se sospecha leak.

```bash
# 1. Regenerar secret access keys del Logic App
az rest --method post \
  --url "https://management.azure.com/subscriptions/${SUB_ID}/resourceGroups/${RG}/providers/Microsoft.Logic/workflows/gh-prod-ops-alerts/regenerateAccessKey?api-version=2016-06-01" \
  --body '{"keyType":"Primary"}'

# 2. Recuperar nueva URL (paso 4)
# 3. Publicar nueva versión del secret en GCP
# 4. La cache del sender (60s default) se invalida automáticamente
```

### 7.2 Connection authorization

Si la cuenta de servicio que autorizó el Teams connector deja la org:

1. Azure Portal -> connection `gh-teams-prod`
2. "Edit API connection" -> "Authorize" con la nueva cuenta de servicio
3. Save

Las URLs HTTP-trigger no cambian; no hay que rotar Secret Manager.

## 8. Troubleshooting

| Síntoma | Causa probable | Fix |
|---|---|---|
| `missing_secret` desde el sender | Secret no publicado o vacío | Re-correr paso 4 |
| `http_error 401` | Connection no autorizada | Re-correr paso 3 |
| `http_error 403` | URL truncada (newline) o secret_ref incorrecto | `gcloud secrets versions access latest --secret=...` y comparar con la URL real del Logic App |
| `http_error 404` | Workflow eliminado o renombrado | Verificar `az resource show` y re-publicar URL |
| `http_error 429` persistente | Storm de eventos | Reducir frecuencia o subir trigger threshold; eventualmente migrar a Bot Framework |
| Card no aparece en Teams pero `outcome.ok=true` | Card_id (channel_id) incorrecto en parameters file | Re-confirmar GUIDs del paso 2.4 + redeploy Bicep |
| Logic App "Failed" en Azure Portal | Card payload mal formado | Inspeccionar el run en Azure Portal -> "See trigger history" -> abrir el run fallido |

## 9. Rollback

Para deshabilitar un canal sin eliminar el Logic App:

```sql
UPDATE greenhouse_core.teams_notification_channels
   SET disabled_at = NOW()
 WHERE channel_code = 'ops-alerts';
```

El sender retorna `channel_disabled` sin postear; el resto del canal queda intacto y se puede reactivar con `UPDATE ... SET disabled_at = NULL`.

Para eliminar la infra completa:

```bash
az group delete --name rg-greenhouse-teams-notifications-prod --yes
```

(Las URLs HTTP-trigger quedan inválidas inmediatamente; los secrets en GCP se pueden archivar con `gcloud secrets versions disable`.)
