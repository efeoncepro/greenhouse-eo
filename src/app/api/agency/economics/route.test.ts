import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireAgencyTenantContext = vi.fn()
const mockGetAgencyEconomics = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireAgencyTenantContext: () => mockRequireAgencyTenantContext()
}))

vi.mock('@/lib/agency/agency-economics', () => ({
  getAgencyEconomics: (...args: unknown[]) => mockGetAgencyEconomics(...args)
}))

import { GET } from './route'

describe('GET /api/agency/economics', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireAgencyTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1' },
      errorResponse: null
    })
  })

  it('returns 401 when the agency tenant context is missing', async () => {
    mockRequireAgencyTenantContext.mockResolvedValue({
      tenant: null,
      errorResponse: null
    })

    const response = await GET(new Request('http://localhost/api/agency/economics'))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('passes the selected period to the reader and returns the response body', async () => {
    mockGetAgencyEconomics.mockResolvedValue({
      period: {
        year: 2026,
        month: 3,
        key: '2026-03',
        label: 'Mar 2026',
        periodClosed: true
      },
      totals: {
        revenueClp: 100,
        laborCostClp: 40,
        directExpenseClp: 10,
        overheadClp: 5,
        totalCostClp: 55,
        grossMarginClp: 45,
        grossMarginPct: 45,
        payrollRatioPct: 40,
        spaceCount: 1,
        activeServiceCount: 2
      },
      bySpace: [],
      trends: [],
      ranking: [],
      partialState: {
        isPartial: false,
        messages: []
      }
    })

    const response = await GET(new Request('http://localhost/api/agency/economics?year=2026&month=3&trendMonths=8'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockGetAgencyEconomics).toHaveBeenCalledWith({
      year: 2026,
      month: 3,
      trendMonths: 8
    })
    expect(body.period).toMatchObject({
      year: 2026,
      month: 3,
      key: '2026-03'
    })
  })
})
