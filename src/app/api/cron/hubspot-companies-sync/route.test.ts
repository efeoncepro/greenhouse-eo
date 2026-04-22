import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireCronAuth = vi.fn()
const mockCheckIntegrationReadiness = vi.fn()
const mockSyncHubSpotCompanies = vi.fn()

vi.mock('@/lib/cron/require-cron-auth', () => ({
  requireCronAuth: (...args: unknown[]) => mockRequireCronAuth(...args)
}))

vi.mock('@/lib/integrations/readiness', () => ({
  checkIntegrationReadiness: (...args: unknown[]) => mockCheckIntegrationReadiness(...args)
}))

vi.mock('@/lib/hubspot/sync-hubspot-companies', () => ({
  syncHubSpotCompanies: (...args: unknown[]) => mockSyncHubSpotCompanies(...args)
}))

import { GET } from './route'

describe('GET /api/cron/hubspot-companies-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireCronAuth.mockReturnValue({ authorized: true, errorResponse: null })
    mockCheckIntegrationReadiness.mockResolvedValue({ ready: true })
    mockSyncHubSpotCompanies.mockResolvedValue({
      enabled: true,
      dryRun: true,
      fullResync: true,
      runId: 'hubspot-companies-run-1',
      watermarkStart: null,
      watermarkEnd: '2026-04-21T12:00:00.000Z',
      processed: 3,
      created: 2,
      promoted: 1,
      clientsInstantiated: 1,
      skipped: 0,
      errors: []
    })
  })

  it('returns the auth error response when cron auth fails', async () => {
    mockRequireCronAuth.mockReturnValue({
      authorized: false,
      errorResponse: new Response('forbidden', { status: 401 })
    })

    const response = await GET(new Request('http://localhost/api/cron/hubspot-companies-sync'))

    expect(response.status).toBe(401)
    expect(mockSyncHubSpotCompanies).not.toHaveBeenCalled()
  })

  it('passes dry/full query params to the sync helper', async () => {
    const response = await GET(
      new Request('http://localhost/api/cron/hubspot-companies-sync?dry=true&full=true')
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockCheckIntegrationReadiness).toHaveBeenCalledWith('hubspot')
    expect(mockSyncHubSpotCompanies).toHaveBeenCalledWith({ dryRun: true, fullResync: true })
    expect(body).toMatchObject({
      dryRun: true,
      fullResync: true,
      processed: 3,
      created: 2,
      promoted: 1
    })
    expect(typeof body.durationMs).toBe('number')
  })
})
