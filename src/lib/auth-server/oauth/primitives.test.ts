import { describe, expect, it } from 'vitest'

import {
  LEGACY_LOOPBACK_POLICY,
  buildPkceChallenge,
  isLoopbackRedirectUri,
  isPkceToken,
  matchRedirectUri,
  normalizeRegisteredRedirectUris,
  parseScopeParam,
  safeEquals,
  sha256Hex,
  verifyPkceS256
} from './primitives'

const VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'

describe('auth-server oauth primitives', () => {
  it('sha256Hex is stable and safeEquals is length-safe', () => {
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(safeEquals('a', 'ab')).toBe(false)
    expect(safeEquals('same', 'same')).toBe(true)
  })

  it('PKCE S256 verifies the RFC 7636 appendix B vector and rejects plain/short verifiers', () => {
    expect(buildPkceChallenge(VERIFIER)).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
    expect(verifyPkceS256(VERIFIER, 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')).toBe(true)
    expect(verifyPkceS256(VERIFIER, VERIFIER)).toBe(false)
    expect(isPkceToken('short')).toBe(false)
    expect(verifyPkceS256('short', buildPkceChallenge('short'))).toBe(false)
  })

  it('parseScopeParam dedupes and falls back', () => {
    expect(parseScopeParam(' a  b a ', ['x'])).toEqual(['a', 'b'])
    expect(parseScopeParam('', ['x'])).toEqual(['x'])
  })

  describe('redirect URIs', () => {
    it('legacy policy: only 127.0.0.1 is loopback; localhost needs the alias flag', () => {
      expect(isLoopbackRedirectUri('http://127.0.0.1:4321/cb')).toBe(true)
      expect(isLoopbackRedirectUri('http://localhost:4321/cb')).toBe(false)
      expect(isLoopbackRedirectUri('http://localhost:4321/cb', { allowLocalhostAlias: true, allowIpv6Loopback: false })).toBe(true)
      expect(isLoopbackRedirectUri('http://[::1]:4321/cb')).toBe(false)
      expect(isLoopbackRedirectUri('http://[::1]:4321/cb', { allowLocalhostAlias: false, allowIpv6Loopback: true })).toBe(true)
      expect(isLoopbackRedirectUri('https://127.0.0.1/cb')).toBe(false)
      expect(isLoopbackRedirectUri('http://user@127.0.0.1/cb')).toBe(false)
      expect(isLoopbackRedirectUri('http://127.0.0.1/cb#x')).toBe(false)
    })

    it('registration keeps the legacy contract (dedupe, no wildcard, https or loopback)', () => {
      expect(normalizeRegisteredRedirectUris([' https://a.example/cb ', 'https://a.example/cb'])).toEqual({
        ok: true,
        uris: ['https://a.example/cb']
      })
      expect(normalizeRegisteredRedirectUris([])).toMatchObject({ ok: false, error: 'missing_redirect_uri' })
      expect(normalizeRegisteredRedirectUris(['https://*.example/cb'])).toMatchObject({ ok: false, reason: 'wildcard' })
      expect(normalizeRegisteredRedirectUris(['http://a.example/cb'])).toMatchObject({ ok: false, reason: 'scheme' })
      expect(normalizeRegisteredRedirectUris(['http://localhost:3000/cb']).ok).toBe(true)
      expect(normalizeRegisteredRedirectUris(['not a url']).ok).toBe(false)
    })

    it('confidential clients match by exact string', () => {
      const base = { clientType: 'confidential' as const, registeredRedirectUri: 'https://a.example/cb' }

      expect(matchRedirectUri({ ...base, requestedRedirectUri: 'https://a.example/cb' })).toBe('https://a.example/cb')
      expect(matchRedirectUri({ ...base, requestedRedirectUri: 'https://a.example/cb/' })).toBeNull()
      expect(matchRedirectUri({ ...base, requestedRedirectUri: 'https://a.example/cb?x=1' })).toBeNull()
    })

    it('public clients: ephemeral port is free, path/query must match, host rewritten to the registered one', () => {
      const base = { clientType: 'public' as const, registeredRedirectUri: 'http://127.0.0.1/oauth/callback' }

      expect(matchRedirectUri({ ...base, requestedRedirectUri: 'http://127.0.0.1:53211/oauth/callback' })).toBe(
        'http://127.0.0.1:53211/oauth/callback'
      )

      // Legacy: la URI pedida tolera `localhost` (normalización de Next) y vuelve al host registrado.
      expect(matchRedirectUri({ ...base, requestedRedirectUri: 'http://localhost:53211/oauth/callback' })).toBe(
        'http://127.0.0.1:53211/oauth/callback'
      )
      expect(matchRedirectUri({ ...base, requestedRedirectUri: 'http://127.0.0.1:53211/other' })).toBeNull()
      expect(matchRedirectUri({ ...base, requestedRedirectUri: 'https://127.0.0.1:53211/oauth/callback' })).toBeNull()
    })

    it('public clients under the strict legacy policy reject localhost on both sides', () => {
      expect(
        matchRedirectUri({
          clientType: 'public',
          registeredRedirectUri: 'http://localhost/cb',
          requestedRedirectUri: 'http://localhost:1234/cb',
          registeredPolicy: LEGACY_LOOPBACK_POLICY,
          requestedPolicy: LEGACY_LOOPBACK_POLICY
        })
      ).toBeNull()
    })
  })
})
