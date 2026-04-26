// TASK-671 — Greenhouse Teams Bot (Bot Framework + Microsoft Graph)
//
// Provisions the Azure Bot Service that backs the "Greenhouse" bot in Microsoft
// Teams plus the federated identity wiring required by the Greenhouse runtime
// (Vercel + Cloud Run) to mint application tokens against Microsoft Graph.
//
// HIGH-LEVEL TOPOLOGY:
//
//   Greenhouse runtime  --(client_credentials)-->  login.microsoftonline.com
//                       <--(JWT)--
//                       --(Graph API)----------->  graph.microsoft.com
//                                                      |
//                                                      v
//                                                  Teams Bot (this stack)
//
// The Azure AD app registration is NOT created here — Microsoft.Graph Bicep
// extension support is preview-only and we want this template to be
// reproducible in CI without preview opt-in. The app registration is created
// once via the runbook in `README.md` (az ad app create) and its clientId is
// passed into this template as a parameter (`botAppId`). All federated
// credentials (GitHub Actions, Vercel OIDC, Cloud Run via WIF) are likewise
// applied via az cli in the post-deploy steps to keep the Bicep stack within
// the stable resource provider surface.
//
// References:
//   - docs/operations/azure-teams-bot.md (runbook)
//   - docs/architecture/GREENHOUSE_TEAMS_BOT_INTERACTION_V1.md

targetScope = 'resourceGroup'

@description('Azure region for the Bot Service (eastus is the Teams Bot Service home region).')
param location string = 'eastus'

@description('Environment label (dev | staging | prod). Drives naming.')
@allowed([
  'dev'
  'staging'
  'prod'
])
param environmentLabel string = 'prod'

@description('Display name shown in Teams attribution (must match the manifest name.short).')
param botDisplayName string = 'Greenhouse'

@description('Azure AD app registration client id created by the runbook. The app registration must have microsoftAppType=SingleTenant and the manifest must reference this same id as bots[0].botId.')
param botAppId string

@description('Azure AD tenant id of efeoncepro.com.')
param azureTenantId string

@description('URL of the Greenhouse messaging endpoint. Production uses the Vercel custom domain so Bot Framework verifies a stable URL.')
param messagingEndpoint string = 'https://greenhouse.efeoncepro.com/api/teams-bot/messaging'

@description('Description shown in the Bot Framework portal.')
param botDescription string = 'Greenhouse internal bot for ops/finance/delivery notifications and Action.Submit approvals.'

@description('Tags applied to all resources for FinOps tagging conventions.')
param tags object = {
  workload: 'greenhouse-teams-bot'
  owner: 'platform'
  taskId: 'TASK-671'
}

var botServiceName = 'gh-bot-${environmentLabel}'

resource botService 'Microsoft.BotService/botServices@2022-09-15' = {
  name: botServiceName
  location: 'global'
  tags: tags
  kind: 'azurebot'
  sku: {
    // F0 (free) is the default. Switch to S1 if Teams traffic exceeds the F0
    // quota of 10,000 messages/month per channel.
    name: 'F0'
  }
  properties: {
    displayName: botDisplayName
    description: botDescription
    msaAppId: botAppId
    msaAppTenantId: azureTenantId
    msaAppType: 'SingleTenant'
    endpoint: messagingEndpoint
    iconUrl: 'https://greenhouse.efeoncepro.com/images/teams-bot/icon-color.png'
    isStreamingSupported: false
    schemaTransformationVersion: '1.3'
  }
}

resource msTeamsChannel 'Microsoft.BotService/botServices/channels@2022-09-15' = {
  parent: botService
  name: 'MsTeamsChannel'
  location: 'global'
  properties: {
    channelName: 'MsTeamsChannel'
    properties: {
      enableCalling: false
      isEnabled: true
    }
  }
}

output botServiceResourceId string = botService.id
output botServiceName string = botService.name
output messagingEndpoint string = messagingEndpoint
output botAppId string = botAppId
