import { describe, it, expect } from 'vitest'

import { validateSecretFormat, isKnownSecretFormat, getSecretFormatDescription } from './format-validators'

describe('validateSecretFormat', () => {
  describe('NEXTAUTH_SECRET', () => {
    it('accepts a 64-byte hex string', () => {
      const value = 'a'.repeat(64)
      const r = validateSecretFormat('NEXTAUTH_SECRET', value)
      expect(r.ok).toBe(true)
      expect(r.violations).toHaveLength(0)
    })

    it('accepts a base64 32-byte payload (44 chars)', () => {
      const value = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789+/=AbCd'
      const r = validateSecretFormat('NEXTAUTH_SECRET', value)
      expect(r.ok).toBe(true)
    })

    it('rejects payload shorter than 32 bytes', () => {
      const r = validateSecretFormat('NEXTAUTH_SECRET', 'short')
      expect(r.ok).toBe(false)
      expect(r.violations).toContain('too_short')
    })

    it('rejects payload with internal whitespace', () => {
      const r = validateSecretFormat('NEXTAUTH_SECRET', 'a'.repeat(20) + ' ' + 'a'.repeat(20))
      expect(r.ok).toBe(false)
      expect(r.violations).toContain('has_internal_whitespace')
    })

    it('rejects payload wrapped in quotes', () => {
      const r = validateSecretFormat('NEXTAUTH_SECRET', '"' + 'a'.repeat(64) + '"')
      expect(r.ok).toBe(false)
      expect(r.violations).toContain('has_quote_chars')
    })

    it('rejects payload with literal \\n marker', () => {
      const r = validateSecretFormat('NEXTAUTH_SECRET', 'a'.repeat(60) + '\\n')
      expect(r.ok).toBe(false)
      expect(r.violations).toContain('has_literal_newline_marker')
    })
  })

  describe('AZURE_AD_CLIENT_SECRET', () => {
    it('accepts 40-char Azure v2 secret', () => {
      const r = validateSecretFormat('AZURE_AD_CLIENT_SECRET', 'AbCdE.fGhIjK_lMn~OpQrStUvWxYz0123-456789ab')
      expect(r.ok).toBe(true)
    })

    it('rejects payload with non-Azure charset', () => {
      const r = validateSecretFormat('AZURE_AD_CLIENT_SECRET', 'a'.repeat(40) + '@')
      expect(r.ok).toBe(false)
      expect(r.violations).toContain('invalid_charset')
    })
  })

  describe('AZURE_AD_CLIENT_ID', () => {
    it('accepts a valid GUID lowercase', () => {
      const r = validateSecretFormat('AZURE_AD_CLIENT_ID', '3626642f-0451-4eb2-8c29-d2211ab3176c')
      expect(r.ok).toBe(true)
    })

    it('rejects uppercase or wrong shape', () => {
      const r = validateSecretFormat('AZURE_AD_CLIENT_ID', '3626642F-0451-4EB2-8C29-D2211AB3176C')
      expect(r.ok).toBe(false)
      expect(r.violations).toContain('wrong_shape')
    })

    it('rejects payload with quotes', () => {
      const r = validateSecretFormat('AZURE_AD_CLIENT_ID', '"3626642f-0451-4eb2-8c29-d2211ab3176c"')
      expect(r.ok).toBe(false)
      expect(r.violations).toContain('has_quote_chars')
    })
  })

  describe('NEXTAUTH_URL', () => {
    it('accepts canonical https URL', () => {
      const r = validateSecretFormat('NEXTAUTH_URL', 'https://greenhouse.efeoncepro.com')
      expect(r.ok).toBe(true)
    })

    it('rejects URL with embedded quotes', () => {
      const r = validateSecretFormat('NEXTAUTH_URL', '"https://greenhouse.efeoncepro.com"')
      expect(r.ok).toBe(false)
      expect(r.violations).toContain('has_quote_chars')
    })

    it('rejects http (not https)', () => {
      const r = validateSecretFormat('NEXTAUTH_URL', 'http://greenhouse.efeoncepro.com')
      expect(r.ok).toBe(false)
      expect(r.violations).toContain('wrong_shape')
    })
  })

  describe('GOOGLE_CLIENT_ID', () => {
    it('accepts shape ending in .apps.googleusercontent.com', () => {
      const r = validateSecretFormat(
        'GOOGLE_CLIENT_ID',
        '123456789012-aBcDeFgHiJkLmNoPqRsTuVwX.apps.googleusercontent.com'
      )
      expect(r.ok).toBe(true)
    })

    it('rejects malformed Google client_id', () => {
      const r = validateSecretFormat('GOOGLE_CLIENT_ID', '123456789012-something.invalid.com')
      expect(r.ok).toBe(false)
      expect(r.violations).toContain('wrong_shape')
    })
  })

  describe('unknown secrets', () => {
    it('only enforces basic hygiene (no length/charset)', () => {
      const r = validateSecretFormat('SOME_RANDOM_SECRET', 'abc-123_xyz')
      expect(r.ok).toBe(true)
    })

    it('still rejects whitespace + quotes for unknown', () => {
      const r = validateSecretFormat('SOME_RANDOM_SECRET', '"value with space"')
      expect(r.ok).toBe(false)
      expect(r.violations).toContain('has_quote_chars')
    })
  })

  describe('introspection', () => {
    it('isKnownSecretFormat is true for declared secrets', () => {
      expect(isKnownSecretFormat('NEXTAUTH_SECRET')).toBe(true)
      expect(isKnownSecretFormat('AZURE_AD_CLIENT_SECRET')).toBe(true)
      expect(isKnownSecretFormat('UNKNOWN_FOO')).toBe(false)
    })

    it('getSecretFormatDescription returns null for unknown', () => {
      expect(getSecretFormatDescription('UNKNOWN_FOO')).toBeNull()
      expect(getSecretFormatDescription('NEXTAUTH_SECRET')).toContain('NextAuth')
    })
  })
})
