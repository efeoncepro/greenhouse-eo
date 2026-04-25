import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { generateShortCode } from '../short-link'

describe('generateShortCode', () => {
  it('returns a 7-char base62 code by default', () => {
    const code = generateShortCode()

    expect(code).toMatch(/^[a-zA-Z0-9]{7}$/)
  })

  it('honors custom length within bounds', () => {
    const code = generateShortCode(10)

    expect(code).toMatch(/^[a-zA-Z0-9]{10}$/)
  })

  it('throws on length out of [7, 12]', () => {
    expect(() => generateShortCode(6)).toThrow(/length must be in/)
    expect(() => generateShortCode(13)).toThrow(/length must be in/)
  })

  it('produces non-deterministic output across calls (overwhelmingly likely)', () => {
    const codes = new Set<string>()

    for (let i = 0; i < 100; i++) {
      codes.add(generateShortCode())
    }

    // 100 codes from 3.5T space — collision probability is essentially zero
    expect(codes.size).toBe(100)
  })

  it('only uses base62 alphabet characters', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateShortCode(12)

      for (const ch of code) {
        expect('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789')
          .toContain(ch)
      }
    }
  })
})
