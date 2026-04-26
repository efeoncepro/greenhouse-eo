import { describe, it, expect } from 'vitest'

import {
  redactErrorForResponse,
  redactObjectStrings,
  redactSensitive
} from './redact'

describe('redactSensitive', () => {
  it('redacts JWT tokens regardless of context', () => {
    const input =
      'Auth header was eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1MSJ9.signature_value_12345'

    expect(redactSensitive(input)).toBe('Auth header was [redacted:jwt]')
  })

  it('redacts Bearer / Token authorization values but preserves the scheme word', () => {
    expect(redactSensitive('Bearer abcdef1234567890tokenvalue')).toBe('[redacted:bearer]')
    expect(redactSensitive('Token   plain-secret-12345')).toBe('[redacted:bearer]')
  })

  it('redacts GCP Secret Manager URIs including version suffix', () => {
    const ref = 'projects/efeonce-group/secrets/greenhouse-app-password/versions/latest'

    expect(redactSensitive(`failed reading ${ref}`)).toBe('failed reading [redacted:gcp-secret-uri]')
  })

  it('redacts sentry DSN-style URLs', () => {
    const dsn = 'https://0123456789abcdef0123456789abcdef@o4511127996530688.ingest.sentry.io/4511127997644800'

    expect(redactSensitive(`DSN: ${dsn}`)).toBe('DSN: [redacted:sentry-dsn]')
  })

  it('redacts user portion of email but keeps the domain', () => {
    expect(redactSensitive('Notify j***@example.com is hidden')).toMatch(/^Notify j\*\*\*@example\.com is hidden$/)
    expect(redactSensitive('agent@greenhouse.efeonce.org')).toBe('a***@greenhouse.efeonce.org')
  })

  it('redacts password/secret/api_key query parameters', () => {
    const url = 'https://example.com/cb?code=abc&secret=topsecret&token=tok123'

    const out = redactSensitive(url)

    expect(out).toContain('code=abc')
    expect(out).toContain('secret=[redacted]')
    expect(out).toContain('token=[redacted]')
  })

  it('redacts user:password@host portion of generic URLs', () => {
    const url = 'postgres://greenhouse_app:hunter2@127.0.0.1:5432/greenhouse'

    expect(redactSensitive(url)).toBe('postgres://[redacted]:[redacted]@127.0.0.1:5432/greenhouse')
  })

  it('is idempotent — running twice produces the same output', () => {
    const input = 'Bearer abcdef1234567890 plus user@example.com'
    const once = redactSensitive(input)
    const twice = redactSensitive(once)

    expect(twice).toBe(once)
  })

  it('passes empty / non-string-shaped values through unchanged', () => {
    expect(redactSensitive('')).toBe('')
    expect(redactSensitive('plain text without any secrets')).toBe(
      'plain text without any secrets'
    )
  })
})

describe('redactObjectStrings', () => {
  it('walks nested objects and arrays redacting every string leaf', () => {
    const payload = {
      summary:
        'Sentry DSN: https://0123456789abcdef0123456789abcdef@o4511127996530688.ingest.sentry.io/123456',
      contact: 'agent@greenhouse.efeonce.org',
      meta: {
        token: 'Bearer abc1234567890def',
        steps: ['Bearer xyz9876543210', 'plain audit row']
      }
    }

    const out = redactObjectStrings(payload)

    expect(out.summary).not.toContain('o4511127996530688')
    expect(out.contact).toBe('a***@greenhouse.efeonce.org')
    expect(out.meta.token).toBe('[redacted:bearer]')
    expect(out.meta.steps[0]).toBe('[redacted:bearer]')
    expect(out.meta.steps[1]).toBe('plain audit row')
  })

  it('preserves object keys as-is (only values are redacted)', () => {
    const payload = { agent_email: 'agent@x.com' }

    const out = redactObjectStrings(payload)

    expect(Object.keys(out)).toEqual(['agent_email'])
  })

  it('respects depth budget — does not recurse forever on cycles', () => {
    const a: Record<string, unknown> = { token: 'Bearer leakvalue1234567890' }

    a.self = a

    expect(() => redactObjectStrings(a, 4)).not.toThrow()
  })
})

describe('redactErrorForResponse', () => {
  it('returns the redacted message of an Error and drops the stack', () => {
    const err = new Error('Failed reading projects/efeonce-group/secrets/whatever/versions/latest')

    expect(redactErrorForResponse(err)).toBe('Failed reading [redacted:gcp-secret-uri]')
  })

  it('redacts plain string throws', () => {
    expect(redactErrorForResponse('Bearer abc1234567890def expired')).toBe(
      '[redacted:bearer] expired'
    )
  })

  it('returns a generic placeholder for unknown thrown shapes', () => {
    expect(redactErrorForResponse(undefined)).toBe('unknown_error')
    expect(redactErrorForResponse(null)).toBe('unknown_error')
    expect(redactErrorForResponse({ random: 'object' })).toBe('unknown_error')
  })
})
