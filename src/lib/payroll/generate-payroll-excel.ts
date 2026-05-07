import 'server-only'

import ExcelJS from 'exceljs'

import type { PayrollEntry, PayrollPeriod } from '@/types/payroll'
import { formatCurrency as formatLocaleCurrency } from '@/lib/format'

import { getPayrollEntries } from '@/lib/payroll/get-payroll-entries'
import { getActiveAdjustmentsForPeriod } from '@/lib/payroll/adjustments/apply-adjustment'
import {
  getEntryAdjustmentBreakdown,
  type EntryAdjustmentBreakdown
} from '@/lib/payroll/adjustments/breakdown'
import type { PayrollAdjustment } from '@/types/payroll-adjustments'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { PayrollValidationError } from '@/lib/payroll/shared'
import {
  groupEntriesByRegime,
  RECEIPT_REGIME_BADGES,
  type ReceiptRegime
} from '@/lib/payroll/receipt-presenter'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const formatCurrency = (value: number | null, currency: string): string => {
  return formatLocaleCurrency(
    value,
    currency as 'CLP' | 'USD',
    currency === 'USD' ? { currencySymbol: 'US$' } : {},
    currency === 'USD' ? 'en-US' : undefined
  )
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
    ['UF', period.ufValue != null ? formatLocaleCurrency(period.ufValue, 'CLP') : 'N/A'],
    ['Calculado', period.calculatedAt ?? '—'],
    ['Aprobado', period.approvedAt ?? '—'],
    ['Exportado', period.exportedAt ?? '—']
  ]

  for (const [label, value] of metaData) {
    const row = sheet.addRow([label, value])

    row.getCell(1).font = { bold: true }
  }

  sheet.addRow([])

  // TASK-782 — group by canonical regime (single source of truth, exported by TASK-758).
  const groups = groupEntriesByRegime(entries)
  const chileDepEntries = groups.chile_dependent
  const honorariosEntries = groups.honorarios
  const deelEntries = groups.international_deel
  const intlInternalEntries = groups.international_internal

  const summaryTitle = sheet.addRow(['Totales', ''])

  summaryTitle.getCell(1).font = { bold: true, size: 12 }
  sheet.addRow([])

  const summaryHeaders = sheet.addRow(['Concepto', 'Valor'])

  applyHeaderStyle(summaryHeaders)

  const sumGross = (list: PayrollEntry[]) => list.reduce((sum, e) => sum + e.grossTotal, 0)
  const sumNet = (list: PayrollEntry[]) => list.reduce((sum, e) => sum + e.netTotal, 0)

  // TASK-782 — `Total descuentos previsionales` (only chile_dependent) is mutually
  // exclusive from `Total retención SII honorarios` (only honorarios). Previously
  // a single `Total descuentos CLP` mixed both because the engine assigns
  // `chileTotalDeductions = siiRetentionAmount` for honorarios.
  const totalPrevDeductionsClp = chileDepEntries.reduce((sum, e) => sum + (e.chileTotalDeductions ?? 0), 0)
  const totalSiiRetentionClp = honorariosEntries.reduce((sum, e) => sum + (e.siiRetentionAmount ?? 0), 0)

  const summaryData: [string, string][] = [
    ['Total miembros', String(entries.length)],
    ['# Chile dependiente (CL-DEP)', String(chileDepEntries.length)],
    ['# Honorarios (HON)', String(honorariosEntries.length)],
    ['# Internacional Deel (DEEL)', String(deelEntries.length)],
    ['# Internacional interno (INT)', String(intlInternalEntries.length)],
    ['Total bruto Chile dependiente CLP', formatCurrency(sumGross(chileDepEntries), 'CLP')],
    ['Total descuentos previsionales CLP', formatCurrency(totalPrevDeductionsClp, 'CLP')],
    ['Total neto Chile dependiente CLP', formatCurrency(sumNet(chileDepEntries), 'CLP')],
    ['Total bruto Honorarios CLP', formatCurrency(sumGross(honorariosEntries), 'CLP')],
    ['Total retención SII honorarios CLP', formatCurrency(totalSiiRetentionClp, 'CLP')],
    ['Total neto Honorarios CLP', formatCurrency(sumNet(honorariosEntries), 'CLP')],
    ['Total bruto Internacional Deel USD', formatCurrency(sumGross(deelEntries), 'USD')],
    ['Total bruto Internacional interno USD', formatCurrency(sumGross(intlInternalEntries), 'USD')]
  ]

  for (const [label, value] of summaryData) {
    sheet.addRow([label, value])
  }

  return sheet
}

