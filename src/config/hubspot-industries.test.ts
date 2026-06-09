import { describe, expect, it } from 'vitest'

import { hubspotIndustryLabel } from './hubspot-industries'

describe('hubspotIndustryLabel', () => {
  it('resolves canonical HubSpot values to display labels', () => {
    expect(hubspotIndustryLabel('AIRLINES_AVIATION')).toBe('Airlines/Aviation')
    expect(hubspotIndustryLabel('RETAIL')).toBe('Retail')
  })

  it('keeps existing human labels readable', () => {
    expect(hubspotIndustryLabel('Aerolíneas regionales')).toBe('Aerolíneas regionales')
  })

  it('humanizes unknown technical values instead of leaking internal labels', () => {
    expect(hubspotIndustryLabel('CUSTOM_ENTERPRISE_SERVICES')).toBe('Custom Enterprise Services')
  })

  it('handles blank values as missing data', () => {
    expect(hubspotIndustryLabel(null)).toBeNull()
    expect(hubspotIndustryLabel('   ')).toBeNull()
  })
})
