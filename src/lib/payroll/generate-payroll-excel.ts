import 'server-only'

import ExcelJS from 'exceljs'

import type { PayrollEntry, PayrollPeriod } from '@/types/payroll'

import { getPayrollEntries } from '@/lib/payroll/get-payroll-entries'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { PayrollValidationError } from '@/lib/payroll/shared'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const formatCurrency = (value: number | null, currency: string): string => {
  if (value === null) return '—'

  return currency === 'CLP'
    ? `$${Math.round(value).toLocaleString('es-CL')}`
    : `US$${value.toFixed(2)}`
}

const formatKpiSourceLabel = (source: PayrollEntry['kpiDataSource']) => {
  if (source === 'manual') return 'Manual'
  if (source === 'ico') return 'ICO'

  return 'Notion Ops'
}

const applyHeaderStyle = (row: ExcelJS.Row) => {
  row.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF000000' } }
    }
  })
}

const applyCurrencyFormat = (cell: ExcelJS.Cell, currency: string) => {
  cell.numFmt = currency === 'CLP' ? '#,##0' : '#,##0.00'
  cell.alignment = { horizontal: 'right' }
}

const applyPercentFormat = (cell: ExcelJS.Cell) => {
  cell.numFmt = '0.0%'
  cell.alignment = { horizontal: 'center' }
}

const buildResumenSheet = (
  workbook: ExcelJS.Workbook,
  period: PayrollPeriod,
  entries: PayrollEntry[]
) => {
  const sheet = workbook.addWorksheet('Resumen')

  sheet.columns = [
    { width: 28 },
    { width: 28 }
  ]

  // Title
  const titleRow = sheet.addRow(['Resumen Nómina', ''])

  titleRow.getCell(1).font = { bold: true, size: 14 }
  sheet.mergeCells(titleRow.number, 1, titleRow.number, 2)
  sheet.addRow([])

  // Period metadata
  const monthName = MONTH_NAMES[period.month - 1] ?? String(period.month)

  const metaData: [string, string][] = [
    ['Período', `${monthName} ${period.year}`],
    ['ID Período', period.periodId],
    ['Estado', period.status],
    ['UF', period.ufValue != null ? `$${period.ufValue.toLocaleString('es-CL')}` : 'N/A'],
    ['Calculado', period.calculatedAt ?? '—'],
    ['Aprobado', period.approvedAt ?? '—'],
    ['Exportado', period.exportedAt ?? '—']
  ]

  for (const [label, value] of metaData) {
    const row = sheet.addRow([label, value])

    row.getCell(1).font = { bold: true }
  }

  sheet.addRow([])

  // Summary totals
  const chileEntries = entries.filter(e => e.payRegime === 'chile')
  const intlEntries = entries.filter(e => e.payRegime === 'international')

  const summaryTitle = sheet.addRow(['Totales', ''])

  summaryTitle.getCell(1).font = { bold: true, size: 12 }
  sheet.addRow([])

  const summaryHeaders = sheet.addRow(['Concepto', 'Valor'])

  applyHeaderStyle(summaryHeaders)

  const summaryData: [string, string][] = [
    ['Total miembros', String(entries.length)],
    ['Miembros Chile', String(chileEntries.length)],
    ['Miembros Internacional', String(intlEntries.length)],
    ['Total bruto CLP', formatCurrency(chileEntries.reduce((sum, e) => sum + e.grossTotal, 0), 'CLP')],
    ['Total neto CLP', formatCurrency(chileEntries.reduce((sum, e) => sum + e.netTotal, 0), 'CLP')],
    ['Total descuentos CLP', formatCurrency(chileEntries.reduce((sum, e) => sum + (e.chileTotalDeductions ?? 0), 0), 'CLP')],
    ['Total bruto USD', formatCurrency(intlEntries.reduce((sum, e) => sum + e.grossTotal, 0), 'USD')],
    ['Total neto USD', formatCurrency(intlEntries.reduce((sum, e) => sum + e.netTotal, 0), 'USD')]
  ]

  for (const [label, value] of summaryData) {
    sheet.addRow([label, value])
  }

  return sheet
}

