import 'server-only'

import ExcelJS from 'exceljs'

import { formatCurrency as formatLocaleCurrency } from '@/lib/format'

import { axisSemanticSubValues } from '@/lib/design-tokens/semantic-sub-values'

import type {
  ContractorRunReport,
  ContractorRunReportCurrencySubtotal,
  ContractorRunReportRow
} from './run-report-reader'

/**
 * TASK-980 — Excel "Nómina de Contractors" (espejo del Excel de payroll TASK-782).
 *
 * Transformación PURA del `ContractorRunReport` (el reader hace el IO). Sheets:
 * Resumen (subtotales separados por grupo/moneda) · Honorarios CL · Internacional ·
 * Excluidos. Montos verbatim del reporte; subtotales mutuamente excluyentes
 * (retención SII solo honorarios → F29; neto pagado solo `paid` → banco).
 */

// Success ink (AA on white) en formato ARGB de ExcelJS — SoT canónico (TASK-1048 →
// Fase B success.ink). Adapter por medio: el hex del SoT → 'FF' + hex sin '#'.
const NET_ARGB = `FF${axisSemanticSubValues.success.ink.slice(1).toUpperCase()}`

const STATUS_LABELS: Record<ContractorRunReportRow['status'], string> = {
  pending_readiness: 'Por preparar',
  ready_for_finance: 'Listo para Finanzas',
  obligation_created: 'Obligación creada',
  payment_order_created: 'En orden de pago',
  paid: 'Pagado',
  blocked: 'Bloqueado',
  cancelled: 'Cancelado'
}

const formatCurrency = (value: number, currency: string): string =>
  formatLocaleCurrency(
    value,
    currency as 'CLP' | 'USD',
    currency === 'USD' ? { currencySymbol: 'US$' } : {},
    currency === 'USD' ? 'en-US' : undefined
  )

const applyHeaderStyle = (row: ExcelJS.Row) => {
  row.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NET_ARGB } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF000000' } } }
  })
}

const applyCurrencyFormat = (cell: ExcelJS.Cell, currency: string) => {
  cell.numFmt = currency === 'CLP' ? '#,##0' : '#,##0.00'
  cell.alignment = { horizontal: 'right' }
}

const dim = (cell: ExcelJS.Cell) => {
  cell.value = '—'
  cell.font = { color: { argb: 'FF9AA4B2' } }
  cell.alignment = { horizontal: 'right' }
}

const buildResumenSheet = (workbook: ExcelJS.Workbook, report: ContractorRunReport) => {
  const sheet = workbook.addWorksheet('Resumen')

  sheet.columns = [{ width: 30 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }]

  const title = sheet.addRow(['Nómina de Contractors'])

  title.font = { bold: true, size: 14 }
  sheet.mergeCells(`A${title.number}:E${title.number}`)

  sheet.addRow(['Período (mes operativo)', report.monthLabel])

  if (report.operatingEntity) {
    sheet.addRow(['Entidad emisora', report.operatingEntity.legalName])
    sheet.addRow(['RUT', report.operatingEntity.taxId])
  }

  sheet.addRow(['Tasa SII vigente', `${(report.siiRateForPeriod * 100).toFixed(2)}%`])
  sheet.addRow(['Generado', report.generatedAt.slice(0, 19).replace('T', ' ')])
  sheet.addRow([])

  const note = sheet.addRow([
    'El neto es lo pagado al contractor. La retención SII es un pasivo a remesar al SII (F29), no se le paga al contractor.'
  ])

  note.font = { italic: true, size: 9, color: { argb: 'FF6B7280' } }
  sheet.mergeCells(`A${note.number}:E${note.number}`)
  sheet.addRow([])

  const writeGroupBlock = (
    label: string,
    subtotals: ContractorRunReportCurrencySubtotal[],
    showWithholding: boolean
  ) => {
    if (subtotals.length === 0) return

    const groupRow = sheet.addRow([label])

    groupRow.font = { bold: true, size: 11, color: { argb: 'FF023C70' } }
    sheet.mergeCells(`A${groupRow.number}:E${groupRow.number}`)

    const header = sheet.addRow([
      'Moneda',
      'Pagos',
      'Bruto',
      showWithholding ? 'Retención SII (F29)' : 'Retención',
      'Neto'
    ])

    applyHeaderStyle(header)

    for (const sub of subtotals) {
      const row = sheet.addRow([sub.currency, sub.payableCount])

      applyCurrencyFormat(row.getCell(3), sub.currency)
      row.getCell(3).value = sub.grossTotal

      if (showWithholding) {
        applyCurrencyFormat(row.getCell(4), sub.currency)
        row.getCell(4).value = sub.withholdingTotal
      } else {
        dim(row.getCell(4))
      }

      applyCurrencyFormat(row.getCell(5), sub.currency)
      row.getCell(5).value = sub.netTotal
    }

    sheet.addRow([])
  }

  const hon = report.groups.find(g => g.group === 'honorarios_cl')
  const intl = report.groups.find(g => g.group === 'international')

  writeGroupBlock('Honorarios CL (con retención SII)', hon?.byCurrency ?? [], true)
  writeGroupBlock('Internacional (sin retención CL)', intl?.byCurrency ?? [], false)

  // Neto pagado (reconcilia banco) por moneda — solo status=paid, cross-group.
  if (report.grandTotalsByCurrency.some(c => c.netPaidTotal > 0)) {
    const paidRow = sheet.addRow(['Neto pagado al banco (status pagado)'])

    paidRow.font = { bold: true, size: 11, color: { argb: NET_ARGB } }
    sheet.mergeCells(`A${paidRow.number}:E${paidRow.number}`)
    const header = sheet.addRow(['Moneda', 'Neto pagado'])

    applyHeaderStyle(header)

    for (const sub of report.grandTotalsByCurrency) {
      if (sub.netPaidTotal <= 0) continue
      const row = sheet.addRow([sub.currency])

      applyCurrencyFormat(row.getCell(2), sub.currency)
      row.getCell(2).value = sub.netPaidTotal
    }
  }
}

