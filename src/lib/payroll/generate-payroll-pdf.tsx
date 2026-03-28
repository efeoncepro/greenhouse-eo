import 'server-only'

import path from 'path'

import { Document, Image, Page, StyleSheet, Text, View, renderToStream } from '@react-pdf/renderer'

import type { PayrollEntry, PayrollPeriod } from '@/types/payroll'

import { getPayrollEntries, getPayrollEntryById } from '@/lib/payroll/get-payroll-entries'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { PayrollValidationError } from '@/lib/payroll/shared'
import { getOperatingEntityIdentity, type OperatingEntityIdentity } from '@/lib/account-360/organization-identity'

const LOGO_PATH = path.join(process.cwd(), 'public/branding/logo-full.png')

/**
 * Bump this constant whenever the receipt/report PDF template changes
 * (branding, layout, fields, colors). Stale cached PDFs with a different
 * version are lazily regenerated on next access.
 */
export const RECEIPT_TEMPLATE_VERSION = '3'

const BRAND_BLUE = '#023c70'
const BRAND_LIGHT = '#F7F9FC'
const BRAND_ACCENT_BG = '#E8EFF7'
const TEXT_PRIMARY = '#1a1a1a'
const TEXT_MUTED = '#666666'
const TEXT_FAINT = '#999999'
const BORDER_LIGHT = '#e0e0e0'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const fmtCurrency = (value: number | null, currency: string): string => {
  if (value === null) return '—'

  return currency === 'CLP'
    ? `$${Math.round(value).toLocaleString('es-CL')}`
    : `US$${value.toFixed(2)}`
}

const fmtPercent = (value: number | null): string => {
  if (value === null) return '—'

  return `${value.toFixed(1)}%`
}

const fmtFactor = (value: number | null): string => {
  if (value === null) return '—'

  return `${(value * 100).toFixed(1)}%`
}

// ─── Styles ──────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    color: TEXT_PRIMARY
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6
  },
  headerRight: {
    textAlign: 'right' as const,
    alignItems: 'flex-end' as const
  },
  companyBlock: {
    borderLeftWidth: 3,
    borderLeftColor: BRAND_BLUE,
    paddingLeft: 8,
    marginTop: 6
  },
  companyText: {
    fontSize: 8,
    color: TEXT_MUTED,
    marginBottom: 1
  },
  headerAccent: {
    borderBottomWidth: 2,
    borderBottomColor: BRAND_BLUE,
    marginBottom: 16
  },
  periodLabel: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: TEXT_PRIMARY
  },
  periodSub: {
    fontSize: 8,
    color: TEXT_MUTED,
    marginTop: 2
  },

  // ── Document title ──
  docTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: BRAND_BLUE,
    letterSpacing: 2,
    textAlign: 'center' as const,
    marginBottom: 16
  },

  // ── Employee info box ──
  employeeBox: {
    backgroundColor: BRAND_LIGHT,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const
  },
  employeeField: {
    width: '50%',
    marginBottom: 6
  },
  employeeLabel: {
    fontSize: 7,
    color: TEXT_MUTED,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 1
  },
  employeeValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold'
  },

  // ── Section headers ──
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginTop: 14,
    marginBottom: 6
  },
  sectionAccent: {
    width: 3,
    height: 12,
    backgroundColor: BRAND_BLUE,
    marginRight: 6
  },
  sectionTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: BRAND_BLUE,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const
  },

  // ── Table rows ──
  tableRow: {
    flexDirection: 'row' as const,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER_LIGHT
  },
  tableRowAlt: {
    backgroundColor: BRAND_LIGHT
  },
  tableLabel: {
    width: '60%',
    fontSize: 9
  },
  tableValue: {
    width: '40%',
    fontSize: 9,
    textAlign: 'right' as const,
    fontFamily: 'Helvetica'
  },
  tableTotalRow: {
    flexDirection: 'row' as const,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 1.5,
    borderTopColor: BRAND_BLUE,
    backgroundColor: BRAND_ACCENT_BG
  },
  tableTotalLabel: {
    width: '60%',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold'
  },
  tableTotalValue: {
    width: '40%',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right' as const
  },

  // ── Net total hero ──
  netHero: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    backgroundColor: BRAND_BLUE,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16
  },
  netHeroLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff'
  },
  netHeroValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff'
  },

  // ── Footer ──
  footer: {
    position: 'absolute' as const,
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderTopColor: BORDER_LIGHT,
    paddingTop: 6,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const
  },
  footerText: {
    fontSize: 7,
    color: TEXT_FAINT
  },
  footerCenter: {
    fontSize: 7,
    color: TEXT_FAINT,
    textAlign: 'center' as const
  },

  // ── Period report table ──
  reportTableHeader: {
    flexDirection: 'row' as const,
    backgroundColor: BRAND_BLUE,
    paddingVertical: 5,
    paddingHorizontal: 4
  },
  reportTableHeaderCell: {
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7
  },
  reportTableRow: {
    flexDirection: 'row' as const,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER_LIGHT
  },
  reportTableRowAlt: {
    backgroundColor: BRAND_LIGHT
  },
  reportTableCell: {
    fontSize: 7
  },
  reportTableCellRight: {
    fontSize: 7,
    textAlign: 'right' as const
  },
  reportTotalsRow: {
    flexDirection: 'row' as const,
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: BRAND_ACCENT_BG,
    borderTopWidth: 1.5,
    borderTopColor: BRAND_BLUE
  },
  reportTotalsCell: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right' as const
  }
})

