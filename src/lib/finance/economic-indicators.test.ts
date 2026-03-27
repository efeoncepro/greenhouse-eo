import { describe, expect, it } from 'vitest'

import * as economicIndicators from '@/lib/finance/economic-indicators'

describe('economic indicator conversions', () => {
  it('converts UF to CLP and back using pure helpers', () => {
    expect(economicIndicators.convertUfToClpValue({ amountUf: 3, ufValue: 39841.72 })).toBe(119525.16)
    expect(economicIndicators.convertClpToUfValue({ amountClp: 119525.16, ufValue: 39841.72 })).toBe(3)
  })

  it('converts UTM to CLP and back using pure helpers', () => {
    expect(economicIndicators.convertUtmToClpValue({ amountUtm: 2, utmValue: 69889 })).toBe(139778)
    expect(economicIndicators.convertClpToUtmValue({ amountClp: 139778, utmValue: 69889 })).toBe(2)
  })
})
