import { describe, expect, it } from 'vitest'

import { deriveRuntimeFindings, sanitizeRuntimeMessage, type RuntimeRaw } from './runtime-collector'

const emptyRaw = (): RuntimeRaw => ({ consoleErrors: [], pageErrors: [], hydrationWarnings: [], httpFailures: [] })

describe('sanitizeRuntimeMessage', () => {
  it('redacts bearer tokens, jwts, cookies and emails', () => {
    expect(sanitizeRuntimeMessage('Authorization: Bearer abc.def-ghi')).toContain('[redacted]')
    expect(sanitizeRuntimeMessage('token eyJabcdefghijklmno.payload')).toContain('[redacted-jwt]')
    expect(sanitizeRuntimeMessage('user agent@efeonce.org failed')).toContain('[redacted-email]')
  })

  it('truncates very long messages', () => {
    const long = 'x'.repeat(900)

    expect(sanitizeRuntimeMessage(long).length).toBeLessThanOrEqual(501)
  })
})

describe('deriveRuntimeFindings', () => {
  it('is a no-op when quality.runtime is not declared (opt-in)', () => {
    expect(deriveRuntimeFindings({ ...emptyRaw(), consoleErrors: ['boom'] }, undefined)).toEqual([])
  })

  it('emits a console.error finding as error by default', () => {
    const findings = deriveRuntimeFindings({ ...emptyRaw(), consoleErrors: ['boom'] }, { failOnConsoleError: true })

    expect(findings).toHaveLength(1)
    expect(findings[0].code).toBe('runtime_console_error')
    expect(findings[0].severity).toBe('error')
  })

  it('downgrades to warning when failOnConsoleError is false', () => {
    const findings = deriveRuntimeFindings({ ...emptyRaw(), consoleErrors: ['boom'] }, { failOnConsoleError: false })

    expect(findings[0].severity).toBe('warning')
  })

  it('hydration warnings default to warning unless failOnHydrationWarning', () => {
    const warn = deriveRuntimeFindings({ ...emptyRaw(), hydrationWarnings: ['Hydration failed'] }, {})
    const err = deriveRuntimeFindings({ ...emptyRaw(), hydrationWarnings: ['Hydration failed'] }, { failOnHydrationWarning: true })

    expect(warn[0].severity).toBe('warning')
    expect(err[0].severity).toBe('error')
  })

  it('respects ignoreConsolePatterns and ignoreUrlPatterns', () => {
    const findings = deriveRuntimeFindings(
      {
        ...emptyRaw(),
        consoleErrors: ['ResizeObserver loop limit exceeded'],
        httpFailures: [{ url: 'https://x/analytics', status: 503, resourceType: 'fetch' }]
      },
      { failOnConsoleError: true, failOnHttpStatus: true, ignoreConsolePatterns: ['ResizeObserver'], ignoreUrlPatterns: ['/analytics'] }
    )

    expect(findings).toEqual([])
  })
})