const buildDetalleSheet = (
  workbook: ExcelJS.Workbook,
  entries: PayrollEntry[],
  breakdownsByEntry: Map<string, EntryAdjustmentBreakdown>
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
    'AFP cotización',
    'AFP comisión',
    'Salud',
    'Seg. cesantía',
    'Impuesto',
    'APV',
    'Total descuentos',
    'Neto calculado',
    'Neto override',
    'Neto a pagar',
    'Override manual',
    // TASK-745d — adjustments visibility en exports
    'Excluido',
    'Factor aplicado',
    'Descuento adicional',
    'Motivo descuento',
    'Override neto'
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

    const breakdown = breakdownsByEntry.get(entry.entryId)

    const reasonNotes = breakdown
      ? [
          ...breakdown.fixedDeductions.map(fd => `${fd.reasonLabel}: ${fd.reasonNote}`),
          breakdown.excluded ? `Excluido: ${breakdown.excluded.reasonNote}` : null,
          breakdown.manualOverride ? `Override: ${breakdown.manualOverride.reasonNote}` : null
        ]
          .filter(Boolean)
          .join(' | ')
      : ''

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
      entry.chileAfpCotizacionAmount ?? 0,
      entry.chileAfpComisionAmount ?? 0,
      entry.chileHealthAmount ?? 0,
      entry.chileUnemploymentAmount ?? 0,
      entry.chileTaxAmount ?? 0,
      entry.chileApvAmount ?? 0,
      entry.chileTotalDeductions ?? 0,
      entry.netTotalCalculated ?? entry.netTotal,
      entry.netTotalOverride,
      entry.netTotal,
      entry.manualOverride ? 'Sí' : 'No',
      // TASK-745d — adjustments visibility
      breakdown?.excluded ? 'Sí' : 'No',
      breakdown?.factorApplied ?? 1,
      breakdown?.totalFixedDeductionAmount ?? 0,
      reasonNotes,
      breakdown?.manualOverride ? breakdown.manualOverride.netAmount : null
    ])

    // Apply currency format to numeric cells excluding text/date style columns.
    for (const col of [5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 32, 34]) {
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

    // TASK-745d — Highlight rows with active adjustments
    if (breakdown && breakdown.hasActiveAdjustments) {
      const highlightColor = breakdown.excluded ? 'FFFFE0E0' : 'FFFFF4D6'

      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: highlightColor } }
      })
    }
  }

  // Auto-filter (extiende a las nuevas columnas)
  sheet.autoFilter = { from: 'A1', to: `AH${entries.length + 1}` }

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

// ═════════════════════════════════════════════════════════════════════════
// TASK-782 — Canonical sheets per regime (Chile + Internacional)
// Each sheet has 2 internal sections so compliance/SII/PREVIRED can read
// the month unified while keeping subtotals mutually exclusive.
// ═════════════════════════════════════════════════════════════════════════

const SECTION_ROW_FILL_ARGB = 'FFD6E0EB' // brand-blue tint, matches PDF group dividers
const SUBTOTAL_FILL_ARGB = 'FFE8EFF7' // brand-accent-bg

const applySectionRowStyle = (row: ExcelJS.Row) => {
  row.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FF023C70' }, size: 10 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SECTION_ROW_FILL_ARGB } }
    cell.alignment = { horizontal: 'left', vertical: 'middle' }
  })
}

