import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireFinanceTenantContext = vi.fn()
const mockRunGreenhousePostgresQuery = vi.fn()
const mockCheckExchangeRateStaleness = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireFinanceTenantContext: (...args: unknown[]) => mockRequireFinanceTenantContext(...args)
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

vi.mock('@/lib/finance/shared', () => ({
  checkExchangeRateStaleness: (...args: unknown[]) => mockCheckExchangeRateStaleness(...args)
}))

import { GET } from '@/app/api/finance/data-quality/route'

describe('GET /api/finance/data-quality', () => {
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

    mockCheckExchangeRateStaleness.mockResolvedValue({
      isStale: false,
      ageDays: 1,
      thresholdDays: 3
    })

    mockRunGreenhousePostgresQuery.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes('ABS(COALESCE(i.amount_paid, 0) - p.total) > 0.01')) return [{ count: '1' }]
      if (sql.includes('ip.payment_id IS NULL')) return [{ count: '0' }]
      if (sql.includes('ABS(COALESCE(e.amount_paid, 0) - p.total) > 0.01')) return [{ count: '0' }]
      if (sql.includes('ep.payment_id IS NULL')) return [{ count: '0' }]
      if (sql.includes('settlement_groups sg')) return [{ count: '0' }]
      if (sql.includes('FROM greenhouse_finance.income_payments ip')) return [{ count: '0' }]
      if (sql.includes('FROM greenhouse_finance.expense_payments ep')) return [{ count: '0' }]
      if (sql.includes('FROM greenhouse_finance.reconciliation_periods rp')) return [{ count: '0' }]

      if (sql.includes('AS direct_without_client')) {
        expect(params).toEqual(['space-1'])

        return [{ direct_without_client: '2', shared_unallocated: '5' }]
      }

      if (sql.includes('FROM greenhouse_finance.income i') && sql.includes('client_id IS NULL OR client_id = \'\'')) {
        expect(params).toEqual(['space-1'])

        return [{ count: '0' }]
      }

      if (sql.includes('FROM greenhouse_finance.dte_emission_queue')) return [{ count: '0' }]

      if (sql.includes('balance_nubox IS NOT NULL')) {
        expect(params).toEqual(['space-1'])

        return [{ count: '0' }]
      }

      if (sql.includes('is_annulled = TRUE AND payment_status NOT IN')) {
        expect(params).toEqual(['space-1'])

        return [{ count: '0' }]
      }

      if (sql.includes('source_import_batch_id IS NOT NULL') && sql.includes('source_import_fingerprint IS NULL')) {
        return [{ count: '0' }]
      }

      if (sql.includes('fingerprint(s) duplicado') || sql.includes('HAVING COUNT(*) > 1')) return [{ count: '0' }]

      if (sql.includes('SUM(total_amount_clp - COALESCE(amount_paid, 0))')) {
        expect(params).toEqual(['space-1'])

        return [{ count: '3', total_clp: '1500000' }]
      }

      throw new Error(`Unexpected SQL in test:\n${sql}`)
    })
  })

  it('splits direct cost drift from allowed shared overhead and scopes checks by tenant space', async () => {
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.overallStatus).toBe('warning')
    expect(body.summary).toMatchObject({
      issueCount: 3,
      warningCount: 3,
      errorCount: 0,
      scope: 'tenant'
    })

    expect(body.summary.headline).toContain('buckets con issue activo')
    expect(body.summary.headline).toContain('overheads compartidos')

    expect(body.summary.buckets).toEqual([
      expect.objectContaining({
        key: 'payment_ledger_integrity',
        count: 1,
        status: 'warning',
        scope: 'tenant'
      }),
      expect.objectContaining({
        key: 'direct_cost_without_client',
        count: 2,
        status: 'warning',
        scope: 'tenant'
      }),
      expect.objectContaining({
        key: 'overdue_receivables',
        count: 3,
        status: 'warning',
        scope: 'tenant'
      }),
      expect.objectContaining({
        key: 'shared_overhead_unallocated',
        count: 5,
        status: 'ok',
        scope: 'tenant'
      })
    ])

    expect(body.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'direct_cost_without_client',
          status: 'warning',
          scope: 'tenant',
          value: 2
        }),
        expect.objectContaining({
          name: 'shared_overhead_unallocated',
          status: 'ok',
          scope: 'tenant',
          value: 5
        })
      ])
    )
  })

  it('falls back to global scope when tenant has no spaceId', async () => {
    mockRequireFinanceTenantContext.mockResolvedValueOnce({
      tenant: {
        tenantType: 'efeonce_internal',
        routeGroups: ['finance'],
        userId: 'user-1',
        spaceId: null
      },
      errorResponse: null
    })

    mockRunGreenhousePostgresQuery.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes('AS direct_without_client')) {
        expect(params).toEqual([])

        return [{ direct_without_client: '0', shared_unallocated: '0' }]
      }

      if (sql.includes('SUM(total_amount_clp - COALESCE(amount_paid, 0))')) {
        expect(params).toEqual([])

        return [{ count: '0', total_clp: '0' }]
      }

      if (
        sql.includes('ABS(COALESCE(i.amount_paid, 0) - p.total) > 0.01') ||
        sql.includes('ip.payment_id IS NULL') ||
        sql.includes('ABS(COALESCE(e.amount_paid, 0) - p.total) > 0.01') ||
        sql.includes('ep.payment_id IS NULL') ||
        sql.includes('settlement_groups sg') ||
        sql.includes('FROM greenhouse_finance.income_payments ip') ||
        sql.includes('FROM greenhouse_finance.expense_payments ep') ||
        sql.includes('FROM greenhouse_finance.reconciliation_periods rp') ||
        sql.includes('FROM greenhouse_finance.income i') ||
        sql.includes('FROM greenhouse_finance.dte_emission_queue') ||
        sql.includes('balance_nubox IS NOT NULL') ||
        sql.includes('is_annulled = TRUE AND payment_status NOT IN') ||
        sql.includes('source_import_batch_id IS NOT NULL')
      ) {
        expect(params ?? []).toEqual([])

        return [{ count: '0' }]
      }

      if (sql.includes('HAVING COUNT(*) > 1')) {
        return [{ count: '0' }]
      }

      throw new Error(`Unexpected SQL in global-scope test:\n${sql}`)
    })

    const response = await GET()
    const body = await response.json()
    const directCostCheck = body.checks.find((check: { name: string }) => check.name === 'direct_cost_without_client')

    expect(response.status).toBe(200)
    expect(directCostCheck.scope).toBe('global')
    expect(body.summary.scope).toBe('global')
  })
})
