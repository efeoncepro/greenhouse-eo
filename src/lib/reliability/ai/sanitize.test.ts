import { describe, expect, it } from 'vitest'

import { sanitizePiiPayload, sanitizePiiText } from './sanitize'

describe('sanitizePiiText', () => {
  it('redacts email addresses', () => {
    expect(sanitizePiiText('user@efeonce.com crashed')).toBe('<email> crashed')
    expect(sanitizePiiText('Multiple: a@b.com and c.d+tag@example.co.uk')).toBe(
      'Multiple: <email> and <email>'
    )
  })

  it('redacts canonical UUIDs', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'

    expect(sanitizePiiText(`session ${uuid} expired`)).toBe('session <uuid> expired')
  })

  it('redacts long hex strings (>= 24 chars)', () => {
    const hex = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'

    expect(sanitizePiiText(`token=${hex} invalid`)).toBe('token=<long-id> invalid')
  })

  it('keeps short identifiers like EO-RSR-1234 untouched', () => {
    expect(sanitizePiiText('Sweep EO-RSR-abc123 finished')).toBe('Sweep EO-RSR-abc123 finished')
  })

  it('keeps HTTP status codes and module keys untouched', () => {
    expect(sanitizePiiText('GET /finance/quotes status=200 in finance module')).toBe(
      'GET /finance/quotes status=200 in finance module'
    )
  })

  it('redacts Bearer tokens', () => {
    expect(sanitizePiiText('Authorization: Bearer abc123def456ghi789jklm0')).toBe(
      'Authorization: <token>'
    )
  })

  it('redacts api key fragments (sk_, gho_, ghp_)', () => {
    expect(sanitizePiiText('Got sk_live_abcdef0123456789abcdef')).toBe('Got <token>')
    expect(sanitizePiiText('Token gho_aBcDeFgHiJkLmNoPqRsTuVwXyZ012345')).toBe('Token <token>')
  })

  it('redacts Chilean RUTs', () => {
    expect(sanitizePiiText('Cliente 12.345.678-9 reportó')).toBe('Cliente <rut> reportó')
    expect(sanitizePiiText('RUT empresa 76.123.456-K')).toBe('RUT empresa <rut>')
  })

  it('is idempotent', () => {
    const once = sanitizePiiText('a@b.com')
    const twice = sanitizePiiText(once)

    expect(twice).toBe(once)
  })

  it('returns empty input as-is', () => {
    expect(sanitizePiiText('')).toBe('')
  })
})

describe('sanitizePiiPayload', () => {
  it('redacts strings inside nested objects', () => {
    const payload = {
      title: 'Crash for user@efeonce.com',
      meta: {
        sessionUuid: '550e8400-e29b-41d4-a716-446655440000',
        moduleKey: 'finance'
      }
    }

    const result = sanitizePiiPayload(payload)

    expect(result.title).toBe('Crash for <email>')
    expect(result.meta.sessionUuid).toBe('<uuid>')
    expect(result.meta.moduleKey).toBe('finance')
  })

  it('redacts strings inside arrays', () => {
    const result = sanitizePiiPayload(['ok', 'fail for a@b.com', 'ok'])

    expect(result).toEqual(['ok', 'fail for <email>', 'ok'])
  })

  it('preserves non-string primitives', () => {
    const payload = { count: 42, ok: true, ratio: 0.95, id: null }

    expect(sanitizePiiPayload(payload)).toEqual(payload)
  })

  it('does not mutate the input', () => {
    const original = { title: 'a@b.com' }
    const result = sanitizePiiPayload(original)

    expect(original.title).toBe('a@b.com')
    expect(result.title).toBe('<email>')
  })
})