// ─── Shared components ──────────────────────────────────────────────

const SectionHeader = ({ title }: { title: string }) => (
  <View style={s.sectionHeader}>
    <View style={s.sectionAccent} />
    <Text style={s.sectionTitle}>{title}</Text>
  </View>
)

const PdfHeader = ({ operatingEntity, monthName, year, docType, periodId }: {
  operatingEntity: OperatingEntityIdentity | null
  monthName: string
  year: number
  docType: string
  periodId: string
}) => (
  <>
    <View style={s.header}>
      <View>
        <Image src={LOGO_PATH} style={{ width: 120, height: 28 }} />
        <View style={s.companyBlock}>
          <Text style={s.companyText}>{operatingEntity?.legalName ?? 'Efeonce Group SpA'}</Text>
          {operatingEntity?.taxId && <Text style={s.companyText}>{`RUT ${operatingEntity.taxId}`}</Text>}
          {operatingEntity?.legalAddress && <Text style={s.companyText}>{operatingEntity.legalAddress}</Text>}
        </View>
      </View>
      <View style={s.headerRight}>
        <Text style={s.periodLabel}>{`${monthName} ${year}`}</Text>
        <Text style={s.periodSub}>{docType}</Text>
        <Text style={s.periodSub}>{periodId}</Text>
      </View>
    </View>
    <View style={s.headerAccent} />
  </>
)

const PdfFooter = ({ operatingEntity, monthName, year, generatedAt }: {
  operatingEntity: OperatingEntityIdentity | null
  monthName: string
  year: number
  generatedAt: string
}) => (
  <View style={s.footer}>
    <Text style={s.footerText}>{`${operatingEntity?.legalName ?? 'Efeonce Group SpA'} — ${monthName} ${year}`}</Text>
    <Text style={s.footerCenter}>efeoncepro.com</Text>
    <Text style={s.footerText}>{`Generado: ${generatedAt}`}</Text>
  </View>
)

// ─── Period Report PDF ────────────────────────────────────────────

const COL_WIDTHS = {
  name: '20%',
  regime: '8%',
  currency: '6%',
  base: '10%',
  bonus: '9%',
  gross: '10%',
  deductions: '10%',
  net: '10%'
}

