/**
 * TASK-980 Slice 1 — tests del reader del reporte de período.
 *
 * Cubre: agrupación por los 2 grupos contables, subtotales por moneda
 * (retención solo en honorarios, netPaid solo en `paid`), split incluidos vs
 * excluidos, filtro por mes operativo, y período vacío.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()
const getEngagementMock = vi.fn()
const resolveNamesMock = vi.fn()
const getRemittanceNumbersMock = vi.fn()
const getOperatingEntityMock = vi.fn()
const getOperationalMonthMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

vi.mock('@/lib/account-360/organization-identity', () => ({
  getOperatingEntityIdentity: () => getOperatingEntityMock()
}))

vi.mock('@/lib/identity/profile-display-names', () => ({
  resolveProfileDisplayNames: (...args: unknown[]) => resolveNamesMock(...args)
}))

vi.mock('../store', () => ({
  getContractorEngagementById: (...args: unknown[]) => getEngagementMock(...args)
}))

vi.mock('../remittance/remittance-number-allocator', () => ({
  getRemittanceAdviceNumbersForPayables: (...args: unknown[]) => getRemittanceNumbersMock(...args)
}))

// mapContractorPayable como identidad → la query mock devuelve objetos ya con
// shape ContractorPayable (camelCase).
vi.mock('./store', () => ({
  mapContractorPayable: (row: unknown) => row,
  PAYABLE_SELECT_COLUMNS: 'cols'
}))

vi.mock('@/lib/calendar/operational-calendar', () => ({
  // operationalMonthKey = mes calendario del anchor (suficiente para el filtro).
  getOperationalPayrollMonth: (date: string) => ({ operationalMonthKey: String(date).slice(0, 7) }),
  // re-export del tipo (no usado en runtime)
  DEFAULT_OPERATIONAL_CALENDAR_TIMEZONE: 'America/Santiago'
}))

vi.mock('@/types/hr-contracts', () => ({
  getSiiRetentionRate: () => 0.1525
}))

import { buildContractorRunReport } from './run-report-reader'

const payable = (over: Record<string, unknown>) => ({
  contractorPayableId: 'p',
  publicId: 'EO-CPAY-0001',
  contractorEngagementId: 'e1',
  currency: 'CLP',
  paymentCurrency: null,
  grossAmount: 0,
  withholdingAmount: 0,
  netPayable: 0,
  payrollVia: 'internal',
  status: 'paid',
  dueDate: '2026-05-15',
  createdAt: '2026-05-15T00:00:00Z',
  ...over
})

beforeEach(() => {
  queryMock.mockReset()
  getEngagementMock.mockReset()
  resolveNamesMock.mockReset()
  getRemittanceNumbersMock.mockReset()
  getOperatingEntityMock.mockReset()
  getOperationalMonthMock.mockReset()

  getOperatingEntityMock.mockResolvedValue({ legalName: 'Efeonce Group SpA', taxId: '77.357.182-1', legalAddress: 'Dir' })
  resolveNamesMock.mockResolvedValue(new Map([['prof-1', 'Ada Lovelace'], ['prof-2', 'Alan Turing']]))
  getRemittanceNumbersMock.mockResolvedValue(new Map([['p1', 'EO-RA-000001']]))
  getEngagementMock.mockImplementation((id: string) => {
    if (id === 'e1') {
      return Promise.resolve({ contractorEngagementId: 'e1', publicId: 'EO-CENG-0001', profileId: 'prof-1', relationshipSubtype: 'honorarios_cl', paymentCurrency: null, taxWithholdingRateSnapshot: 0.1525 })
    }

    
return Promise.resolve({ contractorEngagementId: 'e2', publicId: 'EO-CENG-0002', profileId: 'prof-2', relationshipSubtype: 'freelance', paymentCurrency: null, taxWithholdingRateSnapshot: null })
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('buildContractorRunReport', () => {
  it('agrupa por régimen, subtotales por moneda, split incluidos/excluidos, filtra por período', async () => {
    queryMock.mockResolvedValueOnce([
      payable({ contractorPayableId: 'p1', contractorEngagementId: 'e1', grossAmount: 100000, withholdingAmount: 15250, netPayable: 84750, status: 'paid', dueDate: '2026-05-15' }),
      payable({ contractorPayableId: 'p2', contractorEngagementId: 'e1', grossAmount: 200000, withholdingAmount: 30500, netPayable: 169500, status: 'ready_for_finance', dueDate: '2026-05-20' }),
      payable({ contractorPayableId: 'p3', contractorEngagementId: 'e2', currency: 'USD', grossAmount: 500, withholdingAmount: 0, netPayable: 500, status: 'payment_order_created', dueDate: '2026-05-18' }),
      payable({ contractorPayableId: 'p4', contractorEngagementId: 'e1', grossAmount: 50000, withholdingAmount: 7625, netPayable: 42375, status: 'blocked', dueDate: '2026-05-10' }),
      // fuera de período (mes operativo junio)
      payable({ contractorPayableId: 'p5', contractorEngagementId: 'e1', grossAmount: 99999, status: 'paid', dueDate: '2026-06-15' })
    ])

    const report = await buildContractorRunReport({ periodYear: 2026, periodMonth: 5 })

    expect(report.operationalMonthKey).toBe('2026-05')
    expect(report.monthLabel).toBe('Mayo 2026')
    expect(report.isEmpty).toBe(false)

    // 2 grupos: honorarios_cl (p1, p2) + international (p3). p5 fuera de período.
    expect(report.groups.map(g => g.group)).toEqual(['honorarios_cl', 'international'])

    const hon = report.groups.find(g => g.group === 'honorarios_cl')!

    expect(hon.rows.map(r => r.contractorPayableId)).toEqual(['p1', 'p2'])
    const honClp = hon.byCurrency.find(c => c.currency === 'CLP')!

    expect(honClp.payableCount).toBe(2)
    expect(honClp.grossTotal).toBe(300000)
    expect(honClp.withholdingTotal).toBe(45750) // 15250 + 30500
    expect(honClp.netTotal).toBe(254250)
    expect(honClp.netPaidTotal).toBe(84750) // solo p1 paid

    const intl = report.groups.find(g => g.group === 'international')!

    expect(intl.rows.map(r => r.contractorPayableId)).toEqual(['p3'])
    const intlUsd = intl.byCurrency.find(c => c.currency === 'USD')!

    expect(intlUsd.withholdingTotal).toBe(0)
    expect(intlUsd.netPaidTotal).toBe(0) // p3 no está paid

    // excluidos: p4 (blocked)
    expect(report.excluded.map(r => r.contractorPayableId)).toEqual(['p4'])

    // grand totals: CLP (p1+p2) + USD (p3)
    expect(report.grandTotalsByCurrency.map(c => c.currency)).toEqual(['CLP', 'USD'])

    // enrichment: nombre, EO-RA solo en p1 paid, rate snapshot
    const p1 = hon.rows.find(r => r.contractorPayableId === 'p1')!

    expect(p1.contractorName).toBe('Ada Lovelace')
    expect(p1.engagementPublicId).toBe('EO-CENG-0001')
    expect(p1.remittanceNumber).toBe('EO-RA-000001')
    expect(p1.withholdingRateSnapshot).toBe(0.1525)
    const p2 = hon.rows.find(r => r.contractorPayableId === 'p2')!

    expect(p2.remittanceNumber).toBeNull() // no paid
  })

  it('período sin contractors → isEmpty + grupos vacíos', async () => {
    queryMock.mockResolvedValueOnce([])

    const report = await buildContractorRunReport({ periodYear: 2026, periodMonth: 5 })

    expect(report.isEmpty).toBe(true)
    expect(report.groups).toEqual([])
    expect(report.excluded).toEqual([])
    expect(report.grandTotalsByCurrency).toEqual([])
    expect(report.siiRateForPeriod).toBe(0.1525)
  })
})
