import { describe, expect, it } from 'vitest'

import {
  organizationIdentitySourceDisplay,
  organizationWorkspaceSourceDisplay,
  resolveOrganizationIdentitySources,
  resolveOrganizationWorkspaceSources
} from './organization-provenance-labels'

describe('organization provenance labels', () => {
  it('uses Greenhouse as the base identity source', () => {
    expect(resolveOrganizationIdentitySources({ hasHubspotCompany: false })).toEqual(['greenhouse'])
    expect(organizationIdentitySourceDisplay({ hasHubspotCompany: false })).toBe('Fuente: Greenhouse')
  })

  it('adds HubSpot when the organization has a HubSpot company binding', () => {
    expect(resolveOrganizationIdentitySources({ hasHubspotCompany: true })).toEqual(['hubspot', 'greenhouse'])
    expect(organizationIdentitySourceDisplay({ hasHubspotCompany: true })).toBe('Fuente: HubSpot + Greenhouse')
  })

  it('adds workspace facet sources from resolved Account 360 facets', () => {
    expect(resolveOrganizationWorkspaceSources({
      hasHubspotCompany: true,
      resolvedFacets: ['identity', 'delivery', 'finance', 'services']
    })).toEqual(['hubspot', 'greenhouse', 'account360', 'finance360', 'delivery360', 'services360'])
  })

  it('formats workspace sources for sidecar provenance', () => {
    expect(organizationWorkspaceSourceDisplay({
      hasHubspotCompany: false,
      resolvedFacets: ['identity', 'staffAug']
    })).toBe('Greenhouse + Account 360 + Staff Aug 360')
  })
})
