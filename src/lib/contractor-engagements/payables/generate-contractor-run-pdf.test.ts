/**
 * TASK-980 Slice 3 — smoke test del PDF "Nómina de Contractors".
 *
 * Verifica que el generador produce un PDF válido (magic bytes %PDF) para un
 * reporte completo (2 grupos + excluidos) y para un período vacío, sin throw.
 */
import { describe, expect, it } from 'vitest'

import { generateContractorRunPdf } from './generate-contractor-run-pdf'
import type { ContractorRunReport, ContractorRunReportRow } from './run-report-reader'

const row = (over: Partial<ContractorRunReportRow>): ContractorRunReportRow => ({
  contractorPayableId: 'p',
  publicId: 'EO-CPAY-0001',
  contractorName: 'Ada Lovelace',
  engagementPublicId: 'EO-CENG-0001',
  regime: 'honorarios_cl',
  regimeGroup: 'honorarios_cl',
  payrollVia: 'internal',
  grossAmount: 100000,
  withholdingAmount: 15250,
  netPayable: 84750,
  currency: 'CLP',
  withholdingRateSnapshot: 0.1525,
  status: 'paid',
  dueDate: '2026-05-15',
  remittanceNumber: 'EO-RA-000001',
  ...over
})

const baseReport = (over: Partial<ContractorRunReport>): ContractorRunReport => ({
  periodYear: 2026,
  periodMonth: 5,
  operationalMonthKey: '2026-05',
  monthLabel: 'Mayo 2026',
  generatedAt: '2026-06-05T12:00:00.000Z',
  operatingEntity: { legalName: 'Efeonce Group SpA', taxId: '77.357.182-1', legalAddress: 'Dr. Manuel Barros Borgoño 71' },
  siiRateForPeriod: 0.1525,
  groups: [],
  excluded: [],
  grandTotalsByCurrency: [],
  isEmpty: true,
  ...over
})

describe('generateContractorRunPdf', () => {
  it('reporte completo → PDF válido (%PDF)', async () => {
    const report = baseReport({
      isEmpty: false,
      groups: [
        { group: 'honorarios_cl', rows: [row({ contractorPayableId: 'p1' })], byCurrency: [{ currency: 'CLP', payableCount: 1, grossTotal: 100000, withholdingTotal: 15250, netTotal: 84750, netPaidTotal: 84750 }] },
        { group: 'international', rows: [row({ contractorPayableId: 'p3', regime: 'provider_managed', regimeGroup: 'international', contractorName: 'Alan Turing', currency: 'USD', grossAmount: 500, withholdingAmount: 0, netPayable: 500, withholdingRateSnapshot: null, status: 'payment_order_created', remittanceNumber: null })], byCurrency: [{ currency: 'USD', payableCount: 1, grossTotal: 500, withholdingTotal: 0, netTotal: 500, netPaidTotal: 0 }] }
      ],
      excluded: [row({ contractorPayableId: 'p4', status: 'blocked', remittanceNumber: null })],
      grandTotalsByCurrency: [
        { currency: 'CLP', payableCount: 1, grossTotal: 100000, withholdingTotal: 15250, netTotal: 84750, netPaidTotal: 84750 },
        { currency: 'USD', payableCount: 1, grossTotal: 500, withholdingTotal: 0, netTotal: 500, netPaidTotal: 0 }
      ]
    })

    const buffer = await generateContractorRunPdf(report)

    expect(buffer.length).toBeGreaterThan(1000)
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-')
  }, 30000)

  it('período vacío → PDF válido', async () => {
    const buffer = await generateContractorRunPdf(baseReport({}))

    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-')
  }, 30000)
})
