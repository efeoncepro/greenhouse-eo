import { NextResponse } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunEcosystemReadRoute = vi.fn()
const mockListEcosystemOrganizations = vi.fn()
const mockGetEcosystemOrganizationDetail = vi.fn()
const mockListEcosystemCapabilities = vi.fn()
const mockGetEcosystemIntegrationReadiness = vi.fn()

vi.mock('@/lib/api-platform/core/ecosystem-auth', () => ({
  runEcosystemReadRoute: (...args: unknown[]) => mockRunEcosystemReadRoute(...args)
}))

vi.mock('@/lib/api-platform/resources/organizations', () => ({
  listEcosystemOrganizations: (...args: unknown[]) => mockListEcosystemOrganizations(...args),
  getEcosystemOrganizationDetail: (...args: unknown[]) => mockGetEcosystemOrganizationDetail(...args)
}))

vi.mock('@/lib/api-platform/resources/capabilities', () => ({
  listEcosystemCapabilities: (...args: unknown[]) => mockListEcosystemCapabilities(...args)
}))

vi.mock('@/lib/api-platform/resources/integration-readiness', () => ({
  getEcosystemIntegrationReadiness: (...args: unknown[]) => mockGetEcosystemIntegrationReadiness(...args)
}))

const organizationsRoute = await import('./organizations/route')
const organizationDetailRoute = await import('./organizations/[id]/route')
const capabilitiesRoute = await import('./capabilities/route')
const readinessRoute = await import('./integration-readiness/route')

describe('api platform ecosystem route contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRunEcosystemReadRoute.mockImplementation(async ({ request, routeKey, handler }) => {
      const result = await handler({
        requestId: 'req-test',
        routeKey,
        version: '2026-04-25',
        consumer: {},
        binding: {
          greenhouseScopeType: 'internal'
        },
        rateLimit: {
          limitPerMinute: 60,
          limitPerHour: 1000
        }
      })

      return NextResponse.json({
        routeKey,
        requestUrl: request.url,
        result
      })
    })
  })

  it('routes organizations list through the ecosystem harness and reusable resource adapter', async () => {
    mockListEcosystemOrganizations.mockResolvedValue({
      data: { items: [] },
      meta: { pagination: { total: 0 } }
    })

    const request = new Request('https://example.com/api/platform/ecosystem/organizations?page=1')
    const response = await organizationsRoute.GET(request)
    const body = await response.json()

    expect(body.routeKey).toBe('platform.ecosystem.organizations.list')
    expect(mockListEcosystemOrganizations).toHaveBeenCalledWith(expect.objectContaining({ request }))
  })

  it('routes organization detail through the ecosystem harness and passes request for conditional checks', async () => {
    mockGetEcosystemOrganizationDetail.mockResolvedValue({
      data: { organizationId: 'org-1' }
    })

    const request = new Request('https://example.com/api/platform/ecosystem/organizations/org-1')

    const response = await organizationDetailRoute.GET(request, {
      params: Promise.resolve({ id: 'org-1' })
    })

    const body = await response.json()

    expect(body.routeKey).toBe('platform.ecosystem.organizations.detail')
    expect(mockGetEcosystemOrganizationDetail).toHaveBeenCalledWith({
      context: expect.any(Object),
      request,
      identifier: 'org-1'
    })
  })

  it('routes capabilities and readiness through shared adapters without touching legacy integrations routes', async () => {
    mockListEcosystemCapabilities.mockResolvedValue({ data: { items: [] } })
    mockGetEcosystemIntegrationReadiness.mockResolvedValue({ data: { allReady: true, results: {} } })

    await capabilitiesRoute.GET(new Request('https://example.com/api/platform/ecosystem/capabilities'))
    await readinessRoute.GET(new Request('https://example.com/api/platform/ecosystem/integration-readiness?keys=notion'))

    expect(mockListEcosystemCapabilities).toHaveBeenCalledTimes(1)
    expect(mockGetEcosystemIntegrationReadiness).toHaveBeenCalledTimes(1)
  })
})
