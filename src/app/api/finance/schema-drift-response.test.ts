import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireFinanceTenantContext = vi.fn()
const mockResolveFinanceDownstreamScope = vi.fn()
const mockListHes = vi.fn()
const mockRunGreenhousePostgresQuery = vi.fn()
const mockWithGreenhousePostgresTransaction = vi.fn()
const mockListOperationalPlSnapshots = vi.fn()
const mockGetFinanceCurrentPeriod = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireFinanceTenantContext: (...args: unknown[]) => mockRequireFinanceTenantContext(...args)
}))

vi.mock('@/lib/finance/canonical', () => ({
  resolveFinanceDownstreamScope: (...args: unknown[]) => mockResolveFinanceDownstreamScope(...args)
}))

vi.mock('@/lib/finance/hes-store', () => ({
  listHes: (...args: unknown[]) => mockListHes(...args),
  createHes: vi.fn()
}))

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args),
  withGreenhousePostgresTransaction: (...args: unknown[]) => mockWithGreenhousePostgresTransaction(...args)
}))

vi.mock('@/lib/cost-intelligence/compute-operational-pl', () => ({
  listOperationalPlSnapshots: (...args: unknown[]) => mockListOperationalPlSnapshots(...args)
}))

vi.mock('@/lib/finance/reporting', () => ({
  getFinanceCurrentPeriod: (...args: unknown[]) => mockGetFinanceCurrentPeriod(...args)
}))

import { GET as getHes } from '@/app/api/finance/hes/route'
import { GET as getQuotes } from '@/app/api/finance/quotes/route'
import { GET as getOperationalPl } from '@/app/api/finance/intelligence/operational-pl/route'

describe('Finance schema drift responses', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireFinanceTenantContext.mockResolvedValue({
      tenant: {
        tenantType: 'efeonce_internal',
        routeGroups: ['finance'],
        userId: 'user-1',
        spaceId: 'space-1'
      },
      errorResponse: null
    })

    mockResolveFinanceDownstreamScope.mockResolvedValue({
      clientId: 'client-1',
      organizationId: 'org-1',
      spaceId: 'space-1'
    })

    mockGetFinanceCurrentPeriod.mockReturnValue({ year: 2026, month: 4 })
  })

  it('returns a degraded payload for HES when schema drift is detected', async () => {
    mockListHes.mockRejectedValueOnce(new Error('relation greenhouse_finance.hes does not exist'))

    const response = await getHes(new Request('http://localhost/api/finance/hes?status=active'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      items: [],
      total: 0,
      degraded: true,
      errorCode: 'FINANCE_SCHEMA_DRIFT'
    })
  })

  it('returns a degraded payload for quotes when schema drift is detected', async () => {
    mockRunGreenhousePostgresQuery
      .mockRejectedValueOnce(new Error('relation greenhouse_commercial.quotations does not exist'))
      .mockRejectedValueOnce(new Error('relation greenhouse_finance.quotes does not exist'))

    const response = await getQuotes(new Request('http://localhost/api/finance/quotes?status=sent'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      items: [],
      total: 0,
      degraded: true,
      errorCode: 'FINANCE_SCHEMA_DRIFT'
    })
  })

  it('returns a degraded payload for operational pl when schema drift is detected', async () => {
    mockListOperationalPlSnapshots.mockRejectedValueOnce(
      new Error('column greenhouse_serving.operational_pl_snapshots.organization_id does not exist')
    )

    const response = await getOperationalPl(new Request('http://localhost/api/finance/intelligence/operational-pl'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      snapshots: [],
      year: 2026,
      month: 4,
      degraded: true,
      errorCode: 'FINANCE_SCHEMA_DRIFT'
    })
  })
})
