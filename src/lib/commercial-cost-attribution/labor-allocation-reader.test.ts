import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: vi.fn()
}))

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  readConsolidatedLaborAllocationForPeriod,
  getLaborAllocationSaturationDrift
} from './labor-allocation-reader'

const queryMock = runGreenhousePostgresQuery as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  queryMock.mockReset()
})

describe('readConsolidatedLaborAllocationForPeriod', () => {
  it('returns empty array when no rows', async () => {
    queryMock.mockResolvedValueOnce([])

    const result = await readConsolidatedLaborAllocationForPeriod(2026, 4)

    expect(result).toEqual([])
  })

  it('parses consolidated rows correctly', async () => {
    queryMock.mockResolvedValueOnce([
      {
        period_year: 2026,
        period_month: 3,
        member_id: 'daniela-ferreira',
        member_name: 'Daniela Ferreira',
        client_id: 'cli-sky',
        client_name: 'Sky Airline',
        fte_contribution: '1.000',
        allocated_labor_clp: '1104404.18',
        allocated_net_clp: '1100000.00',
        source_payroll_entry_count: '2'
      }
    ])

    const result = await readConsolidatedLaborAllocationForPeriod(2026, 3)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      memberId: 'daniela-ferreira',
      memberName: 'Daniela Ferreira',
      clientId: 'cli-sky',
      clientName: 'Sky Airline',
      fteContribution: 1.0,
      allocatedLaborClp: 1104404.18,
      sourcePayrollEntryCount: 2
    })
  })

  it('handles null allocated_labor_clp', async () => {
    queryMock.mockResolvedValueOnce([
      {
        period_year: 2026, period_month: 3, member_id: 'm1', member_name: null,
        client_id: 'c1', client_name: null,
        fte_contribution: null, allocated_labor_clp: null, allocated_net_clp: null,
        source_payroll_entry_count: '1'
      }
    ])

    const result = await readConsolidatedLaborAllocationForPeriod(2026, 3)

    expect(result[0].allocatedLaborClp).toBeNull()
    expect(result[0].fteContribution).toBeNull()
  })

  it('exposes source_payroll_entry_count > 1 (consolidation evidence)', async () => {
    queryMock.mockResolvedValueOnce([
      { period_year: 2026, period_month: 3, member_id: 'm1', member_name: 'M', client_id: 'c1', client_name: 'C', fte_contribution: '1.000', allocated_labor_clp: '500000', allocated_net_clp: '450000', source_payroll_entry_count: '3' }
    ])

    const result = await readConsolidatedLaborAllocationForPeriod(2026, 3)

    expect(result[0].sourcePayrollEntryCount).toBe(3)
  })
})

describe('getLaborAllocationSaturationDrift (Reliability signal)', () => {
  it('returns empty when no over-saturation detected', async () => {
    queryMock.mockResolvedValueOnce([])

    const drift = await getLaborAllocationSaturationDrift()

    expect(drift).toEqual([])
  })

  it('returns rows when a member has SUM(fte) > 1.0 (= invariant violation)', async () => {
    queryMock.mockResolvedValueOnce([
      {
        period_year: 2026,
        period_month: 5,
        member_id: 'mem-x',
        member_name: 'Member X',
        sum_fte: '1.5',
        client_count: '2',
        client_ids: ['cli-a', 'cli-b'],
        client_names: ['A', 'B']
      }
    ])

    const drift = await getLaborAllocationSaturationDrift()

    expect(drift).toHaveLength(1)
    expect(drift[0]).toMatchObject({
      memberId: 'mem-x',
      sumFte: 1.5,
      clientCount: 2,
      clientIds: ['cli-a', 'cli-b']
    })
  })
})
