# Greenhouse Teams Notifications — Bicep IaC (TASK-669)

Provisions one Azure Logic App (Consumption) per Microsoft Teams notification
channel plus the shared Teams API connection. The HTTP-trigger callback URL of
each Logic App is the secret that Greenhouse stores in GCP Secret Manager and
the runtime sender (`src/lib/integrations/teams/sender.ts`) resolves at send
time.

## Layout

```
infra/azure/teams-notifications/
├── main.bicep                          # Resource Group scope orchestrator
├── modules/
│   └── logic-app-channel.bicep         # Per-channel Logic App
├── parameters.prod.json
├── parameters.dev.json
└── README.md (this file)
```

## Pre-requisites (one-time per subscription)

```bash
# Set active subscription
az account set --subscription "$AZURE_SUBSCRIPTION_ID"

# Register the Microsoft.Logic + Microsoft.Web providers (idempotent, ~2-5 min)
az provider register --namespace Microsoft.Logic --wait
az provider register --namespace Microsoft.Web --wait

# Create the resource group (eastus chosen for managed Teams connector availability)
az group create \
  --name rg-greenhouse-teams-notifications-prod \
  --location eastus \
  --tags greenhouse:component=teams-notification greenhouse:environment=prod
```

## Filling parameter files

Replace `REPLACE_TEAM_GUID` / `REPLACE_CHANNEL_GUID` for each channel with the
Microsoft Teams team and channel GUIDs (visible from Teams desktop:
right-click channel -> "Get link to channel" -> the URL contains
`/threads/19:.../?tenantId=...&groupId=...`).

The `groupId` query-string param is the team GUID; the `19:...@thread.tacv2`
fragment is the channel GUID.

## Deploy

### Manual (first-time / break-glass)

```bash
az deployment group create \
  --resource-group rg-greenhouse-teams-notifications-prod \
  --template-file infra/azure/teams-notifications/main.bicep \
  --parameters infra/azure/teams-notifications/parameters.prod.json
```

### Via GitHub Actions (default)

```bash
gh workflow run azure-teams-deploy.yml -f environment=production
```

The workflow uses Workload Identity Federation (WIF). See
`.github/workflows/azure-teams-deploy.yml` for the federated credential setup.

## One-time OAuth consent for the Teams API connection

The first deployment creates a `Microsoft.Web/connections` resource in an
unauthorized state. An account that owns the target Teams must grant consent:

1. Open Azure Portal -> Resource Group `rg-greenhouse-teams-notifications-prod`
2. Open the connection `gh-teams-prod`
3. "Edit API connection" -> "Authorize" -> sign in with the service account
   that has Teams membership (e.g. `notifications@efeoncepro.com`)
4. Save

After this, every Logic App in this RG can post adaptive cards through the
shared connection without further interaction. If the account is decommissioned,
re-authorize from a different account that has the same Teams access. There is
no automated way to do this consent step today.

## Recover the HTTP-trigger callback URL and publish to GCP Secret Manager

```bash
# For each channel:
SUB_ID="$(az account show --query id -o tsv)"
RG="rg-greenhouse-teams-notifications-prod"
WORKFLOW_NAME="gh-prod-ops-alerts"

CALLBACK_URL="$(az rest --method post \
  --url "https://management.azure.com/subscriptions/${SUB_ID}/resourceGroups/${RG}/providers/Microsoft.Logic/workflows/${WORKFLOW_NAME}/triggers/manual/listCallbackUrl?api-version=2016-06-01" \
  --query value -o tsv)"

# Publish to GCP Secret Manager (raw scalar — no quotes, no \n, no whitespace)
printf %s "${CALLBACK_URL}" | gcloud secrets versions add \
  greenhouse-teams-ops-alerts-webhook --data-file=-
```

Verify the runtime can reach the URL:

```bash
pnpm staging:request POST /api/admin/teams/test '{"channelCode":"ops-alerts"}'
```

## Update the Postgres registry

Once a Logic App is deployed and its callback URL is published, update the
`logic_app_resource_id` column for traceability between the deployed Logic
App, the registry row and the secret:

```sql
UPDATE greenhouse_core.teams_notification_channels
   SET logic_app_resource_id = '/subscriptions/.../providers/Microsoft.Logic/workflows/gh-prod-ops-alerts',
       azure_subscription_id = '<SUB_ID>',
       azure_resource_group = 'rg-greenhouse-teams-notifications-prod'
 WHERE channel_code = 'ops-alerts';
```

## Future migration to Bot Framework

This stack is for `channel_kind = 'azure_logic_app'`. When we hit the trigger
condition documented in TASK-669 (>15 channels OR need for `Action.Submit`
interactivity), a sibling stack at `infra/azure/teams-bot/` will provision an
Azure AD app registration + Bot Service + Federated Credentials, and the
runtime sender's `sendViaBotFramework` dispatcher will take over without any
changes at the call site.
