import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireFinanceTenantContext = vi.fn()
const mockResolveFinanceDownstreamScope = vi.fn()
const mockCreateCostAllocation = vi.fn()
const mockGetCostAllocationsByExpense = vi.fn()
const mockGetCostAllocationsByClient = vi.fn()
const mockListCostAllocationsByPeriod = vi.fn()
const mockDeleteCostAllocation = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireFinanceTenantContext: (...args: unknown[]) => mockRequireFinanceTenantContext(...args)
}))

vi.mock('@/lib/finance/canonical', () => ({
  resolveFinanceDownstreamScope: (...args: unknown[]) => mockResolveFinanceDownstreamScope(...args)
}))

vi.mock('@/lib/finance/shared', () => ({
  FinanceValidationError: class FinanceValidationError extends Error {
    statusCode: number

    constructor(message: string, statusCode = 422) {
      super(message)
      this.statusCode = statusCode
    }
  },
  assertNonEmptyString: (value: unknown, fieldName: string) => {
    const normalized = typeof value === 'string' ? value.trim() : ''

    if (!normalized) {
      throw new Error(`${fieldName} is required`)
    }

    return normalized
  },
  assertPositiveAmount: (value: number, fieldName: string) => {
    if (!(value > 0)) {
      throw new Error(`${fieldName} is required`)
    }

    return value
  },
  toNumber: (value: unknown) => Number(value),
  ALLOCATION_METHODS: ['manual', 'fte_proportional', 'revenue_proportional', 'equal_split']
}))

vi.mock('@/lib/finance/postgres-store-intelligence', () => ({
  createCostAllocation: (...args: unknown[]) => mockCreateCostAllocation(...args),
  getCostAllocationsByExpense: (...args: unknown[]) => mockGetCostAllocationsByExpense(...args),
  getCostAllocationsByClient: (...args: unknown[]) => mockGetCostAllocationsByClient(...args),
  listCostAllocationsByPeriod: (...args: unknown[]) => mockListCostAllocationsByPeriod(...args),
  deleteCostAllocation: (...args: unknown[]) => mockDeleteCostAllocation(...args)
}))

import { GET, POST } from '@/app/api/finance/intelligence/allocations/route'

describe('allocations route org-first contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireFinanceTenantContext.mockResolvedValue({
      tenant: { tenantType: 'efeonce_internal', routeGroups: ['finance'], userId: 'user-1' },
      errorResponse: null
    })

    mockResolveFinanceDownstreamScope.mockResolvedValue({
      clientId: 'client-1',
      clientProfileId: 'profile-1',
      hubspotCompanyId: 'hubspot-1',
      clientName: 'Sky Airline',
      legalName: 'Sky Airline SA',
      organizationId: 'org-1',
      spaceId: 'space-1'
    })

    mockGetCostAllocationsByExpense.mockResolvedValue([])
    mockGetCostAllocationsByClient.mockResolvedValue([])
    mockListCostAllocationsByPeriod.mockResolvedValue([])
    mockCreateCostAllocation.mockResolvedValue({
      allocationId: 'alloc-1',
      expenseId: 'EXP-1',
      clientId: 'client-1',
      clientName: 'Sky Airline',
      allocationPercent: 1,
      allocatedAmountClp: 1200,
      periodYear: 2026,
      periodMonth: 4,
      allocationMethod: 'manual',
      notes: null,
      createdBy: 'user-1'
    })
  })

  it('lists allocations for a period when no client selector is provided', async () => {
    const response = await GET(new Request('http://localhost/api/finance/intelligence/allocations?year=2026&month=4'))

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockListCostAllocationsByPeriod).toHaveBeenCalledWith(2026, 4)
    expect(mockGetCostAllocationsByClient).not.toHaveBeenCalled()
    expect(body).toMatchObject({
      allocations: [],
      items: [],
      total: 0
    })
  })

  it('creates an allocation from organization-first input without requiring clientId', async () => {
    const response = await POST(
      new Request('http://localhost/api/finance/intelligence/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId: 'EXP-1',
          organizationId: 'org-1',
          clientProfileId: 'profile-1',
          clientName: 'Sky Airline',
          allocationPercent: 1,
          allocatedAmountClp: 1200,
          periodYear: 2026,
          periodMonth: 4,
          allocationMethod: 'manual',
          notes: null
        })
      })
    )

    const body = await response.json()

    expect(response.status).toBe(201)
    expect(mockResolveFinanceDownstreamScope).toHaveBeenCalledWith({
      organizationId: 'org-1',
      clientId: undefined,
      clientProfileId: 'profile-1',
      hubspotCompanyId: undefined,
      requestedSpaceId: undefined,
      requireLegacyClientBridge: true
    })
    expect(mockCreateCostAllocation).toHaveBeenCalledWith({
      expenseId: 'EXP-1',
      clientId: 'client-1',
      clientName: 'Sky Airline',
      allocationPercent: 1,
      allocatedAmountClp: 1200,
      periodYear: 2026,
      periodMonth: 4,
      allocationMethod: 'manual',
      notes: null,
      actorUserId: 'user-1'
    })
    expect(body).toMatchObject({
      allocation: {
        allocationId: 'alloc-1',
        clientId: 'client-1'
      },
      created: true
    })
  })
})
