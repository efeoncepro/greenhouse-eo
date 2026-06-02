/**
 * TASK-980 Slice 2 — tests del Excel "Nómina de Contractors".
 *
 * Round-trip: genera el workbook, lo re-parsea con ExcelJS y verifica sheets +
 * celdas clave. Cubre reporte completo (2 grupos + excluidos) y período vacío.
 */
import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'

import { generateContractorRunExcel } from './generate-contractor-run-excel'
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
  operatingEntity: { legalName: 'Efeonce Group SpA', taxId: '77.357.182-1', legalAddress: 'Dir' },
  siiRateForPeriod: 0.1525,
  groups: [],
  excluded: [],
  grandTotalsByCurrency: [],
  isEmpty: true,
  ...over
})

const load = async (buffer: Buffer): Promise<ExcelJS.Workbook> => {
  const wb = new ExcelJS.Workbook()

  await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer)
  
return wb
}

describe('generateContractorRunExcel', () => {
  it('reporte completo → sheets Resumen + Honorarios CL + Internacional + Excluidos', async () => {
    const honRow = row({ contractorPayableId: 'p1' })

    const intlRow = row({
      contractorPayableId: 'p3',
      regime: 'provider_managed',
      regimeGroup: 'international',
      contractorName: 'Alan Turing',
      engagementPublicId: 'EO-CENG-0002',
      currency: 'USD',
      grossAmount: 500,
      withholdingAmount: 0,
      netPayable: 500,
      withholdingRateSnapshot: null,
      status: 'payment_order_created',
      remittanceNumber: null
    })

    const blockedRow = row({ contractorPayableId: 'p4', status: 'blocked', remittanceNumber: null })

    const report = baseReport({
      isEmpty: false,
      groups: [
        { group: 'honorarios_cl', rows: [honRow], byCurrency: [{ currency: 'CLP', payableCount: 1, grossTotal: 100000, withholdingTotal: 15250, netTotal: 84750, netPaidTotal: 84750 }] },
        { group: 'international', rows: [intlRow], byCurrency: [{ currency: 'USD', payableCount: 1, grossTotal: 500, withholdingTotal: 0, netTotal: 500, netPaidTotal: 0 }] }
      ],
      excluded: [blockedRow],
      grandTotalsByCurrency: [
        { currency: 'CLP', payableCount: 1, grossTotal: 100000, withholdingTotal: 15250, netTotal: 84750, netPaidTotal: 84750 },
        { currency: 'USD', payableCount: 1, grossTotal: 500, withholdingTotal: 0, netTotal: 500, netPaidTotal: 0 }
      ]
    })

    const buffer = await generateContractorRunExcel(report)

    expect(buffer.length).toBeGreaterThan(0)

    const wb = await load(buffer)

    expect(wb.worksheets.map(s => s.name)).toEqual(['Resumen', 'Honorarios CL', 'Internacional', 'Excluidos'])

    const hon = wb.getWorksheet('Honorarios CL')!

    // header en fila 1, primer dato en fila 2
    expect(hon.getRow(2).getCell(1).value).toBe('Ada Lovelace')
    expect(hon.getRow(2).getCell(10).value).toBe('EO-RA-000001')

    const intl = wb.getWorksheet('Internacional')!

    expect(intl.getRow(2).getCell(1).value).toBe('Alan Turing')
  })

  it('período vacío → solo sheet Resumen (sin grupos ni excluidos)', async () => {
    const buffer = await generateContractorRunExcel(baseReport({}))
    const wb = await load(buffer)

    expect(wb.worksheets.map(s => s.name)).toEqual(['Resumen'])
  })
})
