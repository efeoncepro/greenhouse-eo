/* eslint-disable no-console */

import {
  type HubSpotPropertySnapshot,
  diffHubSpotCustomProperties,
  getHubSpotCustomPropertyDefinitions,
  planHubSpotCustomPropertyCreation
} from '@/lib/hubspot/custom-properties'

import { runHubSpotCustomPropertiesCli } from './ensure-hubspot-custom-properties'

export type HubSpotCompanyCustomPropertyDefinition = ReturnType<
  typeof getHubSpotCustomPropertyDefinitions
>[number]

export const COMPANY_HUBSPOT_CUSTOM_PROPERTIES = getHubSpotCustomPropertyDefinitions('companies')

export const planCompanyCustomPropertyCreation = (existing: Array<{ name: string }>) =>
  planHubSpotCustomPropertyCreation('companies', existing)

export const diffHubSpotCompanyCustomProperties = (existing: HubSpotPropertySnapshot[]) =>
  diffHubSpotCustomProperties('companies', existing)

if (require.main === module) {
  void runHubSpotCustomPropertiesCli({
    defaultObjects: ['companies'],
    title: 'TASK-540 HubSpot Company Custom Properties'
  })
}