const buildHonorariosSheet = (workbook: ExcelJS.Workbook, report: ContractorRunReport) => {
  const group = report.groups.find(g => g.group === 'honorarios_cl')

  if (!group || group.rows.length === 0) return

  const sheet = workbook.addWorksheet('Honorarios CL')

  sheet.columns = [
    { width: 26 }, { width: 16 }, { width: 8 }, { width: 14 }, { width: 12 },
    { width: 14 }, { width: 14 }, { width: 18 }, { width: 12 }, { width: 16 }
  ]

  const header = sheet.addRow([
    'Contractor', 'Engagement', 'Moneda', 'Bruto', 'Tasa SII', 'Retención SII', 'Neto', 'Estado', 'Vence', 'Comprobante'
  ])

  applyHeaderStyle(header)

  for (const row of group.rows) {
    const r = sheet.addRow([row.contractorName, row.engagementPublicId, row.currency])

    applyCurrencyFormat(r.getCell(4), row.currency)
    r.getCell(4).value = row.grossAmount

    if (row.withholdingRateSnapshot != null) {
      r.getCell(5).value = row.withholdingRateSnapshot
      r.getCell(5).numFmt = '0.00%'
      r.getCell(5).alignment = { horizontal: 'center' }
    } else {
      dim(r.getCell(5))
    }

    applyCurrencyFormat(r.getCell(6), row.currency)
    r.getCell(6).value = row.withholdingAmount
    applyCurrencyFormat(r.getCell(7), row.currency)
    r.getCell(7).value = row.netPayable
    r.getCell(8).value = STATUS_LABELS[row.status]
    r.getCell(9).value = row.dueDate ?? '—'
    r.getCell(10).value = row.remittanceNumber ?? '—'
  }
}

const buildInternacionalSheet = (workbook: ExcelJS.Workbook, report: ContractorRunReport) => {
  const group = report.groups.find(g => g.group === 'international')

  if (!group || group.rows.length === 0) return

  const sheet = workbook.addWorksheet('Internacional')

  sheet.columns = [
    { width: 26 }, { width: 16 }, { width: 16 }, { width: 8 }, { width: 14 }, { width: 14 }, { width: 12 }, { width: 16 }
  ]

  const header = sheet.addRow([
    'Contractor', 'Engagement', 'Canal', 'Moneda', 'Bruto', 'Neto', 'Estado', 'Comprobante'
  ])

  applyHeaderStyle(header)

  for (const row of group.rows) {
    const r = sheet.addRow([row.contractorName, row.engagementPublicId, row.payrollVia, row.currency])

    applyCurrencyFormat(r.getCell(5), row.currency)
    r.getCell(5).value = row.grossAmount
    applyCurrencyFormat(r.getCell(6), row.currency)
    r.getCell(6).value = row.netPayable
    r.getCell(7).value = STATUS_LABELS[row.status]
    r.getCell(8).value = row.remittanceNumber ?? '—'
  }
}

const buildExcluidosSheet = (workbook: ExcelJS.Workbook, report: ContractorRunReport) => {
  if (report.excluded.length === 0) return

  const sheet = workbook.addWorksheet('Excluidos')

  sheet.columns = [{ width: 26 }, { width: 16 }, { width: 18 }, { width: 14 }, { width: 8 }]
  const header = sheet.addRow(['Contractor', 'Engagement', 'Estado', 'Bruto', 'Moneda'])

  applyHeaderStyle(header)

  for (const row of report.excluded) {
    const r = sheet.addRow([row.contractorName, row.engagementPublicId, STATUS_LABELS[row.status]])

    applyCurrencyFormat(r.getCell(4), row.currency)
    r.getCell(4).value = row.grossAmount
    r.getCell(5).value = row.currency
  }
}

export const generateContractorRunExcel = async (report: ContractorRunReport): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook()

  workbook.creator = 'Greenhouse EO'
  workbook.created = new Date(report.generatedAt)

  buildResumenSheet(workbook, report)
  buildHonorariosSheet(workbook, report)
  buildInternacionalSheet(workbook, report)
  buildExcluidosSheet(workbook, report)

  const arrayBuffer = await workbook.xlsx.writeBuffer()

  
return Buffer.from(arrayBuffer)
}

export { formatCurrency as formatContractorRunCurrency }
