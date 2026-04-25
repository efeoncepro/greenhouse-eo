/* eslint-disable no-console */

import {
  type HubSpotPropertySnapshot,
  diffHubSpotCustomProperties,
  getHubSpotCustomPropertyDefinitions,
  planHubSpotCustomPropertyCreation
} from '@/lib/hubspot/custom-properties'

import { runHubSpotCustomPropertiesCli } from './ensure-hubspot-custom-properties'

export type HubSpotCustomPropertyDefinition = ReturnType<
  typeof getHubSpotCustomPropertyDefinitions
>[number]
export type { HubSpotPropertySnapshot }

export const PRODUCT_HUBSPOT_CUSTOM_PROPERTIES = getHubSpotCustomPropertyDefinitions('products')

export const planCustomPropertyCreation = (existing: Array<{ name: string }>) =>
  planHubSpotCustomPropertyCreation('products', existing)

export const diffHubSpotProductCustomProperties = (existing: HubSpotPropertySnapshot[]) =>
  diffHubSpotCustomProperties('products', existing)

if (require.main === module) {
  void runHubSpotCustomPropertiesCli({
    defaultObjects: ['products'],
    title: 'TASK-563 HubSpot Product Custom Properties'
  })
}
