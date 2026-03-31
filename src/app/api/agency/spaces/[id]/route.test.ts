import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireAgencyTenantContext = vi.fn()
const mockGetAgencySpace360 = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireAgencyTenantContext: () => mockRequireAgencyTenantContext()
}))

vi.mock('@/lib/agency/space-360', () => ({
  getAgencySpace360: (...args: unknown[]) => mockGetAgencySpace360(...args)
}))

import { GET } from './route'

describe('GET /api/agency/spaces/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireAgencyTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1' },
      errorResponse: null
    })
    mockGetAgencySpace360.mockResolvedValue(null)
  })

  it('returns 401 when the agency tenant context is missing', async () => {
    mockRequireAgencyTenantContext.mockResolvedValue({
      tenant: null,
      errorResponse: null
    })

    const response = await GET(new Request('http://localhost/api/agency/spaces/client-1'), {
      params: Promise.resolve({ id: 'client-1' })
    })

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('returns 404 when the requested space is not found', async () => {
    const response = await GET(new Request('http://localhost/api/agency/spaces/missing'), {
      params: Promise.resolve({ id: 'missing' })
    })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Space not found' })
    expect(mockGetAgencySpace360).toHaveBeenCalledWith('missing')
  })

  it('returns the aggregated space detail when it exists', async () => {
    mockGetAgencySpace360.mockResolvedValue({
      requestedId: 'client-1',
      clientId: 'client-1',
      clientName: 'Acme',
      spaceId: 'space-1',
      dataStatus: 'ready',
      kpis: {
        revenueClp: 1800000
      }
    })

    const response = await GET(new Request('http://localhost/api/agency/spaces/client-1'), {
      params: Promise.resolve({ id: 'client-1' })
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      clientId: 'client-1',
      clientName: 'Acme',
      spaceId: 'space-1',
      dataStatus: 'ready',
      kpis: {
        revenueClp: 1800000
      }
    })
  })
})
