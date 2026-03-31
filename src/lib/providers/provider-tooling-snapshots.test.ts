import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()
const mockClientQuery = vi.fn()

const mockWithGreenhousePostgresTransaction = vi.fn(async (callback: (client: { query: typeof mockClientQuery }) => Promise<unknown>) =>
  callback({ query: mockClientQuery })
)

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args),
  withGreenhousePostgresTransaction: (callback: (client: { query: typeof mockClientQuery }) => Promise<unknown>) =>
    mockWithGreenhousePostgresTransaction(callback)
}))

import {
  getLatestProviderToolingSnapshot,
  materializeProviderToolingSnapshotsForPeriod
} from '@/lib/providers/provider-tooling-snapshots'

describe('materializeProviderToolingSnapshotsForPeriod', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRunGreenhousePostgresQuery.mockImplementation((query: string) => {
      if (query.includes('FROM greenhouse_core.providers AS p')) {
        return Promise.resolve([
          {
            provider_id: 'anthropic',
            provider_name: 'Anthropic',
            provider_type: 'ai_vendor',
            supplier_id: 'supplier-anthropic',
            supplier_category: 'software',
            payment_currency: 'USD'
          }
        ])
      }

      if (query.includes('FROM greenhouse_ai.tool_catalog') && query.includes('GROUP BY provider_id')) {
        return Promise.resolve([
          {
            provider_id: 'anthropic',
            tool_count: '2',
            active_tool_count: '2'
          }
        ])
      }

      if (query.includes('WITH licensed_members AS')) {
        return Promise.resolve([
          {
            provider_id: 'anthropic',
            payroll_member_count: '2',
            licensed_member_payroll_cost_clp: '3200000'
          }
        ])
      }

      if (query.includes('FROM greenhouse_ai.member_tool_licenses AS l')) {
        return Promise.resolve([
          {
            provider_id: 'anthropic',
            license_id: 'license-1',
            member_id: 'member-1',
            subscription_amount: '120',
            subscription_currency: 'USD',
            subscription_billing_cycle: 'monthly',
            subscription_seats: '3',
            updated_at: '2026-03-12T10:00:00.000Z',
            activated_at: '2026-03-01'
          },
          {
            provider_id: 'anthropic',
            license_id: 'license-2',
            member_id: 'member-2',
            subscription_amount: '120',
            subscription_currency: 'USD',
            subscription_billing_cycle: 'monthly',
            subscription_seats: '3',
            updated_at: '2026-03-18T10:00:00.000Z',
            activated_at: '2026-03-05'
          }
        ])
      }

      if (query.includes('FROM greenhouse_ai.credit_wallets') && query.includes('GROUP BY provider_id')) {
        return Promise.resolve([
          {
            provider_id: 'anthropic',
            wallet_count: '1',
            active_wallet_count: '1'
          }
        ])
      }

      if (query.includes('FROM greenhouse_ai.credit_ledger AS l')) {
        return Promise.resolve([
          {
            provider_id: 'anthropic',
            usage_cost_total_clp: '45000'
          }
        ])
      }

      if (query.includes('FROM greenhouse_finance.expenses AS e')) {
        return Promise.resolve([
          {
            provider_id: 'anthropic',
            finance_expense_count: '2',
            finance_expense_total_clp: '120000',
            latest_expense_date: '2026-03-20'
          }
        ])
      }

      if (query.includes('FROM greenhouse_finance.exchange_rates')) {
        return Promise.resolve([
          {
            from_currency: 'USD',
            rate: '980'
          }
        ])
      }

      return Promise.resolve([])
    })
  })

  it('materializes provider-centric monthly costs and payroll exposure', async () => {
    const snapshots = await materializeProviderToolingSnapshotsForPeriod(2026, 3, 'test-refresh')

    expect(snapshots).toHaveLength(1)
    expect(snapshots[0]).toMatchObject({
      providerId: 'anthropic',
      toolCount: 2,
      activeToolCount: 2,
      activeLicenseCount: 2,
      activeMemberCount: 2,
      walletCount: 1,
      activeWalletCount: 1,
      financeExpenseCount: 2,
      financeExpenseTotalClp: 120000,
      usageCostTotalClp: 45000,
      payrollMemberCount: 2,
      licensedMemberPayrollCostClp: 3200000
    })
    expect(snapshots[0].subscriptionCostTotalClp).toBe(78400)
    expect(snapshots[0].totalProviderCostClp).toBe(243400)
    expect(snapshots[0].latestLicenseChangeAt).toBe('2026-03-18T10:00:00.000Z')
    expect(mockClientQuery).toHaveBeenCalledTimes(1)
    expect(mockClientQuery.mock.calls[0]?.[1]).toContain('test-refresh')
  })

  it('reads the latest stored provider snapshot for serving surfaces', async () => {
    mockRunGreenhousePostgresQuery.mockImplementation((query: string) => {
      if (query.includes('FROM greenhouse_serving.provider_tooling_snapshots')) {
        return Promise.resolve([
          {
            snapshot_id: 'anthropic:2026-03',
            provider_id: 'anthropic',
            provider_name: 'Anthropic',
            provider_type: 'ai_vendor',
            supplier_id: 'supplier-anthropic',
            supplier_category: 'software',
            payment_currency: 'USD',
            period_year: '2026',
            period_month: '3',
            period_id: '2026-03',
            tool_count: '2',
            active_tool_count: '2',
            active_license_count: '3',
            active_member_count: '2',
            wallet_count: '1',
            active_wallet_count: '1',
            subscription_cost_total_clp: '78400',
            usage_cost_total_clp: '45000',
            finance_expense_count: '2',
            finance_expense_total_clp: '120000',
            payroll_member_count: '2',
            licensed_member_payroll_cost_clp: '3200000',
            total_provider_cost_clp: '3368400',
            latest_expense_date: '2026-03-20',
            latest_license_change_at: '2026-03-18T10:00:00.000Z',
            snapshot_status: 'complete',
            updated_at: '2026-03-30T12:00:00.000Z'
          }
        ])
      }

      return Promise.resolve([])
    })

    const snapshot = await getLatestProviderToolingSnapshot('anthropic')

    expect(snapshot).toMatchObject({
      snapshotId: 'anthropic:2026-03',
      providerId: 'anthropic',
      periodId: '2026-03',
      activeLicenseCount: 3,
      totalProviderCostClp: 3368400,
      materializedAt: '2026-03-30T12:00:00.000Z'
    })
  })
})
