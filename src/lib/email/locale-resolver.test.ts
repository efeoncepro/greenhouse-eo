import { describe, expect, it } from 'vitest'

import { resolveEmailLocale, toEmailTemplateLocale, toPlatformLocale } from './locale-resolver'

describe('email locale resolver', () => {
  it('keeps es-CL as the safe default', () => {
    expect(resolveEmailLocale()).toBe('es-CL')
    expect(resolveEmailLocale(null)).toBe('es-CL')
    expect(resolveEmailLocale('')).toBe('es-CL')
    expect(resolveEmailLocale('fr-FR')).toBe('es-CL')
  })

  it('normalizes legacy email locale values to platform locales', () => {
    expect(resolveEmailLocale('es')).toBe('es-CL')
    expect(resolveEmailLocale('en')).toBe('en-US')
    expect(resolveEmailLocale('es-CL')).toBe('es-CL')
    expect(resolveEmailLocale('en-US')).toBe('en-US')
  })

  it('projects platform locales back to current email template locales', () => {
    expect(toEmailTemplateLocale('es-CL')).toBe('es')
    expect(toEmailTemplateLocale('en-US')).toBe('en')
    expect(toEmailTemplateLocale('unknown')).toBe('es')
  })

  it('preserves current template locale inputs when callers need platform locales', () => {
    expect(toPlatformLocale('es')).toBe('es-CL')
    expect(toPlatformLocale('en')).toBe('en-US')
    expect(toPlatformLocale('en-US')).toBe('en-US')
  })
})
