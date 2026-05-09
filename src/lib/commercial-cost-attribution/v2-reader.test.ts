import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: vi.fn()
}))

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  readCommercialCostAttributionByClientForPeriodV2,
  readCommercialCostAttributionByServiceForPeriodV2
} from './v2-reader'

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
      expenseDirectServiceClp: 0,
      expenseDirectMemberViaFteClp: 0
    })
    expect(result.coverage).toEqual({
      hasLaborData: false,
      hasDirectClientData: false,
      hasDirectServiceData: false,
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
      byDimension: { labor: 1500000, expenseDirectClient: 0, expenseDirectService: 0, expenseDirectMemberViaFte: 0 }
    })
    expect(result.coverage).toEqual({
      hasLaborData: true,
      hasDirectClientData: false,
      hasDirectServiceData: false,
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
      byDimension: { labor: 0, expenseDirectClient: 49815, expenseDirectService: 0, expenseDirectMemberViaFte: 0 }
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
      expenseDirectService: 0,
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
      hasDirectServiceData: false,
      hasDirectMemberViaFteData: true
    })
  })

  it('aggregates approved expense_direct_service allocations as their own direct-cost lane', async () => {
    queryMock.mockResolvedValueOnce([
      { period_year: 2026, period_month: 5, client_id: 'cli-sky', member_id: null, amount_clp: '175000', cost_dimension: 'expense_direct_service', fte_contribution: null }
    ])
    stubClientHydration([{ client_id: 'cli-sky', client_name: 'Sky Airline' }])

    const result = await readCommercialCostAttributionByClientForPeriodV2(2026, 5)

    expect(result.totals).toMatchObject({
      grandTotalClp: 175000,
      expenseDirectServiceClp: 175000
    })
    expect(result.clients[0].byDimension).toEqual({
      labor: 0,
      expenseDirectClient: 0,
      expenseDirectService: 175000,
      expenseDirectMemberViaFte: 0
    })
    expect(result.coverage.hasDirectServiceData).toBe(true)
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

describe('readCommercialCostAttributionByServiceForPeriodV2 (TASK-835)', () => {
  it('retorna mapa vacío sin consultar PG cuando serviceIds está vacío', async () => {
    const result = await readCommercialCostAttributionByServiceForPeriodV2({
      serviceIds: [],
      fromPeriod: { year: 2026, month: 4 },
      toPeriod: { year: 2026, month: 5 }
    })

    expect(result.size).toBe(0)
    expect(queryMock).not.toHaveBeenCalled()
  })

  it('agrega amount_clp por service_id en el rango de períodos', async () => {
    queryMock.mockResolvedValueOnce([
      { service_id: 'svc-A', amount_clp: '1500000' },
      { service_id: 'svc-B', amount_clp: '750000' }
    ])

    const result = await readCommercialCostAttributionByServiceForPeriodV2({
      serviceIds: ['svc-A', 'svc-B'],
      fromPeriod: { year: 2026, month: 4 },
      toPeriod: { year: 2026, month: 5 }
    })

    expect(result.get('svc-A')).toBe(1500000)
    expect(result.get('svc-B')).toBe(750000)
    expect(queryMock).toHaveBeenCalledTimes(1)

    const [sql, params] = queryMock.mock.calls[0]!

    expect(sql).toContain('service_id = ANY($1::text[])')
    expect(sql).toContain('attribution_intent = ANY($4::text[])')
    expect(params[0]).toEqual(['svc-A', 'svc-B'])
    expect(params[1]).toBe(202604)
    expect(params[2]).toBe(202605)
    expect(params[3]).toEqual(['pilot', 'trial', 'poc', 'discovery'])
  })

  it('omite el filtro de attribution_intent cuando se pasa lista vacía o null', async () => {
    queryMock.mockResolvedValueOnce([])

    await readCommercialCostAttributionByServiceForPeriodV2({
      serviceIds: ['svc-X'],
      fromPeriod: { year: 2026, month: 1 },
      toPeriod: { year: 2026, month: 12 },
      attributionIntents: null
    })

    const [sql, params] = queryMock.mock.calls[0]!

    expect(sql).not.toContain('attribution_intent')
    expect(params).toHaveLength(3)
  })

  it('deduplica serviceIds duplicados antes de consultar', async () => {
    queryMock.mockResolvedValueOnce([])

    await readCommercialCostAttributionByServiceForPeriodV2({
      serviceIds: ['svc-A', 'svc-A', 'svc-B', '   ', ''],
      fromPeriod: { year: 2026, month: 4 },
      toPeriod: { year: 2026, month: 4 }
    })

    const [, params] = queryMock.mock.calls[0]!

    expect(params[0]).toEqual(['svc-A', 'svc-B'])
  })

  it('omite filas con amount_clp <= 0 del mapa resultado', async () => {
    queryMock.mockResolvedValueOnce([
      { service_id: 'svc-A', amount_clp: '0' },
      { service_id: 'svc-B', amount_clp: '500' }
    ])

    const result = await readCommercialCostAttributionByServiceForPeriodV2({
      serviceIds: ['svc-A', 'svc-B'],
      fromPeriod: { year: 2026, month: 4 },
      toPeriod: { year: 2026, month: 4 }
    })

    expect(result.has('svc-A')).toBe(false)
    expect(result.get('svc-B')).toBe(500)
  })
})