const applySubtotalRowStyle = (row: ExcelJS.Row) => {
  row.eachCell(cell => {
    cell.font = { bold: true, size: 10 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUBTOTAL_FILL_ARGB } }
    cell.border = { top: { style: 'medium', color: { argb: 'FF023C70' } } }
  })
}

const buildChileSheet = (
  workbook: ExcelJS.Workbook,
  groups: Record<ReceiptRegime, PayrollEntry[]>
) => {
  const chileDep = groups.chile_dependent
  const honorarios = groups.honorarios

  // Skip the entire sheet if nothing applies (keeps the workbook lean for
  // periods made entirely of Deel/internacional entries).
  if (chileDep.length === 0 && honorarios.length === 0) return null

  const sheet = workbook.addWorksheet('Chile')

  // 13 columns canónicas per approved mockup.
  const headers = [
    '#',
    'Nombre',
    'Régimen',
    'Bruto',
    'Gratif.',
    'AFP',
    'Salud',
    'Cesantía',
    'IUSC',
    'APV',
    'Tasa SII',
    'Retención SII',
    'Neto'
  ]

  sheet.columns = headers.map((header, i) => ({
    header,
    key: `col_${i}`,
    width: i === 0 ? 5 : i === 1 ? 28 : i === 2 ? 12 : 14
  }))

  applyHeaderStyle(sheet.getRow(1))

  let runningIndex = 1

  // ── Section 1 · Chile dependiente ──
  if (chileDep.length > 0) {
    const sectionRow = sheet.addRow([
      `▼ Sección 1 · Chile dependiente (${chileDep.length} colaboradores)`
    ])

    sheet.mergeCells(sectionRow.number, 1, sectionRow.number, headers.length)
    applySectionRowStyle(sectionRow)

    for (const entry of chileDep) {
      const row = sheet.addRow([
        runningIndex++,
        entry.memberName,
        RECEIPT_REGIME_BADGES.chile_dependent.code,
        entry.grossTotal,
        entry.chileGratificacionLegalAmount ?? 0,
        entry.chileAfpAmount ?? 0,
        entry.chileHealthAmount ?? 0,
        entry.chileUnemploymentAmount ?? 0,
        entry.chileTaxAmount ?? 0,
        entry.chileApvAmount ?? 0,
        '—', // Tasa SII not applicable
        '—', // Retención SII not applicable
        entry.netTotal
      ])

      // Currency cells (CLP, integer formatting). Skip Tasa SII / Retención SII (text "—").
      for (const col of [4, 5, 6, 7, 8, 9, 10, 13]) {
        const cell = row.getCell(col)

        if (typeof cell.value === 'number') applyCurrencyFormat(cell, 'CLP')
      }

      // Dim the SII columns (col 11/12) for chile_dependent rows.
      row.getCell(11).font = { color: { argb: 'FF999999' } }
      row.getCell(11).alignment = { horizontal: 'right' }
      row.getCell(12).font = { color: { argb: 'FF999999' } }
      row.getCell(12).alignment = { horizontal: 'right' }
    }

    const subtotal = sheet.addRow([
      '',
      'Total descuentos previsionales',
      '',
      chileDep.reduce((s, e) => s + e.grossTotal, 0),
      chileDep.reduce((s, e) => s + (e.chileGratificacionLegalAmount ?? 0), 0),
      chileDep.reduce((s, e) => s + (e.chileAfpAmount ?? 0), 0),
      chileDep.reduce((s, e) => s + (e.chileHealthAmount ?? 0), 0),
      chileDep.reduce((s, e) => s + (e.chileUnemploymentAmount ?? 0), 0),
      chileDep.reduce((s, e) => s + (e.chileTaxAmount ?? 0), 0),
      chileDep.reduce((s, e) => s + (e.chileApvAmount ?? 0), 0),
      '—',
      '—',
      chileDep.reduce((s, e) => s + e.netTotal, 0)
    ])

    for (const col of [4, 5, 6, 7, 8, 9, 10, 13]) {
      const cell = subtotal.getCell(col)

      if (typeof cell.value === 'number') applyCurrencyFormat(cell, 'CLP')
    }

    subtotal.getCell(2).note = 'Suma SOLO descuentos previsionales (AFP/Salud/Cesantía/IUSC/APV) de colaboradores chile_dependent. Reconciliable contra Previred.'
    applySubtotalRowStyle(subtotal)
  }

  // ── Section 2 · Honorarios ──
  if (honorarios.length > 0) {
    const sectionRow = sheet.addRow([
      `▼ Sección 2 · Honorarios (${honorarios.length} colaboradores)`
    ])

    sheet.mergeCells(sectionRow.number, 1, sectionRow.number, headers.length)
    applySectionRowStyle(sectionRow)

    for (const entry of honorarios) {
      const row = sheet.addRow([
        runningIndex++,
        entry.memberName,
        RECEIPT_REGIME_BADGES.honorarios.code,
        entry.grossTotal,
        '—', // Gratif. not applicable
        '—', // AFP
        '—', // Salud
        '—', // Cesantía
        '—', // IUSC
        '—', // APV
        entry.siiRetentionRate ?? null,
        entry.siiRetentionAmount ?? 0,
        entry.netTotal
      ])

      for (const col of [4, 12, 13]) {
        const cell = row.getCell(col)

        if (typeof cell.value === 'number') applyCurrencyFormat(cell, 'CLP')
      }

      // Tasa SII as percentage.
      const tasaCell = row.getCell(11)

      if (typeof tasaCell.value === 'number') applyPercentFormat(tasaCell)

      // Dim previsional columns (cols 5..10) for honorarios rows.
      for (const col of [5, 6, 7, 8, 9, 10]) {
        row.getCell(col).font = { color: { argb: 'FF999999' } }
        row.getCell(col).alignment = { horizontal: 'right' }
      }
    }

    const subtotal = sheet.addRow([
      '',
      'Total retención SII honorarios',
      '',
      honorarios.reduce((s, e) => s + e.grossTotal, 0),
      '—',
      '—',
      '—',
      '—',
      '—',
      '—',
      '—',
      honorarios.reduce((s, e) => s + (e.siiRetentionAmount ?? 0), 0),
      honorarios.reduce((s, e) => s + e.netTotal, 0)
    ])

    for (const col of [4, 12, 13]) {
      const cell = subtotal.getCell(col)

      if (typeof cell.value === 'number') applyCurrencyFormat(cell, 'CLP')
    }

    subtotal.getCell(2).note = 'Suma SOLO retención SII de boletas honorarios (Art. 74 N°2 LIR). Reconciliable contra F29 retenciones honorarios. NO mezclar con descuentos previsionales.'
    applySubtotalRowStyle(subtotal)
  }

  return sheet
}

