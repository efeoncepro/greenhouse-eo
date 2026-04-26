// TASK-669 — Microsoft Teams notifications channel (Azure Logic Apps Consumption)
//
// This template provisions the entire Teams notifications stack for one
// environment:
//   * a managed API connection to Microsoft Teams (single, shared)
//   * one Logic App per channel (HTTP trigger -> Post Adaptive Card to channel)
//
// The Teams API connection requires a one-time interactive OAuth consent the
// first time it is created (granted via Azure Portal by an account that owns
// the target Teams). After the consent is granted, the connection is reusable
// across deployments and channels.
//
// Outputs the per-channel ARM resource IDs so the post-deploy step can call
// `listCallbackUrl` and publish the HTTP-trigger URL to GCP Secret Manager.

targetScope = 'resourceGroup'

@description('Azure region used for the Logic Apps and Teams API connection.')
param location string = resourceGroup().location

@description('Environment label (dev | staging | prod). Drives naming.')
@allowed([
  'dev'
  'staging'
  'prod'
])
param environmentLabel string = 'prod'

@description('Channel definitions. teamId/channelId map to the Microsoft Teams team + channel that will receive the Adaptive Card.')
param channels array = [
  {
    code: 'ops-alerts'
    displayName: 'Greenhouse Ops Alerts'
    teamId: ''
    channelId: ''
  }
  {
    code: 'finance-alerts'
    displayName: 'Greenhouse Finance Alerts'
    teamId: ''
    channelId: ''
  }
  {
    code: 'delivery-pulse'
    displayName: 'Greenhouse Delivery Pulse'
    teamId: ''
    channelId: ''
  }
]

var teamsConnectionName = 'gh-teams-${environmentLabel}'
var subscriptionId = subscription().subscriptionId

resource teamsConnection 'Microsoft.Web/connections@2016-06-01' = {
  name: teamsConnectionName
  location: location
  kind: 'V1'
  properties: {
    displayName: 'Greenhouse Teams (${environmentLabel})'
    api: {
      id: subscriptionResourceId('Microsoft.Web/locations/managedApis', location, 'teams')
    }
  }
}

module channelLogicApps 'modules/logic-app-channel.bicep' = [for ch in channels: {
  name: 'la-${ch.code}'
  params: {
    location: location
    environmentLabel: environmentLabel
    channelCode: ch.code
    displayName: ch.displayName
    teamId: ch.teamId
    channelId: ch.channelId
    teamsConnectionName: teamsConnectionName
    teamsConnectionId: teamsConnection.id
    subscriptionId: subscriptionId
    resourceGroupName: resourceGroup().name
  }
}]

output teamsConnectionId string = teamsConnection.id
output channelResourceIds array = [for (ch, i) in channels: {
  channelCode: ch.code
  logicAppResourceId: channelLogicApps[i].outputs.logicAppResourceId
  logicAppName: channelLogicApps[i].outputs.logicAppName
}]
