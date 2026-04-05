import { describe, it, expect } from 'vitest'

import { checkAuthorization } from './auth'

describe('checkAuthorization', () => {
  describe('when CRON_SECRET is empty (Cloud Run IAM only)', () => {
    it('allows any request', () => {
      expect(checkAuthorization(undefined, '')).toBe(true)
      expect(checkAuthorization('', '')).toBe(true)
      expect(checkAuthorization('Bearer anything', '')).toBe(true)
      expect(checkAuthorization('garbage', '')).toBe(true)
    })
  })

  describe('when CRON_SECRET is set', () => {
    const secret = 'my-cron-secret-2026'

    it('allows valid Bearer token', () => {
      expect(checkAuthorization(`Bearer ${secret}`, secret)).toBe(true)
    })

    it('allows valid Bearer token (case-insensitive prefix)', () => {
      expect(checkAuthorization(`bearer ${secret}`, secret)).toBe(true)
      expect(checkAuthorization(`BEARER ${secret}`, secret)).toBe(true)
    })

    it('rejects invalid Bearer token', () => {
      expect(checkAuthorization('Bearer wrong-token', secret)).toBe(false)
    })

    it('rejects empty Bearer token', () => {
      expect(checkAuthorization('Bearer ', secret)).toBe(false)
    })

    it('allows request with no Authorization header (passed IAM)', () => {
      expect(checkAuthorization(undefined, secret)).toBe(true)
      expect(checkAuthorization('', secret)).toBe(true)
    })

    it('rejects non-Bearer auth schemes', () => {
      expect(checkAuthorization('Basic dXNlcjpwYXNz', secret)).toBe(false)
      expect(checkAuthorization('Token some-token', secret)).toBe(false)
    })

    it('rejects partial Bearer prefix', () => {
      expect(checkAuthorization('Bear my-cron-secret-2026', secret)).toBe(false)
    })
  })
})
