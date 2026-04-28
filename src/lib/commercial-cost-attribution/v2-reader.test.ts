import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: vi.fn()
}))

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { readCommercialCostAttributionByClientForPeriodV2 } from './v2-reader'

const queryMock = runGreenhousePostgresQuery as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  queryMock.mockReset()
})

const stubClientHydration = (rows: Array<{ client_id: string; client_name: string | null }>) => {
  // Second query is the clients hydration call.
  queryMock.mockResolvedValueOnce(rows)
}

describe('readCommercialCostAttributionByClientForPeriodV2', () => {
  it('returns empty result with all coverage flags false when there is no data', async () => {
    queryMock.mockResolvedValueOnce([])  // VIEW query

    const result = await readCommercialCostAttributionByClientForPeriodV2(2026, 4)

    expect(result.clients).toEqual([])
    expect(result.totals).toEqual({
      grandTotalClp: 0,
      laborClp: 0,
      expenseDirectClientClp: 0,
      expenseDirectMemberViaFteClp: 0
    })
    expect(result.coverage).toEqual({
      hasLaborData: false,
      hasDirectClientData: false,
      hasDirectMemberViaFteData: false
    })
  })

  it('aggregates labor allocation only (cron-driven dimension)', async () => {
    queryMock.mockResolvedValueOnce([
      { period_year: 2026, period_month: 3, client_id: 'cli-sky', member_id: 'mem-1', amount_clp: '1000000', cost_dimension: 'labor', fte_contribution: '0.5' },
      { period_year: 2026, period_month: 3, client_id: 'cli-sky', member_id: 'mem-2', amount_clp: '500000', cost_dimension: 'labor', fte_contribution: '0.3' }
    ])
    stubClientHydration([{ client_id: 'cli-sky', client_name: 'Sky Airline' }])

    const result = await readCommercialCostAttributionByClientForPeriodV2(2026, 3)

    expect(result.clients).toHaveLength(1)
    expect(result.clients[0]).toMatchObject({
      clientId: 'cli-sky',
      clientName: 'Sky Airline',
      totalClp: 1500000,
      byDimension: { labor: 1500000, expenseDirectClient: 0, expenseDirectMemberViaFte: 0 }
    })
    expect(result.coverage).toEqual({
      hasLaborData: true,
      hasDirectClientData: false,
      hasDirectMemberViaFteData: false
    })
  })

  it('aggregates expense_direct_client only (TASK-705 rules without labor)', async () => {
    queryMock.mockResolvedValueOnce([
      { period_year: 2026, period_month: 4, client_id: 'hubspot-company-27778972424', member_id: null, amount_clp: '49815', cost_dimension: 'expense_direct_client', fte_contribution: null }
    ])
    stubClientHydration([{ client_id: 'hubspot-company-27778972424', client_name: 'Motogas SpA' }])

    const result = await readCommercialCostAttributionByClientForPeriodV2(2026, 4)

    expect(result.clients).toHaveLength(1)
    expect(result.clients[0]).toMatchObject({
      clientName: 'Motogas SpA',
      totalClp: 49815,
      byDimension: { labor: 0, expenseDirectClient: 49815, expenseDirectMemberViaFte: 0 }
    })
    expect(result.coverage.hasDirectClientData).toBe(true)
    expect(result.coverage.hasLaborData).toBe(false)
  })

  it('combines all 3 dimensions for the same client', async () => {
    queryMock.mockResolvedValueOnce([
      { period_year: 2026, period_month: 3, client_id: 'cli-x', member_id: 'mem-1', amount_clp: '800000', cost_dimension: 'labor', fte_contribution: '0.4' },
      { period_year: 2026, period_month: 3, client_id: 'cli-x', member_id: null, amount_clp: '50000', cost_dimension: 'expense_direct_client', fte_contribution: null },
      { period_year: 2026, period_month: 3, client_id: 'cli-x', member_id: 'mem-1', amount_clp: '120000', cost_dimension: 'expense_direct_member_via_fte', fte_contribution: '0.4' }
    ])
    stubClientHydration([{ client_id: 'cli-x', client_name: 'Client X' }])

    const result = await readCommercialCostAttributionByClientForPeriodV2(2026, 3)

    expect(result.clients).toHaveLength(1)
    const client = result.clients[0]

    expect(client.totalClp).toBe(970000)
    expect(client.byDimension).toEqual({
      labor: 800000,
      expenseDirectClient: 50000,
      expenseDirectMemberViaFte: 120000
    })
    expect(client.members).toHaveLength(1)
    expect(client.members[0]).toMatchObject({
      memberId: 'mem-1',
      laborClp: 800000,
      expenseMemberClp: 120000,
      fteContribution: 0.4
    })
    expect(result.coverage).toEqual({
      hasLaborData: true,
      hasDirectClientData: true,
      hasDirectMemberViaFteData: true
    })
  })

  it('falls back to client_id when client_name is missing in greenhouse_core.clients', async () => {
    queryMock.mockResolvedValueOnce([
      { period_year: 2026, period_month: 4, client_id: 'unknown-client-123', member_id: null, amount_clp: '10000', cost_dimension: 'expense_direct_client', fte_contribution: null }
    ])
    stubClientHydration([])  // No row in clients table

    const result = await readCommercialCostAttributionByClientForPeriodV2(2026, 4)

    expect(result.clients[0].clientName).toBe('unknown-client-123')
  })

  it('sorts clients by total descending', async () => {
    queryMock.mockResolvedValueOnce([
      { period_year: 2026, period_month: 3, client_id: 'cli-a', member_id: null, amount_clp: '100', cost_dimension: 'expense_direct_client', fte_contribution: null },
      { period_year: 2026, period_month: 3, client_id: 'cli-b', member_id: null, amount_clp: '500', cost_dimension: 'expense_direct_client', fte_contribution: null },
      { period_year: 2026, period_month: 3, client_id: 'cli-c', member_id: null, amount_clp: '300', cost_dimension: 'expense_direct_client', fte_contribution: null }
    ])
    stubClientHydration([
      { client_id: 'cli-a', client_name: 'A' },
      { client_id: 'cli-b', client_name: 'B' },
      { client_id: 'cli-c', client_name: 'C' }
    ])

    const result = await readCommercialCostAttributionByClientForPeriodV2(2026, 3)

    expect(result.clients.map(c => c.clientId)).toEqual(['cli-b', 'cli-c', 'cli-a'])
  })
})