const PeriodReportDocument = ({ period, entries, operatingEntity }: { period: PayrollPeriod; entries: PayrollEntry[]; operatingEntity: OperatingEntityIdentity | null }) => {
  const monthName = MONTH_NAMES[period.month - 1] ?? String(period.month)
  const generatedAt = new Date().toISOString().split('T')[0]

  const chileEntries = entries.filter(e => e.payRegime === 'chile')
  const intlEntries = entries.filter(e => e.payRegime === 'international')

  const totalGrossClp = chileEntries.reduce((sum, e) => sum + e.grossTotal, 0)
  const totalNetClp = chileEntries.reduce((sum, e) => sum + e.netTotal, 0)
  const totalDeductionsClp = chileEntries.reduce((sum, e) => sum + (e.chileTotalDeductions ?? 0), 0)
  const totalGrossUsd = intlEntries.reduce((sum, e) => sum + e.grossTotal, 0)
  const totalNetUsd = intlEntries.reduce((sum, e) => sum + e.netTotal, 0)

  // Build summary KPI items
  const summaryItems: Array<{ label: string; value: string }> = [
    { label: 'COLABORADORES', value: String(entries.length) },
    { label: 'ESTADO', value: period.status === 'exported' ? 'Exportado' : period.status === 'approved' ? 'Aprobado' : period.status }
  ]

  if (chileEntries.length > 0) {
    summaryItems.push({ label: 'BRUTO CLP', value: fmtCurrency(totalGrossClp, 'CLP') })
    summaryItems.push({ label: 'NETO CLP', value: fmtCurrency(totalNetClp, 'CLP') })
  }

  if (intlEntries.length > 0) {
    summaryItems.push({ label: 'BRUTO USD', value: fmtCurrency(totalGrossUsd, 'USD') })
    summaryItems.push({ label: 'NETO USD', value: fmtCurrency(totalNetUsd, 'USD') })
  }

  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={s.page}>
        <PdfHeader operatingEntity={operatingEntity} monthName={monthName} year={period.year} docType="Reporte de nómina" periodId={period.periodId} />

        {/* Document title */}
        <Text style={s.docTitle}>REPORTE DE NÓMINA</Text>

        {/* Summary strip */}
        <View style={{ backgroundColor: BRAND_LIGHT, flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, marginBottom: 14 }}>
          {summaryItems.map((item, i) => (
            <View key={i} style={{ flex: 1, paddingHorizontal: 6, borderRightWidth: i < summaryItems.length - 1 ? 0.5 : 0, borderRightColor: BORDER_LIGHT }}>
              <Text style={{ fontSize: 6, fontFamily: 'Helvetica', color: TEXT_MUTED, letterSpacing: 1, marginBottom: 2 }}>{item.label}</Text>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: TEXT_PRIMARY }}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Meta — compact row for UF and approval date */}
        {(period.ufValue != null || period.approvedAt) && (
          <View style={{ flexDirection: 'row', marginBottom: 10, gap: 16 }}>
            {period.ufValue != null && (
              <Text style={{ fontSize: 8, color: TEXT_MUTED }}>
                {`UF: $${period.ufValue.toLocaleString('es-CL')}`}
              </Text>
            )}
            {period.approvedAt && (
              <Text style={{ fontSize: 8, color: TEXT_MUTED }}>
                {`Aprobado: ${period.approvedAt}`}
              </Text>
            )}
          </View>
        )}

        {/* Table */}
        <SectionHeader title={`Detalle — ${entries.length} miembros`} />

        <View style={s.reportTableHeader}>
          <Text style={{ ...s.reportTableHeaderCell, width: COL_WIDTHS.name }}>Nombre</Text>
          <Text style={{ ...s.reportTableHeaderCell, width: COL_WIDTHS.regime }}>Régimen</Text>
          <Text style={{ ...s.reportTableHeaderCell, width: COL_WIDTHS.currency }}>Mon.</Text>
          <Text style={{ ...s.reportTableHeaderCell, width: COL_WIDTHS.base, textAlign: 'right' as const }}>Base</Text>
          <Text style={{ ...s.reportTableHeaderCell, width: COL_WIDTHS.bonus, textAlign: 'right' as const }}>Bono OTD</Text>
          <Text style={{ ...s.reportTableHeaderCell, width: COL_WIDTHS.bonus, textAlign: 'right' as const }}>Bono RpA</Text>
          <Text style={{ ...s.reportTableHeaderCell, width: COL_WIDTHS.gross, textAlign: 'right' as const }}>Bruto</Text>
          <Text style={{ ...s.reportTableHeaderCell, width: COL_WIDTHS.deductions, textAlign: 'right' as const }}>Descuentos</Text>
          <Text style={{ ...s.reportTableHeaderCell, width: COL_WIDTHS.net, textAlign: 'right' as const }}>Neto</Text>
        </View>

        {entries.map((entry, i) => (
          <View key={entry.entryId} style={[s.reportTableRow, i % 2 === 1 ? s.reportTableRowAlt : {}]}>
            <Text style={{ ...s.reportTableCell, width: COL_WIDTHS.name }}>{entry.memberName}</Text>
            <Text style={{ ...s.reportTableCell, width: COL_WIDTHS.regime }}>{entry.payRegime === 'chile' ? 'CL' : 'INT'}</Text>
            <Text style={{ ...s.reportTableCell, width: COL_WIDTHS.currency }}>{entry.currency}</Text>
            <Text style={{ ...s.reportTableCellRight, width: COL_WIDTHS.base }}>{fmtCurrency(entry.adjustedBaseSalary ?? entry.baseSalary, entry.currency)}</Text>
            <Text style={{ ...s.reportTableCellRight, width: COL_WIDTHS.bonus }}>{fmtCurrency(entry.bonusOtdAmount, entry.currency)}</Text>
            <Text style={{ ...s.reportTableCellRight, width: COL_WIDTHS.bonus }}>{fmtCurrency(entry.bonusRpaAmount, entry.currency)}</Text>
            <Text style={{ ...s.reportTableCellRight, width: COL_WIDTHS.gross }}>{fmtCurrency(entry.grossTotal, entry.currency)}</Text>
            <Text style={{ ...s.reportTableCellRight, width: COL_WIDTHS.deductions }}>{fmtCurrency(entry.chileTotalDeductions, entry.currency)}</Text>
            <Text style={{ ...s.reportTableCellRight, width: COL_WIDTHS.net }}>{fmtCurrency(entry.netTotal, entry.currency)}</Text>
          </View>
        ))}

        {chileEntries.length > 0 && (
          <View style={s.reportTotalsRow}>
            <Text style={{ ...s.reportTotalsCell, width: COL_WIDTHS.name, textAlign: 'left' as const }}>Total Chile</Text>
            <Text style={{ ...s.reportTotalsCell, width: COL_WIDTHS.regime }}>{' '}</Text>
            <Text style={{ ...s.reportTotalsCell, width: COL_WIDTHS.currency }}>CLP</Text>
            <Text style={{ ...s.reportTotalsCell, width: COL_WIDTHS.base }}>{' '}</Text>
            <Text style={{ ...s.reportTotalsCell, width: COL_WIDTHS.bonus }}>{' '}</Text>
            <Text style={{ ...s.reportTotalsCell, width: COL_WIDTHS.bonus }}>{' '}</Text>
            <Text style={{ ...s.reportTotalsCell, width: COL_WIDTHS.gross }}>{fmtCurrency(totalGrossClp, 'CLP')}</Text>
            <Text style={{ ...s.reportTotalsCell, width: COL_WIDTHS.deductions }}>{fmtCurrency(totalDeductionsClp, 'CLP')}</Text>
            <Text style={{ ...s.reportTotalsCell, width: COL_WIDTHS.net }}>{fmtCurrency(totalNetClp, 'CLP')}</Text>
          </View>
        )}

        {intlEntries.length > 0 && (
          <View style={s.reportTotalsRow}>
            <Text style={{ ...s.reportTotalsCell, width: COL_WIDTHS.name, textAlign: 'left' as const }}>Total Internacional</Text>
            <Text style={{ ...s.reportTotalsCell, width: COL_WIDTHS.regime }}>{' '}</Text>
            <Text style={{ ...s.reportTotalsCell, width: COL_WIDTHS.currency }}>USD</Text>
            <Text style={{ ...s.reportTotalsCell, width: COL_WIDTHS.base }}>{' '}</Text>
            <Text style={{ ...s.reportTotalsCell, width: COL_WIDTHS.bonus }}>{' '}</Text>
            <Text style={{ ...s.reportTotalsCell, width: COL_WIDTHS.bonus }}>{' '}</Text>
            <Text style={{ ...s.reportTotalsCell, width: COL_WIDTHS.gross }}>{fmtCurrency(totalGrossUsd, 'USD')}</Text>
            <Text style={{ ...s.reportTotalsCell, width: COL_WIDTHS.deductions }}>{' '}</Text>
            <Text style={{ ...s.reportTotalsCell, width: COL_WIDTHS.net }}>{fmtCurrency(totalNetUsd, 'USD')}</Text>
          </View>
        )}

        <PdfFooter operatingEntity={operatingEntity} monthName={monthName} year={period.year} generatedAt={generatedAt} />
      </Page>
    </Document>
  )
}

