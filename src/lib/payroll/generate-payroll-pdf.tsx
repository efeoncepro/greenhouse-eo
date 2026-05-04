import 'server-only'

import path from 'path'

import { Document, Image, Page, StyleSheet, Text, View, renderToStream } from '@react-pdf/renderer'

import type { PayrollEntry, PayrollPeriod } from '@/types/payroll'

import { getPayrollEntries, getPayrollEntryById } from '@/lib/payroll/get-payroll-entries'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { PayrollValidationError } from '@/lib/payroll/shared'
import { getOperatingEntityIdentity, type OperatingEntityIdentity } from '@/lib/account-360/organization-identity'
import { getAdjustmentsByEntry } from '@/lib/payroll/adjustments/apply-adjustment'
import {
  getEntryAdjustmentBreakdown,
  type EntryAdjustmentBreakdown
} from '@/lib/payroll/adjustments/breakdown'
import {
  buildReceiptPresentation,
  type ReceiptInfoBlock,
  type ReceiptInfoBlockVariant,
  type ReceiptPresenterEntry
} from '@/lib/payroll/receipt-presenter'

const LOGO_PATH = path.join(process.cwd(), 'public/branding/logo-full.png')

/**
 * Bump this constant whenever the receipt/report PDF template changes
 * (branding, layout, fields, colors). Stale cached PDFs with a different
 * version are lazily regenerated on next access.
 *
 * v4 (2026-05-04, TASK-758): canonical 4-regime presenter consumed via
 * `buildReceiptPresentation` (chile_dependent / honorarios / international_deel
 * / international_internal). Adds `Tipo de contrato` field, contextual employee
 * field per regime, gratificación legal, salud split obl/vol, infoBlocks
 * (Boleta SII / Pago Deel / Régimen internacional), excluded terminal state
 * with degraded hero, "Monto bruto registrado" hero variant for Deel, and
 * removes filas-fantasma in honorarios/Deel.
 */
