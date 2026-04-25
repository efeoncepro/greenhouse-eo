/* eslint-disable no-console */

import {
  type HubSpotPropertySnapshot,
  diffHubSpotCustomProperties,
  getHubSpotCustomPropertyDefinitions,
  planHubSpotCustomPropertyCreation
} from '@/lib/hubspot/custom-properties'

import { runHubSpotCustomPropertiesCli } from './ensure-hubspot-custom-properties'

export type HubSpotServiceCustomPropertyDefinition = ReturnType<
  typeof getHubSpotCustomPropertyDefinitions
>[number]

export const SERVICE_HUBSPOT_CUSTOM_PROPERTIES = getHubSpotCustomPropertyDefinitions('services')

export const planServiceCustomPropertyCreation = (existing: Array<{ name: string }>) =>
  planHubSpotCustomPropertyCreation('services', existing)

export const diffHubSpotServiceCustomProperties = (existing: HubSpotPropertySnapshot[]) =>
  diffHubSpotCustomProperties('services', existing)

if (require.main === module) {
  void runHubSpotCustomPropertiesCli({
    defaultObjects: ['services'],
    title: 'HubSpot Service Custom Properties'
  })
}
