import { describe, expect, it } from 'vitest'

import { resolveHubSpotCompanyName } from './company-identity'

describe('resolveHubSpotCompanyName', () => {
  it('uses the HubSpot name as canonical company and legal name when present', () => {
    expect(resolveHubSpotCompanyName({
      hubspotCompanyId: '123',
      name: '  Sky Airline  ',
      domain: 'skyairline.com',
      website: 'https://www.skyairline.com'
    })).toEqual({
      companyName: 'Sky Airline',
      legalName: 'Sky Airline',
      source: 'hubspot_name',
      missingHubSpotName: false
    })
  })

  it('falls back to domain when HubSpot name is missing', () => {
    expect(resolveHubSpotCompanyName({
      hubspotCompanyId: '54964918606',
      name: null,
      domain: 'prospectrampuae.help',
      website: 'https://prospectrampuae.help/path'
    })).toEqual({
      companyName: 'prospectrampuae.help',
      legalName: null,
      source: 'domain',
      missingHubSpotName: true
    })
  })

  it('normalizes website host before using the technical fallback', () => {
    expect(resolveHubSpotCompanyName({
      hubspotCompanyId: '456',
      name: ' ',
      website: 'https://www.example.com/sales?utm=hubspot'
    })).toEqual({
      companyName: 'www.example.com',
      legalName: null,
      source: 'website_host',
      missingHubSpotName: true
    })
  })

  it('uses a deterministic technical fallback only when no identity label exists', () => {
    expect(resolveHubSpotCompanyName({
      hubspotCompanyId: '789',
      name: null,
      domain: null,
      website: null
    })).toEqual({
      companyName: 'HubSpot Company 789',
      legalName: null,
      source: 'technical_fallback',
      missingHubSpotName: true
    })
  })
})
