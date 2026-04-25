/* eslint-disable no-console */

import {
  type HubSpotPropertySnapshot,
  diffHubSpotCustomProperties,
  getHubSpotCustomPropertyDefinitions,
  planHubSpotCustomPropertyCreation
} from '@/lib/hubspot/custom-properties'

import { runHubSpotCustomPropertiesCli } from './ensure-hubspot-custom-properties'

export type HubSpotContactCustomPropertyDefinition = ReturnType<
  typeof getHubSpotCustomPropertyDefinitions
>[number]

export const CONTACT_HUBSPOT_CUSTOM_PROPERTIES = getHubSpotCustomPropertyDefinitions('contacts')

export const planContactCustomPropertyCreation = (existing: Array<{ name: string }>) =>
  planHubSpotCustomPropertyCreation('contacts', existing)

export const diffHubSpotContactCustomProperties = (existing: HubSpotPropertySnapshot[]) =>
  diffHubSpotCustomProperties('contacts', existing)

if (require.main === module) {
  void runHubSpotCustomPropertiesCli({
    defaultObjects: ['contacts'],
    title: 'HubSpot Contact Custom Properties'
  })
}