const buildDetalleSheet = (
  workbook: ExcelJS.Workbook,
  entries: PayrollEntry[]
) => {
  const sheet = workbook.addWorksheet('Detalle')

  const headers = [
    'Nombre',
    'Email',
    'Régimen',
    'Moneda',
    'Salario base',
    'Base ajustada',
    'Asig. teletrabajo',
    'Teletrabajo ajust.',
    'Colación',
    'Movilización',
    'Etiqueta bono fijo',
    'Bono fijo',
    'Bono fijo ajust.',
    'Bono OTD',
    'Bono RpA',
    'Bono adicional',
    'Total bruto',
    'AFP',
    'Salud',
    'Seg. cesantía',
    'Impuesto',
    'APV',
    'Total descuentos',
    'Neto calculado',
    'Neto override',
    'Neto a pagar',
    'Override manual'
  ]

  sheet.columns = headers.map((header, i) => ({
    header,
    key: `col_${i}`,
    width: i <= 1 ? 28 : i <= 3 ? 14 : 16
  }))

  const headerRow = sheet.getRow(1)

  applyHeaderStyle(headerRow)

  for (const entry of entries) {
    const currency = entry.currency

    const entryWithAllowances = entry as PayrollEntry & {
      chileColacionAmount?: number | null
      chileMovilizacionAmount?: number | null
      chileColacion?: number | null
      chileMovilizacion?: number | null
      colacionAmount?: number | null
      movilizacionAmount?: number | null
      totalHaberesNoImponibles?: number | null
    }

    const colacion =
      entryWithAllowances.chileColacionAmount ??
      entryWithAllowances.chileColacion ??
      entryWithAllowances.colacionAmount ??
      0

    const movilizacion =
      entryWithAllowances.chileMovilizacionAmount ??
      entryWithAllowances.chileMovilizacion ??
      entryWithAllowances.movilizacionAmount ??
      0

    const row = sheet.addRow([
      entry.memberName,
      entry.memberEmail,
      entry.payRegime === 'chile' ? 'Chile' : 'Internacional',
      currency,
      entry.baseSalary,
      entry.adjustedBaseSalary ?? entry.baseSalary,
      entry.remoteAllowance,
      entry.adjustedRemoteAllowance ?? entry.remoteAllowance,
      colacion,
      movilizacion,
      entry.fixedBonusLabel,
      entry.fixedBonusAmount,
      entry.adjustedFixedBonusAmount ?? entry.fixedBonusAmount,
      entry.bonusOtdAmount,
      entry.bonusRpaAmount,
      entry.bonusOtherAmount,
      entry.grossTotal,
      entry.chileAfpAmount ?? 0,
      entry.chileHealthAmount ?? 0,
      entry.chileUnemploymentAmount ?? 0,
      entry.chileTaxAmount ?? 0,
      entry.chileApvAmount ?? 0,
      entry.chileTotalDeductions ?? 0,
      entry.netTotalCalculated ?? entry.netTotal,
      entry.netTotalOverride,
      entry.netTotal,
      entry.manualOverride ? 'Sí' : 'No'
    ])

    // Apply currency format to numeric cells excluding text/date style columns.
    for (const col of [5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26]) {
      const cell = row.getCell(col)

      if (typeof cell.value === 'number') {
        applyCurrencyFormat(cell, currency)
      }
    }

    // Color code by regime
    if (entry.payRegime === 'chile') {
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F8E9' } }
      })
    }
  }

  // Auto-filter
  sheet.autoFilter = { from: 'A1', to: `AA${entries.length + 1}` }

  return sheet
}

const buildAsistenciaSheet = (
  workbook: ExcelJS.Workbook,
  entries: PayrollEntry[]
) => {
  const sheet = workbook.addWorksheet('Asistencia & Bonos')

  const headers = [
    'Nombre',
    'Días hábiles',
    'Días presentes',
    'Días ausentes',
    'Días licencia',
    'Días lic. no remunerada',
    'OTD%',
    'Factor OTD',
    'Bono OTD',
    'RpA promedio',
    'Factor RpA',
    'Bono RpA',
    'Fuente KPI'
  ]

  sheet.columns = headers.map((header, i) => ({
    header,
    key: `col_${i}`,
    width: i === 0 ? 28 : 16
  }))

  const headerRow = sheet.getRow(1)

  applyHeaderStyle(headerRow)

  for (const entry of entries) {
    const row = sheet.addRow([
      entry.memberName,
      entry.workingDaysInPeriod ?? '—',
      entry.daysPresent ?? '—',
      entry.daysAbsent ?? '—',
      entry.daysOnLeave ?? '—',
      entry.daysOnUnpaidLeave ?? '—',
      entry.kpiOtdPercent != null ? entry.kpiOtdPercent / 100 : null,
      entry.bonusOtdProrationFactor != null ? entry.bonusOtdProrationFactor : null,
      entry.bonusOtdAmount,
      entry.kpiRpaAvg,
      entry.bonusRpaProrationFactor != null ? entry.bonusRpaProrationFactor : null,
      entry.bonusRpaAmount,
      formatKpiSourceLabel(entry.kpiDataSource)
    ])

    // Percent format for OTD% and factors
    const otdCell = row.getCell(7)

    if (typeof otdCell.value === 'number') applyPercentFormat(otdCell)

    const factorOtdCell = row.getCell(8)

    if (typeof factorOtdCell.value === 'number') applyPercentFormat(factorOtdCell)

    const factorRpaCell = row.getCell(11)

    if (typeof factorRpaCell.value === 'number') applyPercentFormat(factorRpaCell)

    // Currency for bonus amounts
    applyCurrencyFormat(row.getCell(9), entry.currency)
    applyCurrencyFormat(row.getCell(12), entry.currency)

    // Color absences
    if (entry.daysAbsent != null && entry.daysAbsent > 0) {
      row.getCell(4).font = { color: { argb: 'FFD32F2F' }, bold: true }
    }
  }

  sheet.autoFilter = { from: 'A1', to: `M${entries.length + 1}` }

  return sheet
}

export const generatePayrollExcel = async (periodId: string): Promise<Buffer> => {
  const period = await getPayrollPeriod(periodId)

  if (!period) {
    throw new PayrollValidationError('Payroll period not found.', 404)
  }

  if (period.status !== 'approved' && period.status !== 'exported') {
    throw new PayrollValidationError('Only approved or exported periods can generate reports.', 409)
  }

  const entries = await getPayrollEntries(periodId)

  const workbook = new ExcelJS.Workbook()

  workbook.creator = 'Greenhouse EO'
  workbook.created = new Date()

  buildResumenSheet(workbook, period, entries)
  buildDetalleSheet(workbook, entries)
  buildAsistenciaSheet(workbook, entries)

  const buffer = await workbook.xlsx.writeBuffer()

  return Buffer.from(buffer)
}
