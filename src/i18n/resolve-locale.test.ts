import { describe, expect, it } from 'vitest'

import { defaultLocale, normalizeLocale } from './locales'
import { resolveLocaleFromRequest } from './resolve-locale'

describe('Greenhouse i18n locale resolver', () => {
  it('prioritizes persisted user locale before tenant, legacy, cookie and browser', () => {
    expect(resolveLocaleFromRequest({
      userLocale: 'en-US',
      tenantLocale: 'es-CL',
      legacyLocale: 'es',
      cookieLocale: 'es-CL',
      acceptLanguage: 'es-CL,es;q=0.9'
    })).toBe('en-US')
  })

  it('uses tenant locale before legacy, cookie and browser when user preference is absent', () => {
    expect(resolveLocaleFromRequest({
      tenantLocale: 'en-US',
      legacyLocale: 'es',
      cookieLocale: 'es-CL',
      acceptLanguage: 'es-CL,es;q=0.9'
    })).toBe('en-US')
  })

  it('uses normalized legacy locale before cookie as a migration fallback', () => {
    expect(resolveLocaleFromRequest({
      legacyLocale: 'en',
      cookieLocale: 'es-CL',
      acceptLanguage: 'es-CL,es;q=0.9'
    })).toBe('en-US')
  })

  it('uses gh_locale cookie when it contains a supported platform locale', () => {
    expect(resolveLocaleFromRequest({ cookieLocale: 'en-US', acceptLanguage: 'es-CL,es;q=0.9' })).toBe('en-US')
  })

  it('normalizes legacy short locales for transitional callers', () => {
    expect(normalizeLocale('es')).toBe('es-CL')
    expect(normalizeLocale('en')).toBe('en-US')
  })

  it('matches Accept-Language against supported locales when the cookie is absent', () => {
    expect(resolveLocaleFromRequest({ acceptLanguage: 'en-US,en;q=0.9,es-CL;q=0.8' })).toBe('en-US')
  })

  it('falls back to es-CL for unsupported or malformed inputs', () => {
    expect(resolveLocaleFromRequest({ cookieLocale: 'fr-FR', acceptLanguage: '%%%not-a-locale' })).toBe(defaultLocale)
  })
})