// ─── Individual Receipt PDF ───────────────────────────────────────

const ReceiptDocument = ({ entry, period, operatingEntity }: { entry: PayrollEntry; period: PayrollPeriod; operatingEntity: OperatingEntityIdentity | null }) => {
  const monthName = MONTH_NAMES[period.month - 1] ?? String(period.month)
  const currency = entry.currency
  const isChile = entry.payRegime === 'chile'
  const generatedAt = new Date().toISOString().split('T')[0]

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

  const hasAttendanceAdjustment = entry.adjustedBaseSalary != null && entry.adjustedBaseSalary !== entry.baseSalary
  const effectiveFixedBonusAmount = entry.adjustedFixedBonusAmount ?? entry.fixedBonusAmount

  const haberesRows: [string, string][] = [
    ['Sueldo base', fmtCurrency(entry.baseSalary, currency)]
  ]

  if (hasAttendanceAdjustment) {
    haberesRows.push(
      ['Sueldo base ajustado (por inasistencia)', fmtCurrency(entry.adjustedBaseSalary, currency)]
    )
  }

  haberesRows.push(
    ['Asignación teletrabajo', fmtCurrency(entry.remoteAllowance, currency)]
  )

  if (hasAttendanceAdjustment && entry.adjustedRemoteAllowance != null) {
    haberesRows.push(
      ['Teletrabajo ajustado (por inasistencia)', fmtCurrency(entry.adjustedRemoteAllowance, currency)]
    )
  }

  if (entry.fixedBonusAmount > 0) {
    haberesRows.push([
      entry.fixedBonusLabel ? `Bono fijo (${entry.fixedBonusLabel})` : 'Bono fijo',
      fmtCurrency(entry.fixedBonusAmount, currency)
    ])
  }

  if (entry.adjustedFixedBonusAmount != null && entry.adjustedFixedBonusAmount !== entry.fixedBonusAmount) {
    haberesRows.push([
      entry.fixedBonusLabel
        ? `Bono fijo ajustado (${entry.fixedBonusLabel})`
        : 'Bono fijo ajustado (por inasistencia)',
      fmtCurrency(effectiveFixedBonusAmount, currency)
    ])
  }

  if (colacion > 0) {
    haberesRows.push(['Colación', fmtCurrency(colacion, currency)])
  }

  if (movilizacion > 0) {
    haberesRows.push(['Movilización', fmtCurrency(movilizacion, currency)])
  }

  haberesRows.push(
    [`Bono OTD (${fmtPercent(entry.kpiOtdPercent)} → factor ${fmtFactor(entry.bonusOtdProrationFactor)})`, fmtCurrency(entry.bonusOtdAmount, currency)],
    [`Bono RpA (${entry.kpiRpaAvg != null ? entry.kpiRpaAvg.toFixed(1) : '—'} → factor ${fmtFactor(entry.bonusRpaProrationFactor)})`, fmtCurrency(entry.bonusRpaAmount, currency)]
  )

  if (entry.bonusOtherAmount > 0) {
    haberesRows.push(
      [`Bono adicional${entry.bonusOtherDescription ? ` (${entry.bonusOtherDescription})` : ''}`, fmtCurrency(entry.bonusOtherAmount, currency)]
    )
  }

  const attendanceRows: [string, string][] = entry.workingDaysInPeriod != null ? [
    ['Días hábiles en período', String(entry.workingDaysInPeriod)],
    ['Días presentes', String(entry.daysPresent ?? '—')],
    ['Días ausentes', String(entry.daysAbsent ?? 0)],
    ['Días licencia', String(entry.daysOnLeave ?? 0)],
    ['Días licencia no remunerada', String(entry.daysOnUnpaidLeave ?? 0)]
  ] : []

  const deductionRows: [string, string][] = []

  if (isChile) {
    deductionRows.push([
      `AFP ${entry.chileAfpName ?? ''} (${entry.chileAfpRate != null ? (entry.chileAfpRate * 100).toFixed(2) : '—'}%)`,
      fmtCurrency(entry.chileAfpAmount, currency)
    ])

    if (entry.chileAfpCotizacionAmount != null || entry.chileAfpComisionAmount != null) {
      deductionRows.push(
        ['↳ Cotización', fmtCurrency(entry.chileAfpCotizacionAmount, currency)],
        ['↳ Comisión', fmtCurrency(entry.chileAfpComisionAmount, currency)]
      )
    }

    deductionRows.push(
      [`Salud (${entry.chileHealthSystem ?? '—'})`, fmtCurrency(entry.chileHealthAmount, currency)],
      [`Seguro cesantía (${entry.chileUnemploymentRate != null ? (entry.chileUnemploymentRate * 100).toFixed(1) : '—'}%)`, fmtCurrency(entry.chileUnemploymentAmount, currency)],
      ['Impuesto único', fmtCurrency(entry.chileTaxAmount, currency)]
    )
  }

  if (isChile && entry.chileApvAmount != null && entry.chileApvAmount > 0) {
    deductionRows.push(['APV', fmtCurrency(entry.chileApvAmount, currency)])
  }

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* Header */}
        <PdfHeader operatingEntity={operatingEntity} monthName={monthName} year={period.year} docType="Recibo de remuneraciones" periodId={period.periodId} />

        {/* Document title */}
        <Text style={s.docTitle}>RECIBO DE REMUNERACIONES</Text>

        {/* Employee info — 2-column grid */}
        <View style={s.employeeBox}>
          <View style={s.employeeField}>
            <Text style={s.employeeLabel}>Nombre</Text>
            <Text style={s.employeeValue}>{entry.memberName}</Text>
          </View>
          <View style={s.employeeField}>
            <Text style={s.employeeLabel}>Email</Text>
            <Text style={s.employeeValue}>{entry.memberEmail}</Text>
          </View>
          <View style={s.employeeField}>
            <Text style={s.employeeLabel}>Régimen</Text>
            <Text style={s.employeeValue}>{isChile ? 'Chile' : 'Internacional'}</Text>
          </View>
          <View style={s.employeeField}>
            <Text style={s.employeeLabel}>Moneda</Text>
            <Text style={s.employeeValue}>{currency}</Text>
          </View>
        </View>

        {/* Haberes */}
        <SectionHeader title="Haberes" />
        {haberesRows.map(([label, value], i) => (
          <View key={`h-${i}`} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
            <Text style={s.tableLabel}>{label}</Text>
            <Text style={s.tableValue}>{value}</Text>
          </View>
        ))}
        <View style={s.tableTotalRow}>
          <Text style={s.tableTotalLabel}>Total bruto</Text>
          <Text style={s.tableTotalValue}>{fmtCurrency(entry.grossTotal, currency)}</Text>
        </View>

        {/* Attendance */}
        {attendanceRows.length > 0 && (
          <>
            <SectionHeader title="Asistencia" />
            {attendanceRows.map(([label, value], i) => (
              <View key={`a-${i}`} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                <Text style={s.tableLabel}>{label}</Text>
                <Text style={s.tableValue}>{value}</Text>
              </View>
            ))}
          </>
        )}

        {/* Deductions (Chile only) */}
        {deductionRows.length > 0 && (
          <>
            <SectionHeader title="Descuentos legales" />
            {deductionRows.map(([label, value], i) => (
              <View key={`d-${i}`} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                <Text style={s.tableLabel}>{label}</Text>
                <Text style={s.tableValue}>{value}</Text>
              </View>
            ))}
            <View style={s.tableTotalRow}>
              <Text style={s.tableTotalLabel}>Total descuentos</Text>
              <Text style={s.tableTotalValue}>{fmtCurrency(entry.chileTotalDeductions, currency)}</Text>
            </View>
          </>
        )}

        {/* Net total hero */}
        <View style={s.netHero}>
          <Text style={s.netHeroLabel}>Líquido a pagar</Text>
          <Text style={s.netHeroValue}>{fmtCurrency(entry.netTotal, currency)}</Text>
        </View>
        {entry.manualOverride && (
          <Text style={{ fontSize: 7, color: TEXT_MUTED, fontStyle: 'italic', marginTop: 4 }}>
            {`* Monto neto ajustado manualmente${entry.manualOverrideNote ? `: ${entry.manualOverrideNote}` : ''}`}
          </Text>
        )}

        {/* Footer */}
        <PdfFooter operatingEntity={operatingEntity} monthName={monthName} year={period.year} generatedAt={generatedAt} />
      </Page>
    </Document>
  )
}

