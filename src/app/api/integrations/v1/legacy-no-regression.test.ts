import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRequireIntegrationRequest = vi.fn()
const mockListCapabilityCatalogForIntegration = vi.fn()
const mockListTenantsForIntegration = vi.fn()
const mockParseIntegrationLimit = vi.fn()
const mockCheckMultipleReadiness = vi.fn()

vi.mock('@/lib/integrations/integration-auth', () => ({
  requireIntegrationRequest: (...args: unknown[]) => mockRequireIntegrationRequest(...args)
}))

vi.mock('@/lib/integrations/greenhouse-integration', () => ({
  listCapabilityCatalogForIntegration: (...args: unknown[]) => mockListCapabilityCatalogForIntegration(...args),
  listTenantsForIntegration: (...args: unknown[]) => mockListTenantsForIntegration(...args),
  parseIntegrationLimit: (...args: unknown[]) => mockParseIntegrationLimit(...args)
}))

vi.mock('@/lib/integrations/readiness', () => ({
  checkMultipleReadiness: (...args: unknown[]) => mockCheckMultipleReadiness(...args)
}))

const catalogRoute = await import('./catalog/capabilities/route')
const tenantsRoute = await import('./tenants/route')
const readinessRoute = await import('./readiness/route')

describe('legacy integrations v1 no-regression contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireIntegrationRequest.mockReturnValue({
      authorized: true,
      errorResponse: null
    })
    mockListCapabilityCatalogForIntegration.mockResolvedValue({
      exportedAt: '2026-04-25T20:30:00.000Z',
      businessLines: [],
      serviceModules: []
    })
    mockListTenantsForIntegration.mockResolvedValue([
      {
        clientId: 'client-1',
        publicId: 'EO-CLIENT-0001',
        clientName: 'Acme'
      }
    ])
    mockParseIntegrationLimit.mockReturnValue(50)
    mockCheckMultipleReadiness.mockResolvedValue(new Map([
      ['notion', { ready: true }]
    ]))
  })

  it('keeps catalog payload shape unchanged', async () => {
    const response = await catalogRoute.GET(new Request('https://example.com/api/integrations/v1/catalog/capabilities'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      exportedAt: '2026-04-25T20:30:00.000Z',
      businessLines: [],
      serviceModules: []
    })
  })

  it('keeps tenants list payload shape unchanged', async () => {
    const response = await tenantsRoute.GET(new Request('https://example.com/api/integrations/v1/tenants?limit=50'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.count).toBe(1)
    expect(body.items[0]).toEqual(expect.objectContaining({ clientId: 'client-1' }))
  })

  it('keeps readiness validation and payload shape unchanged', async () => {
    const response = await readinessRoute.GET(new Request('https://example.com/api/integrations/v1/readiness?keys=notion'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      allReady: true,
      results: {
        notion: { ready: true }
      }
    })
  })
})
