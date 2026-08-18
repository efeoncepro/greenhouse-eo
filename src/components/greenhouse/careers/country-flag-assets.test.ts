import { describe, expect, it } from 'vitest'

import { getCandidateCountryFlagAsset } from './country-flag-assets'

const APPROVED_REMOTE_COUNTRY_CODES = [
  'AR',
  'BO',
  'BR',
  'CL',
  'CO',
  'CR',
  'DO',
  'EC',
  'SV',
  'GT',
  'HN',
  'MX',
  'NI',
  'PA',
  'PY',
  'PE',
  'UY',
  'VE',
  'US',
  'ES'
] as const

describe('candidate country flag assets', () => {
  it('covers every country in the approved global hiring footprint', () => {
    for (const code of APPROVED_REMOTE_COUNTRY_CODES) {
      expect(getCandidateCountryFlagAsset(code), code).toBeTruthy()
    }
  })

  it('fails safely for a country without an approved local asset', () => {
    expect(getCandidateCountryFlagAsset('ZZ')).toBeNull()
  })
})
