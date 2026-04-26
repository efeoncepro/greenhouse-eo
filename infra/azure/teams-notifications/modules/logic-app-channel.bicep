// Logic App (Consumption) for a single Teams notification channel.
//
// Workflow shape:
//   1. HTTP trigger (manual) — accepts the Greenhouse adaptive-card payload
//      ({ "type": "message", "attachments": [{ contentType: "application/vnd.microsoft.card.adaptive", content: <AdaptiveCard> }] })
//   2. Action `Post adaptive card in a chat or channel` from the Teams
//      connector, posting the inbound card to the configured team + channel.
//
// The HTTP-trigger URL is recovered post-deploy with:
//   az rest --method post \
//     --url "https://management.azure.com/<logicAppResourceId>/triggers/manual/listCallbackUrl?api-version=2016-06-01"
// and published to GCP Secret Manager (greenhouse-teams-<channelCode>-webhook).

targetScope = 'resourceGroup'

@description('Azure region used for the Logic App.')
param location string

@description('Environment label (dev | staging | prod) for naming.')
param environmentLabel string

@description('Stable channel code (matches greenhouse_core.teams_notification_channels.channel_code).')
param channelCode string

@description('Friendly display name for the Logic App.')
param displayName string

@description('Microsoft Teams team GUID receiving the card.')
param teamId string

@description('Microsoft Teams channel GUID receiving the card.')
param channelId string

@description('Name of the shared Teams API connection (Microsoft.Web/connections).')
param teamsConnectionName string

@description('Resource ID of the shared Teams API connection.')
param teamsConnectionId string

@description('Subscription ID where the Teams managed API lives.')
param subscriptionId string

@description('Resource group name (used to build connection metadata).')
param resourceGroupName string

var workflowName = 'gh-${environmentLabel}-${channelCode}'

resource logicApp 'Microsoft.Logic/workflows@2019-05-01' = {
  name: workflowName
  location: location
  tags: {
    'greenhouse:channel-code': channelCode
    'greenhouse:component': 'teams-notification'
    'greenhouse:environment': environmentLabel
  }
  properties: {
    state: 'Enabled'
    definition: {
      '$schema': 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#'
      contentVersion: '1.0.0.0'
      parameters: {
        '$connections': {
          defaultValue: {}
          type: 'Object'
        }
      }
      triggers: {
        manual: {
          type: 'Request'
          kind: 'Http'
          inputs: {
            schema: {
              type: 'object'
              properties: {
                type: { type: 'string' }
                attachments: {
                  type: 'array'
                  items: {
                    type: 'object'
                    properties: {
                      contentType: { type: 'string' }
                      content: { type: 'object' }
                    }
                  }
                }
              }
            }
          }
        }
      }
      actions: {
        Post_adaptive_card_in_a_chat_or_channel: {
          type: 'ApiConnection'
          inputs: {
            host: {
              connection: {
                name: '@parameters(\'$connections\')[\'teams\'][\'connectionId\']'
              }
            }
            method: 'post'
            path: '/v1.0/teams/conversation/adaptivecard/poster/Flow bot/location/@{encodeURIComponent(\'Channel\')}'
            body: {
              recipient: {
                groupId: teamId
                channelId: channelId
              }
              messageBody: '@triggerBody()'
            }
          }
          runAfter: {}
        }
        Response: {
          type: 'Response'
          inputs: {
            statusCode: 200
            body: {
              status: 'queued'
              channel: channelCode
            }
          }
          runAfter: {
            Post_adaptive_card_in_a_chat_or_channel: ['Succeeded']
          }
        }
      }
      outputs: {}
    }
    parameters: {
      '$connections': {
        value: {
          teams: {
            id: '/subscriptions/${subscriptionId}/providers/Microsoft.Web/locations/${location}/managedApis/teams'
            connectionId: teamsConnectionId
            connectionName: teamsConnectionName
          }
        }
      }
    }
  }
}

output logicAppResourceId string = logicApp.id
output logicAppName string = logicApp.name
output displayNameOut string = displayName
output resourceGroupNameOut string = resourceGroupName