const buildInternationalSheet = (
  workbook: ExcelJS.Workbook,
  groups: Record<ReceiptRegime, PayrollEntry[]>
) => {
  const deel = groups.international_deel
  const intlInternal = groups.international_internal

  if (deel.length === 0 && intlInternal.length === 0) return null

  const sheet = workbook.addWorksheet('Internacional')

  // 6 columns canónicas + Contrato Deel / Jurisdicción contextual.
  const headers = ['#', 'Nombre', 'Régimen', 'Moneda', 'Bruto', 'Neto', 'Contrato Deel / Jurisdicción']

  sheet.columns = headers.map((header, i) => ({
    header,
    key: `col_${i}`,
    width: i === 0 ? 5 : i === 1 ? 28 : i === 6 ? 28 : 14
  }))

  applyHeaderStyle(sheet.getRow(1))

  let runningIndex = 1

  // ── Section 1 · Internacional Deel ──
  if (deel.length > 0) {
    const sectionRow = sheet.addRow([
      `▼ Sección 1 · Internacional Deel (${deel.length} colaboradores)`
    ])

    sheet.mergeCells(sectionRow.number, 1, sectionRow.number, headers.length)
    applySectionRowStyle(sectionRow)

    for (const entry of deel) {
      const row = sheet.addRow([
        runningIndex++,
        entry.memberName,
        RECEIPT_REGIME_BADGES.international_deel.code,
        entry.currency,
        entry.grossTotal,
        entry.netTotal,
        entry.deelContractId ?? ''
      ])

      for (const col of [5, 6]) {
        const cell = row.getCell(col)

        if (typeof cell.value === 'number') applyCurrencyFormat(cell, entry.currency)
      }
    }

    const subtotal = sheet.addRow([
      '',
      'Total Internacional Deel',
      '',
      'USD',
      deel.reduce((s, e) => s + e.grossTotal, 0),
      deel.reduce((s, e) => s + e.netTotal, 0),
      ''
    ])

    for (const col of [5, 6]) {
      const cell = subtotal.getCell(col)

      if (typeof cell.value === 'number') applyCurrencyFormat(cell, 'USD')
    }

    applySubtotalRowStyle(subtotal)
  }

  // ── Section 2 · Internacional interno ──
  if (intlInternal.length > 0) {
    const sectionRow = sheet.addRow([
      `▼ Sección 2 · Internacional interno (${intlInternal.length} colaboradores)`
    ])

    sheet.mergeCells(sectionRow.number, 1, sectionRow.number, headers.length)
    applySectionRowStyle(sectionRow)

    for (const entry of intlInternal) {
      const row = sheet.addRow([
        runningIndex++,
        entry.memberName,
        RECEIPT_REGIME_BADGES.international_internal.code,
        entry.currency,
        entry.grossTotal,
        entry.netTotal,
        '' // jurisdicción persistida queda como follow-up
      ])

      for (const col of [5, 6]) {
        const cell = row.getCell(col)

        if (typeof cell.value === 'number') applyCurrencyFormat(cell, entry.currency)
      }
    }

    const subtotal = sheet.addRow([
      '',
      'Total Internacional interno',
      '',
      'USD',
      intlInternal.reduce((s, e) => s + e.grossTotal, 0),
      intlInternal.reduce((s, e) => s + e.netTotal, 0),
      ''
    ])

    for (const col of [5, 6]) {
      const cell = subtotal.getCell(col)

      if (typeof cell.value === 'number') applyCurrencyFormat(cell, 'USD')
    }

    applySubtotalRowStyle(subtotal)
  }

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

  // TASK-745d — load adjustments del periodo y agruparlos por entry para que
  // buildDetalleSheet los pueda renderizar sin N hits a DB.
  const allAdjustments = await getActiveAdjustmentsForPeriod(periodId)
  const adjustmentsByEntry = new Map<string, PayrollAdjustment[]>()

  for (const adj of allAdjustments) {
    const list = adjustmentsByEntry.get(adj.payrollEntryId) ?? []

    list.push(adj)
    adjustmentsByEntry.set(adj.payrollEntryId, list)
  }

  const breakdownsByEntry = new Map<string, EntryAdjustmentBreakdown>()

  for (const [entryId, adjs] of adjustmentsByEntry) {
    breakdownsByEntry.set(entryId, getEntryAdjustmentBreakdown(adjs))
  }

  const workbook = new ExcelJS.Workbook()

  workbook.creator = 'Greenhouse EO'
  workbook.created = new Date()

  // TASK-782 — group entries by canonical regime for the new sheets.
  const groups = groupEntriesByRegime(entries)

  buildResumenSheet(workbook, period, entries)
  buildChileSheet(workbook, groups)
  buildInternationalSheet(workbook, groups)
  buildDetalleSheet(workbook, entries, breakdownsByEntry)
  buildAsistenciaSheet(workbook, entries)

  const buffer = await workbook.xlsx.writeBuffer()

  return Buffer.from(buffer)
}
