import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildAuthReadinessSnapshot,
  clearAuthReadinessCache,
  getAuthReadinessSnapshot,
  probeNextAuthSecretRoundTrip
} from './readiness'

const originalFetch = global.fetch

describe('Auth readiness contract — TASK-742 Capa 2', () => {
  beforeEach(() => {
    clearAuthReadinessCache()
    process.env.AZURE_AD_CLIENT_ID = '3626642f-0451-4eb2-8c29-d2211ab3176c'
    process.env.GOOGLE_CLIENT_ID = '123456789-abcdefghijklmnop.apps.googleusercontent.com'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    global.fetch = originalFetch
    delete process.env.AZURE_AD_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_ID
  })

  describe('probeNextAuthSecretRoundTrip', () => {
    it('returns true when secret can sign + verify a JWT', async () => {
      const result = await probeNextAuthSecretRoundTrip('a'.repeat(64))

      expect(result).toBe(true)
    })

    it('returns false on empty secret', async () => {
      const result = await probeNextAuthSecretRoundTrip('')

      expect(result).toBe(false)
    })
  })

  describe('buildAuthReadinessSnapshot', () => {
    it('marks azure-ad ready when discovery succeeds and secrets pass format', async () => {
      global.fetch = vi.fn(async () => new Response('{}', { status: 200 })) as typeof fetch

      const snap = await buildAuthReadinessSnapshot({
        azureAdClientSecret: 'AbCdE.fGhIjK_lMn~OpQrStUvWxYz0123-456789ab',
        googleClientSecret: null,
        nextAuthSecret: 'a'.repeat(64)
      })

      const azure = snap.providers.find(p => p.provider === 'azure-ad')

      expect(azure?.status).toBe('ready')
      expect(snap.nextAuthSecretReady).toBe(true)
    })

    it('marks azure-ad degraded when OIDC discovery returns 500', async () => {
      global.fetch = vi.fn(async () => new Response('error', { status: 500 })) as typeof fetch

      const snap = await buildAuthReadinessSnapshot({
        azureAdClientSecret: 'AbCdE.fGhIjK_lMn~OpQrStUvWxYz0123-456789ab',
        googleClientSecret: null,
        nextAuthSecret: 'a'.repeat(64)
      })

      const azure = snap.providers.find(p => p.provider === 'azure-ad')

      expect(azure?.status).toBe('degraded')
      expect(azure?.failingStage).toBe('oidc_discovery_failed')
    })

    it('marks azure-ad unconfigured when client secret is null', async () => {
      global.fetch = vi.fn(async () => new Response('{}', { status: 200 })) as typeof fetch

      const snap = await buildAuthReadinessSnapshot({
        azureAdClientSecret: null,
        googleClientSecret: null,
        nextAuthSecret: 'a'.repeat(64)
      })

      const azure = snap.providers.find(p => p.provider === 'azure-ad')

      expect(azure?.status).toBe('unconfigured')
      expect(azure?.failingStage).toBe('unconfigured')
    })

    it('marks azure-ad degraded when client_id is malformed', async () => {
      process.env.AZURE_AD_CLIENT_ID = '"3626642f-0451-4eb2-8c29-d2211ab3176c"' // wrapped in quotes
      global.fetch = vi.fn(async () => new Response('{}', { status: 200 })) as typeof fetch

      const snap = await buildAuthReadinessSnapshot({
        azureAdClientSecret: 'AbCdE.fGhIjK_lMn~OpQrStUvWxYz0123-456789ab',
        googleClientSecret: null,
        nextAuthSecret: 'a'.repeat(64)
      })

      const azure = snap.providers.find(p => p.provider === 'azure-ad')

      expect(azure?.status).toBe('degraded')
      expect(azure?.failingStage).toBe('secret_format_invalid')
    })

    it('marks credentials provider degraded if NEXTAUTH_SECRET is empty', async () => {
      global.fetch = vi.fn(async () => new Response('{}', { status: 200 })) as typeof fetch

      const snap = await buildAuthReadinessSnapshot({
        azureAdClientSecret: null,
        googleClientSecret: null,
        nextAuthSecret: null
      })

      const cred = snap.providers.find(p => p.provider === 'credentials')

      expect(cred?.status).toBe('degraded')
      expect(cred?.failingStage).toBe('jwt_self_test_failed')
      expect(snap.nextAuthSecretReady).toBe(false)
    })

    it('rolls up overallStatus=degraded when any provider is degraded', async () => {
      global.fetch = vi.fn(async () => new Response('{}', { status: 503 })) as typeof fetch

      const snap = await buildAuthReadinessSnapshot({
        azureAdClientSecret: 'AbCdE.fGhIjK_lMn~OpQrStUvWxYz0123-456789ab',
        googleClientSecret: null,
        nextAuthSecret: 'a'.repeat(64)
      })

      expect(snap.overallStatus).toBe('degraded')
    })
  })

  describe('getAuthReadinessSnapshot caching', () => {
    it('reuses cached snapshot within TTL', async () => {
      const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))

      global.fetch = fetchMock as unknown as typeof fetch

      const first = await getAuthReadinessSnapshot({
        azureAdClientSecret: 'AbCdE.fGhIjK_lMn~OpQrStUvWxYz0123-456789ab',
        googleClientSecret: null,
        nextAuthSecret: 'a'.repeat(64)
      })

      const second = await getAuthReadinessSnapshot({
        azureAdClientSecret: 'AbCdE.fGhIjK_lMn~OpQrStUvWxYz0123-456789ab',
        googleClientSecret: null,
        nextAuthSecret: 'a'.repeat(64)
      })

      expect(first.generatedAt).toBe(second.generatedAt)
      // Only azure-ad is configured here, so only 1 OIDC discovery call. Cache hit
      // on the second invocation means fetch is NOT called again.
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })
})
