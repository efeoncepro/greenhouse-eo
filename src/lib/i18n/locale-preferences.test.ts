import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { buildLocalePreferenceSnapshot, toLegacyClientUserLocale } from './locale-preferences'

describe('locale-preferences', () => {
  it('resolves user preference before tenant default and legacy locale', () => {
    expect(
      buildLocalePreferenceSnapshot({
        preferredLocale: 'en-US',
        organizationDefaultLocale: 'es-CL',
        legacyLocale: 'es'
      })
    ).toMatchObject({
      preferredLocale: 'en-US',
      tenantDefaultLocale: 'es-CL',
      legacyLocale: 'es-CL',
      effectiveLocale: 'en-US'
    })
  })

  it('uses organization default before client default', () => {
    expect(
      buildLocalePreferenceSnapshot({
        organizationDefaultLocale: 'en-US',
        clientDefaultLocale: 'es-CL'
      })
    ).toMatchObject({
      preferredLocale: null,
      tenantDefaultLocale: 'en-US',
      effectiveLocale: 'en-US'
    })
  })

  it('maps canonical locales back to legacy client user values', () => {
    expect(toLegacyClientUserLocale('es-CL')).toBe('es')
    expect(toLegacyClientUserLocale('en-US')).toBe('en')
  })
})