// ─── Public API ──────────────────────────────────────────────────

export const generatePayrollPeriodPdf = async (periodId: string): Promise<Buffer> => {
  const period = await getPayrollPeriod(periodId)

  if (!period) {
    throw new PayrollValidationError('Payroll period not found.', 404)
  }

  if (period.status !== 'approved' && period.status !== 'exported') {
    throw new PayrollValidationError('Only approved or exported periods can generate reports.', 409)
  }

  const [entries, operatingEntity] = await Promise.all([
    getPayrollEntries(periodId),
    getOperatingEntityIdentity()
  ])

  const stream = await renderToStream(<PeriodReportDocument period={period} entries={entries} operatingEntity={operatingEntity} />)

  const chunks: Uint8Array[] = []

  for await (const chunk of stream) {
    chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk))
  }

  return Buffer.concat(chunks)
}

export const generatePayrollReceiptPdf = async (entryId: string): Promise<Buffer> => {
  const entry = await getPayrollEntryById(entryId)

  if (!entry) {
    throw new PayrollValidationError('Payroll entry not found.', 404)
  }

  const period = await getPayrollPeriod(entry.periodId)

  if (!period) {
    throw new PayrollValidationError('Payroll period not found.', 404)
  }

  if (period.status !== 'approved' && period.status !== 'exported') {
    throw new PayrollValidationError('Only approved or exported periods can generate receipts.', 409)
  }

  const operatingEntity = await getOperatingEntityIdentity()
  const stream = await renderToStream(<ReceiptDocument entry={entry} period={period} operatingEntity={operatingEntity} />)

  const chunks: Uint8Array[] = []

  for await (const chunk of stream) {
    chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk))
  }

  return Buffer.concat(chunks)
}
