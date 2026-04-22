/* eslint-disable no-console */

import {
  type HubSpotPropertySnapshot,
  diffHubSpotCustomProperties,
  getHubSpotCustomPropertyDefinitions,
  planHubSpotCustomPropertyCreation
} from '@/lib/hubspot/custom-properties'

import { runHubSpotCustomPropertiesCli } from './ensure-hubspot-custom-properties'

export type HubSpotDealCustomPropertyDefinition = ReturnType<
  typeof getHubSpotCustomPropertyDefinitions
>[number]

export const DEAL_HUBSPOT_CUSTOM_PROPERTIES = getHubSpotCustomPropertyDefinitions('deals')

export const planDealCustomPropertyCreation = (existing: Array<{ name: string }>) =>
  planHubSpotCustomPropertyCreation('deals', existing)

export const diffHubSpotDealCustomProperties = (existing: HubSpotPropertySnapshot[]) =>
  diffHubSpotCustomProperties('deals', existing)

if (require.main === module) {
  void runHubSpotCustomPropertiesCli({
    defaultObjects: ['deals'],
    title: 'TASK-539 HubSpot Deal Custom Properties'
  })
}
