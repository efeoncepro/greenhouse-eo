import { describe, expect, it } from 'vitest'

import {
  requiresHubSpotQuoteCommercialContext,
  validateHubSpotQuoteCommercialContext
} from '../quote-hubspot-sync-context'

describe('requiresHubSpotQuoteCommercialContext', () => {
  it('returns false for standalone manual quotes', () => {
    expect(
      requiresHubSpotQuoteCommercialContext({
        hubspotDealId: null,
        hubspotQuoteId: null,
        sourceSystem: 'manual'
      })
    ).toBe(false)
  })

  it('returns true for quotes linked to hubspot via deal or source quote', () => {
    expect(
      requiresHubSpotQuoteCommercialContext({
        hubspotDealId: 'deal-123',
        hubspotQuoteId: null,
        sourceSystem: 'manual'
      })
    ).toBe(true)

    expect(
      requiresHubSpotQuoteCommercialContext({
        hubspotDealId: null,
        hubspotQuoteId: 'hs-quote-1',
        sourceSystem: 'hubspot'
      })
    ).toBe(true)
  })
})

describe('validateHubSpotQuoteCommercialContext', () => {
  it('allows standalone quotes without hubspot sync', () => {
    expect(
      validateHubSpotQuoteCommercialContext({
        organizationId: 'org-1',
        hubspotCompanyId: null,
        contactIdentityProfileId: null,
        hubspotDealId: null,
        sourceSystem: 'manual',
        hubspotQuoteId: null
      })
    ).toBeNull()
  })

  it('requires company, contact and deal for synced quotes', () => {
    expect(
      validateHubSpotQuoteCommercialContext({
        organizationId: 'org-1',
        hubspotCompanyId: null,
        contactIdentityProfileId: 'profile-1',
        hubspotDealId: 'deal-123',
        sourceSystem: 'manual',
        hubspotQuoteId: null
      })
    ).toContain('company de HubSpot')

    expect(
      validateHubSpotQuoteCommercialContext({
        organizationId: 'org-1',
        hubspotCompanyId: 'company-1',
        contactIdentityProfileId: null,
        hubspotDealId: 'deal-123',
        sourceSystem: 'manual',
        hubspotQuoteId: null
      })
    ).toContain('contacto activo')

    expect(
      validateHubSpotQuoteCommercialContext({
        organizationId: 'org-1',
        hubspotCompanyId: 'company-1',
        contactIdentityProfileId: 'profile-1',
        hubspotDealId: null,
        sourceSystem: 'hubspot',
        hubspotQuoteId: 'hs-quote-1'
      })
    ).toContain('deal vinculado')
  })
})