export const RECEIPT_TEMPLATE_VERSION = '4'

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

  // ── Degraded hero (excluded terminal state) ──
  netHeroDegraded: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    backgroundColor: TEXT_FAINT,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    opacity: 0.85
  },

  // ── Info blocks (info / warning / error) ──
  infoBlock: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#0375DB',
    backgroundColor: '#EAF4FB',
    borderRadius: 2
  },
  infoBlockWarning: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#d99c1f',
    backgroundColor: '#FFF8E6',
    borderRadius: 2
  },
  infoBlockError: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#c0392b',
    backgroundColor: '#FFF0F0',
    borderRadius: 2
  },
  infoBlockTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: TEXT_PRIMARY,
    marginBottom: 3
  },
  infoBlockBody: {
    fontSize: 9,
    color: TEXT_MUTED,
    lineHeight: 1.45
  },
  infoBlockMeta: {
    fontSize: 8,
    color: TEXT_FAINT,
    marginTop: 4,
    letterSpacing: 0.4
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

const toReceiptPresenterEntry = (entry: PayrollEntry, period: PayrollPeriod): ReceiptPresenterEntry => {
  const periodDate = `${period.year}-${String(period.month).padStart(2, '0')}-01`

  const aux = entry as PayrollEntry & {
    chileColacion?: number | null
    chileMovilizacion?: number | null
  }

  const colacion =
    entry.chileColacionAmount ?? aux.chileColacion ?? entry.colacionAmount ?? null

  const movilizacion =
    entry.chileMovilizacionAmount ?? aux.chileMovilizacion ?? entry.movilizacionAmount ?? null

  return {
    payRegime: entry.payRegime,
    contractTypeSnapshot: entry.contractTypeSnapshot ?? null,
    payrollVia: entry.payrollVia ?? null,
    currency: entry.currency,
    memberName: entry.memberName,
    memberEmail: entry.memberEmail,
    deelContractId: entry.deelContractId ?? null,
    baseSalary: entry.baseSalary,
    adjustedBaseSalary: entry.adjustedBaseSalary,
    remoteAllowance: entry.remoteAllowance,
    adjustedRemoteAllowance: entry.adjustedRemoteAllowance,
    fixedBonusLabel: entry.fixedBonusLabel,
    fixedBonusAmount: entry.fixedBonusAmount,
    adjustedFixedBonusAmount: entry.adjustedFixedBonusAmount,
    bonusOtdAmount: entry.bonusOtdAmount,
    bonusRpaAmount: entry.bonusRpaAmount,
    bonusOtherAmount: entry.bonusOtherAmount,
    bonusOtherDescription: entry.bonusOtherDescription,
    chileColacionAmount: colacion,
    chileMovilizacionAmount: movilizacion,
    chileGratificacionLegalAmount: entry.chileGratificacionLegalAmount,
    grossTotal: entry.grossTotal,
    netTotal: entry.netTotal,
    kpiOtdPercent: entry.kpiOtdPercent,
    kpiRpaAvg: entry.kpiRpaAvg,
    bonusOtdProrationFactor: entry.bonusOtdProrationFactor,
    bonusRpaProrationFactor: entry.bonusRpaProrationFactor,
    workingDaysInPeriod: entry.workingDaysInPeriod,
    daysPresent: entry.daysPresent,
    daysAbsent: entry.daysAbsent,
    daysOnLeave: entry.daysOnLeave,
    daysOnUnpaidLeave: entry.daysOnUnpaidLeave,
    chileAfpName: entry.chileAfpName,
    chileAfpRate: entry.chileAfpRate,
    chileAfpAmount: entry.chileAfpAmount,
    chileAfpCotizacionAmount: entry.chileAfpCotizacionAmount,
    chileAfpComisionAmount: entry.chileAfpComisionAmount,
    chileHealthSystem: entry.chileHealthSystem,
    chileHealthAmount: entry.chileHealthAmount,
    chileHealthObligatoriaAmount: entry.chileHealthObligatoriaAmount,
    chileHealthVoluntariaAmount: entry.chileHealthVoluntariaAmount,
    chileUnemploymentRate: entry.chileUnemploymentRate,
    chileUnemploymentAmount: entry.chileUnemploymentAmount,
    chileTaxAmount: entry.chileTaxAmount,
    chileApvAmount: entry.chileApvAmount,
    chileTotalDeductions: entry.chileTotalDeductions,
    siiRetentionRate: entry.siiRetentionRate ?? null,
    siiRetentionAmount: entry.siiRetentionAmount ?? null,
    manualOverride: entry.manualOverride,
    manualOverrideNote: entry.manualOverrideNote,
    periodDate
  }
}

const InfoBlockPdf = ({ block }: { block: ReceiptInfoBlock }) => {
  const variantStyle: Record<ReceiptInfoBlockVariant, ReturnType<typeof StyleSheet.create>[string]> = {
    info: s.infoBlock,
    warning: s.infoBlockWarning,
    error: s.infoBlockError
  }

  return (
    <View style={variantStyle[block.variant]}>
      <Text style={s.infoBlockTitle}>{block.title}</Text>
      <Text style={s.infoBlockBody}>{block.body}</Text>
      {block.meta && <Text style={s.infoBlockMeta}>{block.meta}</Text>}
    </View>
  )
}

const ReceiptDocument = ({
  entry,
  period,
  operatingEntity,
  breakdown
}: {
  entry: PayrollEntry
  period: PayrollPeriod
  operatingEntity: OperatingEntityIdentity | null
  breakdown: EntryAdjustmentBreakdown
}) => {
  const monthName = MONTH_NAMES[period.month - 1] ?? String(period.month)
  const generatedAt = new Date().toISOString().split('T')[0]
  const presentation = buildReceiptPresentation(toReceiptPresenterEntry(entry, period), breakdown)

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* Header */}
        <PdfHeader
          operatingEntity={operatingEntity}
          monthName={monthName}
          year={period.year}
          docType="Recibo de remuneraciones"
          periodId={period.periodId}
        />

        <Text style={s.docTitle}>RECIBO DE REMUNERACIONES</Text>

        {/* Employee box — 4 fields canonical, contextual field 4 per regime */}
        <View style={s.employeeBox}>
          {presentation.employeeFields.map((field, i) => (
            <View key={`employee-${i}`} style={s.employeeField}>
              <Text style={s.employeeLabel}>{field.label}</Text>
              <Text style={s.employeeValue}>{field.value}</Text>
              {field.meta && (
                <Text style={{ fontSize: 7, color: TEXT_MUTED, marginTop: 1 }}>{field.meta}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Excluded short-circuit — minimal layout per mockup */}
        {presentation.isExcluded && presentation.infoBlock && (
          <InfoBlockPdf block={presentation.infoBlock} />
        )}

        {/* Haberes */}
        {!presentation.isExcluded && (
          <>
            <SectionHeader title="Haberes" />
            {presentation.haberesRows.map((row, i) => (
              <View key={row.key} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                <Text style={[s.tableLabel, row.variant === 'indent' ? { paddingLeft: 14, color: TEXT_MUTED } : {}]}>
                  {row.label}
                </Text>
                <Text style={s.tableValue}>{row.amount}</Text>
              </View>
            ))}
            <View style={s.tableTotalRow}>
              <Text style={s.tableTotalLabel}>Total bruto</Text>
              <Text style={s.tableTotalValue}>{presentation.grossTotal}</Text>
            </View>
          </>
        )}

        {/* Adjustments banner — bruto efectivo aplicado */}
        {presentation.adjustmentsBanner && <InfoBlockPdf block={presentation.adjustmentsBanner} />}

        {/* Attendance — chile_dependent only */}
        {!presentation.isExcluded && presentation.attendanceRows.length > 0 && (
          <>
            <SectionHeader title="Asistencia" />
            {presentation.attendanceRows.map((row, i) => (
              <View key={row.key} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                <Text style={s.tableLabel}>{row.label}</Text>
                <Text style={s.tableValue}>{row.amount}</Text>
              </View>
            ))}
          </>
        )}

        {/* Deduction section — Descuentos legales / Retención honorarios */}
        {!presentation.isExcluded && presentation.deductionSection && (
          <>
            <SectionHeader title={presentation.deductionSection.title} />
            {presentation.deductionSection.rows.map((row, i) => (
              <View key={row.key} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                <Text style={[s.tableLabel, row.variant === 'indent' ? { paddingLeft: 14, color: TEXT_MUTED } : {}]}>
                  {row.label}
                </Text>
                <Text style={s.tableValue}>{row.amount}</Text>
              </View>
            ))}
            <View style={s.tableTotalRow}>
              <Text style={s.tableTotalLabel}>{presentation.deductionSection.totalLabel}</Text>
              <Text style={s.tableTotalValue}>{presentation.deductionSection.totalAmount}</Text>
            </View>
          </>
        )}

        {/* Info block — Boleta SII / Pago Deel / Régimen internacional */}
        {!presentation.isExcluded && presentation.infoBlock && (
          <InfoBlockPdf block={presentation.infoBlock} />
        )}

        {/* Fixed deductions */}
        {presentation.fixedDeductionsSection && (
          <>
            <SectionHeader title={presentation.fixedDeductionsSection.title} />
            {presentation.fixedDeductionsSection.rows.map((row, i) => (
              <View key={row.key} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                <Text style={s.tableLabel}>{row.label}</Text>
                <Text style={s.tableValue}>{row.amount}</Text>
              </View>
            ))}
            <View style={s.tableTotalRow}>
              <Text style={s.tableTotalLabel}>{presentation.fixedDeductionsSection.totalLabel}</Text>
              <Text style={s.tableTotalValue}>{presentation.fixedDeductionsSection.totalAmount}</Text>
            </View>
          </>
        )}

        {/* Manual override block */}
        {presentation.manualOverrideBlock && <InfoBlockPdf block={presentation.manualOverrideBlock} />}

        {/* Hero — primary or degraded */}
        <View style={presentation.hero.variant === 'degraded' ? s.netHeroDegraded : s.netHero}>
          <Text style={s.netHeroLabel}>{presentation.hero.label}</Text>
          <Text style={s.netHeroValue}>{presentation.hero.amount}</Text>
        </View>

        {presentation.hero.footnote && (
          <Text style={{ fontSize: 7, color: TEXT_MUTED, fontStyle: 'italic', marginTop: 4 }}>
            {presentation.hero.footnote}
          </Text>
        )}

        <PdfFooter
          operatingEntity={operatingEntity}
          monthName={monthName}
          year={period.year}
          generatedAt={generatedAt}
        />
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
  const adjustments = await getAdjustmentsByEntry(entryId, { activeOnly: true })
  const breakdown = getEntryAdjustmentBreakdown(adjustments)

  const stream = await renderToStream(
    <ReceiptDocument entry={entry} period={period} operatingEntity={operatingEntity} breakdown={breakdown} />
  )

  const chunks: Uint8Array[] = []

  for await (const chunk of stream) {
    chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk))
  }

  return Buffer.concat(chunks)
}
