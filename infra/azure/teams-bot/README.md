# Greenhouse Teams Bot — Bicep stack

TASK-671. Provisions the Azure Bot Service that backs the **Greenhouse** Microsoft
Teams bot. Sibling stack to `infra/azure/teams-notifications/` (Logic Apps), which
remains operational while migration completes.

## Pre-requisites

1. Azure CLI ≥ 2.55 + `az bicep install`
2. Global Admin (or Cloud Application Admin) role on `efeoncepro.com` Azure AD
3. Teams Admin role for manifest upload to Teams Admin Center
4. Resource group `rg-greenhouse-teams-bot-prod` already created in `eastus`

## Topology

```
.
├── main.bicep                # Bot Service + MsTeams channel
├── modules/                  # (reserved for future split)
├── manifest/
│   ├── manifest.json         # Teams app manifest (v1.17)
│   └── icons/                # 192x192 + 32x32 PNGs (transparent)
├── parameters.prod.json
└── parameters.dev.json
```

## Step-by-step deploy

### 1. Create the Azure AD app registration (one-time, runbook)

> Bicep cannot create app registrations on the stable surface. We use az cli.

```bash
az ad app create \
  --display-name "Greenhouse" \
  --sign-in-audience "AzureADMyOrg" \
  --required-resource-accesses '[{
    "resourceAppId": "00000003-0000-0000-c000-000000000000",
    "resourceAccess": [
      {"id":"a82116e5-55eb-4c41-a434-62fe8a61c773","type":"Role"},
      {"id":"243cded2-bd16-4fd6-a953-ff8177894c3d","type":"Role"},
      {"id":"4c87e3-b72e-…", "type":"Role"}
    ]
  }]'
```

> The `resourceAccess` ids above are placeholders — populate from
> `az ad sp show --id 00000003-0000-0000-c000-000000000000 --query 'appRoles'`
> after picking the exact RSC + admin scopes from `azure-teams-bot.md`.

Capture the resulting `appId` (also called the bot's "Microsoft App ID"). Set it
as the `botAppId` value in `parameters.{prod,dev}.json` and replace the
`REPLACE_WITH_BOT_APP_ID` markers in `manifest/manifest.json`.

### 2. Create a client secret (or federated credential) and store it

```bash
# Option A — client secret (rotate every 6 months)
az ad app credential reset --id <APP_ID> --years 1
# Capture {appId, password, tenant}

# Persist in GCP Secret Manager as a JSON blob the runtime can parse:
printf '%s' '{"clientId":"<APP_ID>","clientSecret":"<password>","tenantId":"a80bf6c1-7c45-4d70-b043-51389622a0e4"}' \
  | gcloud secrets versions add greenhouse-teams-bot-client-credentials --data-file=-
```

> Option B — federated credential (production target). Skips client secret entirely
> by federating Vercel OIDC + Cloud Run WIF + GitHub Actions to the app
> registration. See `docs/operations/azure-teams-bot.md` § "Federated credentials".

### 3. Deploy the Bot Service

```bash
az login
az account set --subscription "$AZURE_SUBSCRIPTION_ID"

az group create --name rg-greenhouse-teams-bot-prod --location eastus

az deployment group create \
  --resource-group rg-greenhouse-teams-bot-prod \
  --template-file main.bicep \
  --parameters @parameters.prod.json
```

### 4. Validate + upload manifest

```bash
# Build the manifest zip (no subdirectories at the root of the zip)
cd infra/azure/teams-bot/manifest
zip greenhouse-teams.zip manifest.json icons/icon_color.png icons/icon_outline.png

# Validate
open https://dev.teams.microsoft.com/appvalidation.html
```

Then upload via Teams Admin Center → Teams apps → Manage apps → "Upload new app".
See `docs/operations/azure-teams-bot.md` for the full GUI walkthrough.

### 5. Cut over the existing channels

```sql
-- Run with greenhouse_ops profile via pnpm pg:connect:shell
UPDATE greenhouse_core.teams_notification_channels
   SET channel_kind   = 'teams_bot',
       recipient_kind = 'channel',
       bot_app_id     = '<APP_ID>',
       team_id        = '<team-guid>',
       channel_id     = '<channel-thread-id>',
       azure_tenant_id = 'a80bf6c1-7c45-4d70-b043-51389622a0e4',
       secret_ref     = 'greenhouse-teams-bot-client-credentials'
 WHERE channel_code = 'ops-alerts';
-- Repeat for finance-alerts and delivery-pulse.
```

## Decommission of the Logic Apps stack

After 1 week of validation in production with attribution showing **Greenhouse**
(no "via Workflows"), delete the legacy resources:

```bash
az resource delete --resource-group rg-greenhouse-teams-notifications-prod \
  --name <logic-app-name> --resource-type Microsoft.Logic/workflows
```

The Bicep stack at `infra/azure/teams-notifications/` stays in the repo as a
historical reference (and to keep TASK-669's runbook reproducible if we ever
need to roll back).
